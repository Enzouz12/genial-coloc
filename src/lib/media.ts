// Upload et accès aux médias (images/vidéos) d'une annonce, via Supabase Storage.
//
// Bucket PRIVÉ : les fichiers ne sont jamais publics. L'affichage passe par des
// URLs signées temporaires régénérées à la demande (voir signedUrl).

import type { OfferMedia } from "../types";
import { supabase } from "./supabase";

/** Nom du bucket de stockage des médias d'annonces (privé). */
export const MEDIA_BUCKET = "offer-media";

/** Limite par fichier du bucket (150 Mo) — seuil de découpe des vidéos. */
export const MEDIA_FILE_LIMIT = 150 * 1024 * 1024;

/** Durée de validité des URLs signées, en secondes (1 h). */
const SIGNED_TTL = 3600;

/** Vrai si le stockage de médias est disponible (Supabase configuré). */
export const mediaAvailable = Boolean(supabase);

function extOf(file: File, type: "image" | "video"): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : "";
  return (fromName || (type === "video" ? "mp4" : "jpg")).toLowerCase();
}

/** Téléverse un fichier dans le bucket et renvoie sa référence média. */
export async function uploadMedia(offerId: string, file: File): Promise<OfferMedia> {
  if (!supabase) throw new Error("Stockage indisponible");
  const type: OfferMedia["type"] = file.type.startsWith("video") ? "video" : "image";
  const path = `${offerId}/${crypto.randomUUID()}.${extOf(file, type)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { id: crypto.randomUUID(), path, type, name: file.name };
}

/** Téléverse un blob déjà préparé (vidéo compressée/segmentée) dans le bucket. */
export async function uploadBlob(
  offerId: string,
  blob: Blob,
  type: OfferMedia["type"],
  name?: string
): Promise<OfferMedia> {
  if (!supabase) throw new Error("Stockage indisponible");
  const ext = type === "video" ? "mp4" : "jpg";
  const path = `${offerId}/${crypto.randomUUID()}.${ext}`;
  const contentType = blob.type || (type === "video" ? "video/mp4" : "image/jpeg");
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return { id: crypto.randomUUID(), path, type, name };
}

/** Génère une URL signée temporaire pour afficher un média. */
export async function signedUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

/** Supprime des fichiers du bucket (best-effort). */
export async function deleteMedia(paths: string[]): Promise<void> {
  if (!supabase || paths.length === 0) return;
  await supabase.storage.from(MEDIA_BUCKET).remove(paths);
}
