import { useEffect, useRef, useState } from "react";
import type {
  Offer,
  OfferContact,
  OfferLink,
  OfferDetails,
  OfferMedia,
  OfferReview,
} from "../types";
import { STATUSES, statusColor, averageScore, formatScore, scoreColor } from "../config";
import {
  uploadMedia,
  uploadBlob,
  signedUrl,
  deleteMedia,
  mediaAvailable,
  MEDIA_FILE_LIMIT,
} from "../lib/media";
import { compressVideo, splitIfNeeded } from "../lib/video";

interface Props {
  offer: Offer;
  /** Colocataire actif : son avis est éditable, les autres en lecture seule. */
  me: string;
  onClose: () => void;
  onSave: (updated: Offer) => void;
}

const newId = () => crypto.randomUUID();

/** Élément d'affichage : un média seul, ou un groupe (vidéo découpée). */
type DisplayItem = OfferMedia | { group: string; parts: OfferMedia[] };

/** Modale d'édition des notes structurées d'une annonce. */
export function OfferNotesModal({ offer, me, onClose, onSave }: Props) {
  const [visitDate, setVisitDate] = useState(offer.details?.visitDate ?? "");
  const [contacts, setContacts] = useState<OfferContact[]>(offer.details?.contacts ?? []);
  const [links, setLinks] = useState<OfferLink[]>(offer.details?.links ?? []);
  const [notes, setNotes] = useState(offer.notes ?? "");
  // Avis : ceux des autres (lecture seule) + le mien (éditable).
  const allReviews = offer.details?.reviews ?? [];
  const myReview = allReviews.find((r) => r.author === me);
  const [otherReviews] = useState<OfferReview[]>(allReviews.filter((r) => r.author !== me));
  const [myScore, setMyScore] = useState<number | null>(myReview?.score ?? null);
  const [myComment, setMyComment] = useState(myReview?.comment ?? "");
  const [media, setMedia] = useState<OfferMedia[]>(offer.details?.media ?? []);
  // URLs signées résolues pour l'affichage (path -> url temporaire).
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  // Message d'avancement du traitement vidéo (compression/découpe/envoi).
  const [procStatus, setProcStatus] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  // Index de l'élément ouvert en grand dans la visionneuse, sinon null.
  const [lightbox, setLightbox] = useState<number | null>(null);
  // Fichiers téléversés pendant cette session (à nettoyer si on annule).
  const sessionPaths = useRef<Set<string>>(new Set());
  const originalPaths = useRef<string[]>((offer.details?.media ?? []).map((m) => m.path));

  // Résout (et rafraîchit) les URLs signées des médias affichés.
  useEffect(() => {
    let active = true;
    media.forEach((m) => {
      if (mediaUrls[m.path]) return;
      signedUrl(m.path).then((url) => {
        if (active && url) setMediaUrls((prev) => ({ ...prev, [m.path]: url }));
      });
    });
    return () => {
      active = false;
    };
  }, [media, mediaUrls]);

  // Échap ferme la modale (sauf si la visionneuse est ouverte : elle gère
  // alors son propre Échap). Nettoie les médias non enregistrés.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightbox === null) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function patchContact(id: string, patch: Partial<OfferContact>) {
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function patchLink(id: string, patch: Partial<OfferLink>) {
    setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function handlePickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMediaError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("video")) {
          await addVideo(file);
        } else {
          setProcStatus("Envoi…");
          const m = await uploadMedia(offer.id, file);
          sessionPaths.current.add(m.path);
          setMedia((prev) => [...prev, m]);
        }
      }
    } catch (e) {
      setMediaError(
        e instanceof Error && e.message
          ? e.message
          : "Échec du traitement. Vérifie que le bucket « offer-media » existe."
      );
    } finally {
      setUploading(false);
      setProcStatus("");
    }
  }

  // Compresse une vidéo (720p), la découpe si elle dépasse encore la limite,
  // puis téléverse la/les partie(s) (groupées si plusieurs).
  async function addVideo(file: File) {
    setProcStatus("Compression… 0 %");
    const compressed = await compressVideo(file, (p) => setProcStatus(`Compression… ${p} %`));
    setProcStatus("Découpe…");
    const blobs = await splitIfNeeded(compressed, MEDIA_FILE_LIMIT);
    const groupId = blobs.length > 1 ? newId() : undefined;
    for (let i = 0; i < blobs.length; i++) {
      setProcStatus(blobs.length > 1 ? `Envoi partie ${i + 1}/${blobs.length}…` : "Envoi…");
      const m = await uploadBlob(offer.id, blobs[i], "video", file.name);
      if (groupId) {
        m.groupId = groupId;
        m.part = i + 1;
        m.parts = blobs.length;
      }
      sessionPaths.current.add(m.path);
      setMedia((prev) => [...prev, m]);
    }
  }

  function removeMedia(id: string) {
    // Retrait du brouillon uniquement ; la suppression du fichier se fait à
    // l'enregistrement (pour rester cohérent si on annule).
    setMedia((ms) => ms.filter((m) => m.id !== id));
  }

  // Retire toutes les parties d'une vidéo découpée.
  function removeGroup(groupId: string) {
    setMedia((ms) => ms.filter((m) => m.groupId !== groupId));
  }

  // Ferme sans enregistrer : nettoie les fichiers téléversés cette session.
  function handleClose() {
    const orphans = [...sessionPaths.current];
    if (orphans.length) void deleteMedia(orphans);
    onClose();
  }

  function handleSave() {
    const cleanContacts = contacts
      .map((c) => ({
        id: c.id,
        label: c.label?.trim() || undefined,
        name: c.name?.trim() || undefined,
        phone: c.phone?.trim() || undefined,
        email: c.email?.trim() || undefined,
      }))
      .filter((c) => c.label || c.name || c.phone || c.email);
    const cleanLinks = links
      .map((l) => ({ id: l.id, label: l.label?.trim() || undefined, url: l.url.trim() }))
      .filter((l) => l.url);

    const reviews: OfferReview[] = [...otherReviews];
    if (myScore !== null) {
      reviews.push({
        author: me,
        score: myScore,
        comment: myComment.trim() || undefined,
        updatedAt: Date.now(),
      });
    }

    const details: OfferDetails = {};
    if (visitDate.trim()) details.visitDate = visitDate.trim();
    if (cleanContacts.length) details.contacts = cleanContacts;
    if (cleanLinks.length) details.links = cleanLinks;
    if (media.length) details.media = media;
    if (reviews.length) details.reviews = reviews;
    const hasDetails =
      details.visitDate ||
      details.contacts ||
      details.links ||
      details.media ||
      details.reviews;

    // Supprime du bucket les fichiers retirés (originaux ou téléversés puis ôtés).
    const kept = new Set(media.map((m) => m.path));
    const toDelete = [...new Set([...originalPaths.current, ...sessionPaths.current])].filter(
      (p) => !kept.has(p)
    );
    if (toDelete.length) void deleteMedia(toDelete);

    onSave({
      ...offer,
      notes: notes.trim() || undefined,
      details: hasDetails ? details : undefined,
    });
  }

  const status = STATUSES.find((s) => s.id === (offer.status ?? "new"));

  // Regroupe les parties d'une même vidéo découpée pour l'affichage.
  const displayItems: DisplayItem[] = [];
  const seenGroups = new Set<string>();
  for (const m of media) {
    if (m.groupId) {
      if (seenGroups.has(m.groupId)) continue;
      seenGroups.add(m.groupId);
      displayItems.push({
        group: m.groupId,
        parts: media
          .filter((x) => x.groupId === m.groupId)
          .sort((a, b) => (a.part ?? 0) - (b.part ?? 0)),
      });
    } else {
      displayItems.push(m);
    }
  }

  // Moyenne « live » (mon avis en cours + ceux des autres).
  const liveReviews: OfferReview[] =
    myScore !== null
      ? [...otherReviews, { author: me, score: myScore, updatedAt: 0 }]
      : otherReviews;
  const avg = averageScore(liveReviews);

  return (
    <>
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-card notes-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <strong>{offer.title}</strong>
            <div className="modal-sub">
              {status && (
                <span className="status-pill" style={{ background: statusColor(offer.status) }}>
                  {status.label}
                </span>
              )}
              <span>{offer.price} €{offer.surface ? ` · ${offer.surface} m²` : ""}</span>
            </div>
          </div>
          <button className="modal-close" aria-label="Fermer" onClick={handleClose}>
            ×
          </button>
        </header>

        <div className="modal-body">
          <label className="field">
            Date de visite
            <input
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              placeholder="mar. 1 juil. · 18h30"
            />
          </label>

          <section className="notes-section">
            <div className="notes-section-head">
              <span>Avis</span>
              {avg !== null && (
                <span className="review-avg">
                  Moyenne
                  <span className="review-chip" style={{ background: scoreColor(avg) }}>
                    {formatScore(avg)}/10
                  </span>
                </span>
              )}
            </div>

            {otherReviews.map((r) => (
              <div key={r.author} className="review-card">
                <span className="review-author">{r.author}</span>
                <span className="review-chip" style={{ background: scoreColor(r.score) }}>
                  {r.score}/10
                </span>
                {r.comment && <p className="review-comment">{r.comment}</p>}
              </div>
            ))}

            {myScore === null ? (
              <button type="button" className="add-row" onClick={() => setMyScore(7)}>
                + Donner mon avis ({me})
              </button>
            ) : (
              <div className="review-card mine">
                <div className="review-head">
                  <span className="review-author">
                    {me} <small>· toi</small>
                  </span>
                  <span className="review-chip" style={{ background: scoreColor(myScore) }}>
                    {myScore}/10
                  </span>
                  <button
                    type="button"
                    className="review-clear"
                    onClick={() => {
                      setMyScore(null);
                      setMyComment("");
                    }}
                  >
                    retirer
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={myScore}
                  onChange={(e) => setMyScore(Number(e.target.value))}
                  className="review-range"
                />
                <input
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="Commentaire (optionnel)"
                />
              </div>
            )}

            {myScore === null && otherReviews.length === 0 && (
              <p className="notes-empty">Aucun avis pour l'instant.</p>
            )}
          </section>

          <section className="notes-section">
            <div className="notes-section-head">
              <span>Contacts</span>
              <button
                type="button"
                className="add-row"
                onClick={() => setContacts((cs) => [...cs, { id: newId() }])}
              >
                + Ajouter
              </button>
            </div>
            {contacts.length === 0 && <p className="notes-empty">Aucun contact.</p>}
            {contacts.map((c) => (
              <div key={c.id} className="contact-row">
                <input
                  className="contact-label"
                  value={c.label ?? ""}
                  onChange={(e) => patchContact(c.id, { label: e.target.value })}
                  placeholder="Rôle (proprio, agence…)"
                />
                <input
                  value={c.name ?? ""}
                  onChange={(e) => patchContact(c.id, { name: e.target.value })}
                  placeholder="Nom"
                />
                <input
                  value={c.phone ?? ""}
                  onChange={(e) => patchContact(c.id, { phone: e.target.value })}
                  placeholder="Téléphone"
                  inputMode="tel"
                />
                <input
                  value={c.email ?? ""}
                  onChange={(e) => patchContact(c.id, { email: e.target.value })}
                  placeholder="Email"
                  inputMode="email"
                />
                <button
                  type="button"
                  className="remove-row"
                  aria-label="Retirer le contact"
                  onClick={() => setContacts((cs) => cs.filter((x) => x.id !== c.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </section>

          <section className="notes-section">
            <div className="notes-section-head">
              <span>Liens</span>
              <button
                type="button"
                className="add-row"
                onClick={() => setLinks((ls) => [...ls, { id: newId(), url: "" }])}
              >
                + Ajouter
              </button>
            </div>
            {links.length === 0 && <p className="notes-empty">Aucun lien.</p>}
            {links.map((l) => (
              <div key={l.id} className="link-row">
                <input
                  className="link-label"
                  value={l.label ?? ""}
                  onChange={(e) => patchLink(l.id, { label: e.target.value })}
                  placeholder="Libellé"
                />
                <input
                  value={l.url}
                  onChange={(e) => patchLink(l.id, { url: e.target.value })}
                  placeholder="https://…"
                  inputMode="url"
                />
                <button
                  type="button"
                  className="remove-row"
                  aria-label="Retirer le lien"
                  onClick={() => setLinks((ls) => ls.filter((x) => x.id !== l.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </section>

          <section className="notes-section">
            <div className="notes-section-head">
              <span>Photos / vidéos</span>
              <label className={mediaAvailable ? "add-row" : "add-row disabled"}>
                + Ajouter
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  disabled={!mediaAvailable || uploading}
                  onChange={(e) => {
                    handlePickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {!mediaAvailable && <p className="notes-empty">Stockage indisponible (mode local).</p>}
            {procStatus && <p className="notes-empty">{procStatus}</p>}
            {mediaError && <p className="error">{mediaError}</p>}
            {media.length === 0 && mediaAvailable && !uploading && (
              <p className="notes-empty">Aucun média.</p>
            )}
            {(media.length > 0 || uploading) && (
              <div className="media-grid">
                {displayItems.map((it, i) => {
                  if ("group" in it) {
                    const url = it.parts[0] ? mediaUrls[it.parts[0].path] : undefined;
                    return (
                      <div
                        key={it.group}
                        className="media-thumb media-clickable"
                        onClick={() => setLightbox(i)}
                      >
                        {url ? (
                          <>
                            <video src={url} muted preload="metadata" />
                            <span className="media-play">▶</span>
                          </>
                        ) : (
                          <span className="media-loading">…</span>
                        )}
                        <span className="media-part">{it.parts.length} parties</span>
                        <button
                          type="button"
                          className="media-remove"
                          aria-label="Retirer la vidéo"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeGroup(it.group);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  }
                  const url = mediaUrls[it.path];
                  return (
                    <div
                      key={it.id}
                      className="media-thumb media-clickable"
                      onClick={() => setLightbox(i)}
                    >
                      {url ? (
                        it.type === "video" ? (
                          <>
                            <video src={url} muted preload="metadata" />
                            <span className="media-play">▶</span>
                          </>
                        ) : (
                          <img src={url} alt={it.name ?? ""} />
                        )
                      ) : (
                        <span className="media-loading">…</span>
                      )}
                      <button
                        type="button"
                        className="media-remove"
                        aria-label="Retirer le média"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMedia(it.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {uploading && <span className="media-thumb media-loading">…</span>}
              </div>
            )}
          </section>

          <label className="field">
            Notes libres
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tout le reste en vrac…"
            />
          </label>
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn-ghost" onClick={handleClose}>
            Fermer
          </button>
          <button type="button" onClick={handleSave}>
            Enregistrer
          </button>
        </footer>
      </div>
    </div>
    {lightbox !== null && displayItems[lightbox] && (
      <MediaLightbox
        items={displayItems}
        index={lightbox}
        urls={mediaUrls}
        onClose={() => setLightbox(null)}
        onNav={(d) =>
          setLightbox((i) =>
            i === null ? null : Math.max(0, Math.min(displayItems.length - 1, i + d))
          )
        }
      />
    )}
    </>
  );
}

/** Lecture séquentielle des parties d'une vidéo découpée. */
function SequentialVideo({
  parts,
  urls,
}: {
  parts: OfferMedia[];
  urls: Record<string, string>;
}) {
  const [idx, setIdx] = useState(0);
  const total = parts.length;
  const current = parts[Math.min(idx, total - 1)];
  const url = current ? urls[current.path] : undefined;
  return (
    <div className="seqvideo">
      {url ? (
        <video
          key={current.path}
          src={url}
          controls
          autoPlay
          onEnded={() => setIdx((i) => (i + 1 < total ? i + 1 : i))}
        />
      ) : (
        <span className="media-loading">…</span>
      )}
      <span className="media-part">Partie {Math.min(idx, total - 1) + 1}/{total}</span>
    </div>
  );
}

/** Visionneuse plein écran avec navigation média précédent/suivant. */
function MediaLightbox({
  items,
  index,
  urls,
  onClose,
  onNav,
}: {
  items: DisplayItem[];
  index: number;
  urls: Record<string, string>;
  onClose: () => void;
  onNav: (delta: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNav(-1);
      else if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const touchX = useRef<number | null>(null);
  const it = items[index];

  return (
    <div
      className="lightbox"
      onClick={onClose}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) onNav(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button className="lightbox-close" aria-label="Fermer" onClick={onClose}>
        ×
      </button>
      {index > 0 && (
        <button
          className="lightbox-nav prev"
          aria-label="Précédent"
          onClick={(e) => {
            e.stopPropagation();
            onNav(-1);
          }}
        >
          ‹
        </button>
      )}
      {index < items.length - 1 && (
        <button
          className="lightbox-nav next"
          aria-label="Suivant"
          onClick={(e) => {
            e.stopPropagation();
            onNav(1);
          }}
        >
          ›
        </button>
      )}
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {"group" in it ? (
          <SequentialVideo parts={it.parts} urls={urls} />
        ) : !urls[it.path] ? (
          <span className="media-loading">…</span>
        ) : it.type === "video" ? (
          <video src={urls[it.path]} controls autoPlay />
        ) : (
          <img src={urls[it.path]} alt={it.name ?? ""} />
        )}
      </div>
      <div className="lightbox-counter">
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
