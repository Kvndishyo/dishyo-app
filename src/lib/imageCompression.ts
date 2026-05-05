import imageCompression from "browser-image-compression";

/** Compress to ~max 1MB, longest side 1600px. Returns a JPEG file. */
export async function compressImage(input: File | Blob, name = `dish-${Date.now()}.jpg`): Promise<File> {
  const file = input instanceof File ? input : new File([input], name, { type: input.type || "image/jpeg" });
  try {
    const out = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    });
    return new File([out], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
