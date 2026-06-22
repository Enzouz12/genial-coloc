import { useEffect, useRef, useState } from "react";
import type { Offer, OfferContact, OfferLink, OfferDetails, OfferMedia } from "../types";
import { STATUSES, statusColor } from "../config";
import { uploadMedia, signedUrl, deleteMedia, mediaAvailable } from "../lib/media";

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
        const m = await uploadMedia(offer.id, file);
        sessionPaths.current.add(m.path);
        setMedia((prev) => [...prev, m]);
      }
    } catch {
      setMediaError(
        "Échec du téléversement. Vérifie que le bucket « offer-media » existe (voir la doc)."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(id: string) {
    // Retrait du brouillon uniquement ; la suppression du fichier se fait à
    // l'enregistrement (pour rester cohérent si on annule).
    setMedia((ms) => ms.filter((m) => m.id !== id));
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
            {mediaError && <p className="error">{mediaError}</p>}
            {media.length === 0 && mediaAvailable && !uploading && (
              <p className="notes-empty">Aucun média.</p>
            )}
            {(media.length > 0 || uploading) && (
              <div className="media-grid">
                {media.map((m) => (
                  <div key={m.id} className="media-thumb">
                    {mediaUrls[m.path] ? (
                      m.type === "video" ? (
                        <video src={mediaUrls[m.path]} controls />
                      ) : (
                        <img
                          src={mediaUrls[m.path]}
                          alt={m.name ?? ""}
                          onClick={() => window.open(mediaUrls[m.path], "_blank")}
                        />
                      )
                    ) : (
                      <span className="media-loading">…</span>
                    )}
                    <button
                      type="button"
                      className="media-remove"
                      aria-label="Retirer le média"
                      onClick={() => removeMedia(m.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
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
