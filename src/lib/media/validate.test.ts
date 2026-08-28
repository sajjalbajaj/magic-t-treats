import { describe, expect, it } from "vitest";

import {
  buildStoragePath,
  extensionOf,
  limitsFrom,
  validateFileSignature,
  validateUploadMetadata,
} from "@/lib/media/validate";

/**
 * Upload validation is a security boundary: the point of the signature check
 * is that a renamed file cannot pass, so that case is tested explicitly.
 */

const limits = limitsFrom({ maxImageMb: 10, maxVideoMb: 100 });

function file(name: string, type: string, size: number) {
  return { name, type, size };
}

describe("extensionOf", () => {
  it("reads the extension case-insensitively", () => {
    expect(extensionOf("Photo.JPG")).toBe("jpg");
    expect(extensionOf("clip.mp4")).toBe("mp4");
  });

  it("returns empty for a file with no extension", () => {
    expect(extensionOf("noextension")).toBe("");
  });
});

describe("validateUploadMetadata", () => {
  it("accepts the supported image formats", () => {
    for (const [name, type] of [
      ["a.jpg", "image/jpeg"],
      ["a.png", "image/png"],
      ["a.webp", "image/webp"],
      ["a.avif", "image/avif"],
    ] as const) {
      expect(validateUploadMetadata(file(name, type, 1000), limits).ok, name).toBe(true);
    }
  });

  it("accepts the supported video formats", () => {
    for (const [name, type] of [
      ["a.mp4", "video/mp4"],
      ["a.webm", "video/webm"],
      ["a.mov", "video/quicktime"],
    ] as const) {
      expect(validateUploadMetadata(file(name, type, 1000), limits).ok, name).toBe(true);
    }
  });

  it("rejects an executable dressed up with an image MIME type", () => {
    const result = validateUploadMetadata(file("evil.exe", "image/jpeg", 1000), limits);
    expect(result.ok).toBe(false);
  });

  it("rejects an SVG, which can carry script", () => {
    expect(validateUploadMetadata(file("a.svg", "image/svg+xml", 1000), limits).ok).toBe(false);
  });

  it("enforces separate size limits per media type", () => {
    const bigImage = validateUploadMetadata(file("a.jpg", "image/jpeg", 11 * 1024 * 1024), limits);
    expect(bigImage.ok).toBe(false);

    // The same size is fine for a video.
    const okVideo = validateUploadMetadata(file("a.mp4", "video/mp4", 11 * 1024 * 1024), limits);
    expect(okVideo.ok).toBe(true);

    const bigVideo = validateUploadMetadata(
      file("a.mp4", "video/mp4", 101 * 1024 * 1024),
      limits,
    );
    expect(bigVideo.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateUploadMetadata(file("a.jpg", "image/jpeg", 0), limits).ok).toBe(false);
  });

  it("reports the type it resolved", () => {
    const result = validateUploadMetadata(file("a.mp4", "video/mp4", 5000), limits);
    expect(result.ok && result.type).toBe("video");
  });
});

describe("validateFileSignature", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const mp4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
  const html = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0, 0, 0]);

  it("accepts real image headers", () => {
    expect(validateFileSignature(jpeg, "image").ok).toBe(true);
    expect(validateFileSignature(png, "image").ok).toBe(true);
  });

  it("accepts real video headers", () => {
    expect(validateFileSignature(mp4, "video").ok).toBe(true);
    expect(validateFileSignature(webm, "video").ok).toBe(true);
  });

  it("rejects an HTML file renamed to .jpg — the whole point of the check", () => {
    const result = validateFileSignature(html, "image");
    expect(result.ok).toBe(false);
  });

  it("rejects a video body declared as an image", () => {
    expect(validateFileSignature(webm, "image").ok).toBe(false);
  });
});

describe("buildStoragePath", () => {
  it("namespaces by folder and keeps the file recognisable", () => {
    const path = buildStoragePath("products", "Choco Bites Final.JPG", "ab12cd34");
    expect(path).toBe("products/ab12cd34-choco-bites-final.jpg");
  });

  it("uses the unique prefix so identical names cannot collide", () => {
    const first = buildStoragePath("posts", "IMG_1234.jpg", "aaaa1111");
    const second = buildStoragePath("posts", "IMG_1234.jpg", "bbbb2222");
    expect(first).not.toBe(second);
  });

  it("strips characters that would break a storage key", () => {
    const path = buildStoragePath("posts", "../../etc/passwd.png", "aaaa1111");
    expect(path).toBe("posts/aaaa1111-etc-passwd.png");
    expect(path).not.toContain("..");
  });

  it("copes with a file that has no usable name", () => {
    expect(buildStoragePath("branding", "___.png", "aaaa1111")).toBe(
      "branding/aaaa1111-file.png",
    );
  });
});
