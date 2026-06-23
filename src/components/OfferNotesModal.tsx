import { useEffect, useRef, useState } from "react";
import type { Offer, OfferContact, OfferLink, OfferDetails, OfferMedia } from "../types";
import { STATUSES, statusColor } from "../config";
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
  onClose: () => void;
  onSave: (updated: Offer) => void;
}

const newId = () => crypto.randomUUID();

/** Modale d'édition des notes structurées d'une annonce. */
export function OfferNotesModal({ offer, onClose, onSave }: Props) {
  const [visitDate, setVisitDate] = useState(offer.details?.visitDate ?? "");
  const [contacts, setContacts] = useState<OfferContact[]>(offer.details?.contacts ?? []);
  const [links, setLinks] = useState<OfferLink[]>(offer.details?.links ?? []);
  const [notes, setNotes] = useState(offer.notes ?? "");
  const [media, setMedia] = useState<OfferMedia[]>(offer.details?.media ?? []);
  // URLs signées résolues pour l'affichage (path -> url temporaire).
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  // Message d'avancement du traitement vidéo (compression/découpe/envoi).
  const [procStatus, setProcStatus] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
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

  // Échap ferme la modale (avec nettoyage des médias non enregistrés).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
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

    const details: OfferDetails = {};
    if (visitDate.trim()) details.visitDate = visitDate.trim();
    if (cleanContacts.length) details.contacts = cleanContacts;
    if (cleanLinks.length) details.links = cleanLinks;
    if (media.length) details.media = media;
    const hasDetails =
      details.visitDate || details.contacts || details.links || details.media;

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
  const displayItems: (OfferMedia | { group: string; parts: OfferMedia[] })[] = [];
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

  return (
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
                {displayItems.map((it) =>
                  "group" in it ? (
                    <MediaGroupTile
                      key={it.group}
                      parts={it.parts}
                      urls={mediaUrls}
                      onRemove={() => removeGroup(it.group)}
                    />
                  ) : (
                    <div key={it.id} className="media-thumb">
                      {mediaUrls[it.path] ? (
                        it.type === "video" ? (
                          <video src={mediaUrls[it.path]} controls />
                        ) : (
                          <img
                            src={mediaUrls[it.path]}
                            alt={it.name ?? ""}
                            onClick={() => window.open(mediaUrls[it.path], "_blank")}
                          />
                        )
                      ) : (
                        <span className="media-loading">…</span>
                      )}
                      <button
                        type="button"
                        className="media-remove"
                        aria-label="Retirer le média"
                        onClick={() => removeMedia(it.id)}
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
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
  );
}

/** Tuile d'une vidéo découpée : lecture séquentielle des parties. */
function MediaGroupTile({
  parts,
  urls,
  onRemove,
}: {
  parts: OfferMedia[];
  urls: Record<string, string>;
  onRemove: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const total = parts.length;
  const current = parts[Math.min(idx, total - 1)];
  const url = current ? urls[current.path] : undefined;
  return (
    <div className="media-thumb">
      {url ? (
        <video
          key={current.path}
          src={url}
          controls
          autoPlay={idx > 0}
          onEnded={() => setIdx((i) => (i + 1 < total ? i + 1 : i))}
        />
      ) : (
        <span className="media-loading">…</span>
      )}
      <span className="media-part">Partie {Math.min(idx, total - 1) + 1}/{total}</span>
      <button type="button" className="media-remove" aria-label="Retirer la vidéo" onClick={onRemove}>
        ×
      </button>
    </div>
  );
}
