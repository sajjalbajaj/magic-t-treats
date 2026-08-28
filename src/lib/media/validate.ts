import { uploadDefaults } from "@/config/site";
import type { MediaType } from "@/types/database";

/**
 * Upload validation.
 *
 * Deliberately checks the declared MIME type *and* the extension *and* the
 * magic bytes. Extensions are trivially renamed and the browser-supplied MIME
 * type is attacker-controlled, so neither is trustworthy alone; the signature
 * check is what actually establishes that a file is what it claims to be.
 *
 * Shared by the client (for instant feedback) and the server action (which is
 * the check that counts).
 */

export type UploadLimits = { maxImageBytes: number; maxVideoBytes: number };

export type ValidationResult =
  | { ok: true; type: MediaType }
  | { ok: false; message: string };

export function limitsFrom(settings: { maxImageMb: number; maxVideoMb: number }): UploadLimits {
  return {
    maxImageBytes: Math.round(settings.maxImageMb * 1024 * 1024),
    maxVideoBytes: Math.round(settings.maxVideoMb * 1024 * 1024),
  };
}

export function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Type, extension and size. Does not read the file body. */
export function validateUploadMetadata(
  file: { name: string; type: string; size: number },
  limits: UploadLimits,
): ValidationResult {
  const mime = file.type.toLowerCase();
  const extension = extensionOf(file.name);

  const isImage =
    (uploadDefaults.imageMimeTypes as readonly string[]).includes(mime) &&
    (uploadDefaults.imageExtensions as readonly string[]).includes(extension);

  const isVideo =
    (uploadDefaults.videoMimeTypes as readonly string[]).includes(mime) &&
    (uploadDefaults.videoExtensions as readonly string[]).includes(extension);

  if (!isImage && !isVideo) {
    return {
      ok: false,
      message:
        "That file type is not supported. Images: JPG, PNG, WebP or AVIF. Videos: MP4, WebM or MOV.",
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "That file appears to be empty." };
  }

  const limit = isImage ? limits.maxImageBytes : limits.maxVideoBytes;
  if (file.size > limit) {
    return {
      ok: false,
      message: `That file is ${formatMb(file.size)}. The limit for ${isImage ? "images" : "videos"} is ${formatMb(limit)}.`,
    };
  }

  return { ok: true, type: isImage ? "image" : "video" };
}

/**
 * Magic-byte signatures for the formats we accept.
 *
 * This is the check a renamed `.jpg` that is really an HTML file cannot pass.
 */
const SIGNATURES: { type: MediaType; bytes: number[]; offset: number }[] = [
  { type: "image", bytes: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG
  { type: "image", bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 }, // PNG
  { type: "image", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (WebP)
  { type: "image", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp (AVIF)
  { type: "video", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp (MP4/MOV)
  { type: "video", bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0 }, // EBML (WebM)
];

function matches(header: Uint8Array, signature: { bytes: number[]; offset: number }): boolean {
  return signature.bytes.every((byte, index) => header[signature.offset + index] === byte);
}

/** Confirms the file body matches the type it claims. */
export function validateFileSignature(header: Uint8Array, declared: MediaType): ValidationResult {
  const matched = SIGNATURES.filter((signature) => matches(header, signature));

  if (matched.length === 0) {
    return {
      ok: false,
      message: "That file does not look like a valid image or video. Please re-export and retry.",
    };
  }

  // `ftyp` covers both AVIF and MP4/MOV, so a container match for either side
  // is acceptable as long as one of them agrees with the declared type.
  if (!matched.some((signature) => signature.type === declared)) {
    return {
      ok: false,
      message: "The file contents do not match its extension. Please re-save the file and retry.",
    };
  }

  return { ok: true, type: declared };
}

/**
 * Storage path: folder/timestamp-random-name.ext
 *
 * The random component prevents two uploads of "IMG_1234.jpg" from colliding,
 * and the sanitised original name keeps the object recognisable in the bucket.
 */
export function buildStoragePath(folder: string, fileName: string, unique: string): string {
  const extension = extensionOf(fileName);
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${folder}/${unique}-${base || "file"}${extension ? `.${extension}` : ""}`;
}
