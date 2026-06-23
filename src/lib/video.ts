// Compression et découpe des vidéos côté navigateur, via ffmpeg.wasm.
//
// Cœur MONO-THREAD self-hébergé (pas de COOP/COEP → n'impacte ni la carte ni les
// API externes). Chargé paresseusement au premier usage (~30 Mo).

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// Cœur ESM mono-thread chargé depuis le CDN au 1er usage. Le worker de
// @ffmpeg/ffmpeg est de type `module` → il fait `import(coreURL)`, donc on lui
// passe l'URL ESM directe (un blob du build UMD ne s'importe pas).
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

/** Garde-fou : au-delà, le navigateur n'a pas la mémoire pour traiter (1 Go). */
const MAX_INPUT_BYTES = 1024 * 1024 * 1024;

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (!loading) {
    const ff = new FFmpeg();
    loading = ff
      .load({
        coreURL: `${CORE_BASE}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
      })
      .then(() => {
        instance = ff;
        return ff;
      });
  }
  return loading;
}

function asBlob(data: Uint8Array | string, type: string): Blob {
  return new Blob([data as BlobPart], { type });
}

/** Re-encode une vidéo en 720p (qualité correcte) et renvoie le blob compressé. */
export async function compressVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Vidéo trop volumineuse pour le navigateur, raccourcis-la.");
  }
  const ff = await getFFmpeg();
  const input = "input_src";
  const output = "compressed.mp4";
  await ff.writeFile(input, await fetchFile(file));

  const onProg = ({ progress }: { progress: number }) =>
    onProgress?.(Math.max(0, Math.min(100, Math.round(progress * 100))));
  ff.on("progress", onProg);
  try {
    await ff.exec([
      "-i", input,
      // -2 garde le ratio (dimensions paires) ; on ne dépasse pas 720 de haut
      // sans upscaler les petites vidéos (virgule échappée dans l'expression).
      "-vf", "scale=-2:min(720\\,ih)",
      "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
      "-c:a", "aac", "-b:a", "128k",
      output,
    ]);
    return asBlob(await ff.readFile(output), "video/mp4");
  } finally {
    ff.off("progress", onProg);
    await ff.deleteFile(input).catch(() => {});
    await ff.deleteFile(output).catch(() => {});
  }
}

/** Durée d'une vidéo en secondes, lue depuis les logs ffmpeg (0 si introuvable). */
async function probeDuration(ff: FFmpeg, name: string): Promise<number> {
  let seconds = 0;
  const onLog = ({ message }: { message: string }) => {
    const m = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) seconds = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  };
  ff.on("log", onLog);
  try {
    await ff.exec(["-i", name]);
  } catch {
    // `-i` seul renvoie un code d'erreur : normal, on ne veut que les logs.
  } finally {
    ff.off("log", onLog);
  }
  return seconds;
}

/**
 * Découpe un blob vidéo en parties chacune sous `maxBytes`, sans ré-encodage
 * (copie de flux, rapide). Renvoie `[blob]` si déjà sous la limite.
 */
export async function splitIfNeeded(blob: Blob, maxBytes: number): Promise<Blob[]> {
  if (blob.size <= maxBytes) return [blob];
  const ff = await getFFmpeg();
  const input = "split_src.mp4";
  await ff.writeFile(input, await fetchFile(blob));
  try {
    const duration = await probeDuration(ff, input);
    if (!duration) {
      throw new Error("Découpe impossible (durée illisible), raccourcis la vidéo.");
    }
    const bytesPerSec = blob.size / duration;
    // Marge 80 % : la copie de flux coupe aux images-clés, les tailles varient.
    const segTime = Math.max(1, Math.floor((maxBytes * 0.8) / bytesPerSec));
    await ff.exec([
      "-i", input, "-c", "copy", "-map", "0",
      "-f", "segment", "-segment_time", String(segTime),
      "-reset_timestamps", "1", "part_%03d.mp4",
    ]);
    const entries = await ff.listDir("/");
    const names = entries
      .filter((e) => !e.isDir && /^part_\d+\.mp4$/.test(e.name))
      .map((e) => e.name)
      .sort();
    const parts: Blob[] = [];
    for (const n of names) {
      parts.push(asBlob(await ff.readFile(n), "video/mp4"));
      await ff.deleteFile(n).catch(() => {});
    }
    return parts.length ? parts : [blob];
  } finally {
    await ff.deleteFile(input).catch(() => {});
  }
}
