import sharp from "sharp";

export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
export const MAX_DECODED_PIXELS = 40_000_000;
export const MAX_PROCESSED_BYTES = 2 * 1024 * 1024;
export const PHOTO_BUCKET = "product-photos";

export class PhotoError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function configuration() {
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!base)
    throw new PhotoError(
      "Photo storage URL is not configured. Please contact support.",
      503,
    );
  if (!secretKey && !legacyKey)
    throw new PhotoError(
      "Photo uploads need a server-side Supabase secret key. Please contact support.",
      503,
    );
  if (secretKey && !secretKey.startsWith("sb_secret_"))
    throw new PhotoError(
      "Photo storage secret key is invalid. Please contact support.",
      503,
    );
  if (!secretKey && legacyKey?.startsWith("sb_publishable_"))
    throw new PhotoError(
      "Photo storage needs a server-side secret key, not a publishable key.",
      503,
    );
  let origin: string;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.pathname !== "/")
      throw new Error("invalid");
    origin = url.origin;
  } catch {
    throw new PhotoError(
      "Photo storage is not configured. Please contact support.",
      503,
    );
  }
  return { origin, key: secretKey || legacyKey!, legacy: !secretKey };
}

export function publicPhotoUrl(storageKey: string): string {
  const { origin } = configuration();
  return `${origin}/storage/v1/object/public/${PHOTO_BUCKET}/${storageKey}`;
}

export function isManagedPhotoUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    return new URL(value).pathname.startsWith(
      `/storage/v1/object/public/${PHOTO_BUCKET}/`,
    );
  } catch {
    return false;
  }
}

export async function readBoundedPhotoRequest(request: Request): Promise<File> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_ORIGINAL_BYTES + 64 * 1024)
    throw new PhotoError(
      "Photo is too large. Choose an image under 10 MB.",
      413,
    );
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new PhotoError("Choose a JPEG, PNG or WebP photo.");
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoError("Choose a photo.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ORIGINAL_BYTES + 64 * 1024) {
        await reader.cancel();
        throw new PhotoError(
          "Photo is too large. Choose an image under 10 MB.",
          413,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const form = await new Request("http://localhost/photo", {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type")! },
    body: Buffer.concat(chunks),
  })
    .formData()
    .catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) throw new PhotoError("Choose a photo.");
  if (file.size > MAX_ORIGINAL_BYTES)
    throw new PhotoError(
      "Photo is too large. Choose an image under 10 MB.",
      413,
    );
  return file;
}

export async function processPhoto(file: File): Promise<Buffer> {
  if (/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
    throw new PhotoError(
      "HEIC photos are not supported. Export as JPEG or choose a JPEG, PNG or WebP image.",
    );
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new PhotoError("Choose a JPEG, PNG or WebP photo.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let metadata;
  try {
    metadata = await sharp(bytes, {
      limitInputPixels: false,
      failOn: "error",
    }).metadata();
  } catch {
    throw new PhotoError(
      "This photo could not be decoded. Choose another JPEG, PNG or WebP image.",
    );
  }
  if (
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    !metadata.width ||
    !metadata.height
  )
    throw new PhotoError("Choose a valid JPEG, PNG or WebP photo.");
  if (metadata.width * metadata.height > MAX_DECODED_PIXELS)
    throw new PhotoError(
      "Photo dimensions are too large. Use an image under 40 megapixels.",
      413,
    );
  try {
    const output = await sharp(bytes, { limitInputPixels: MAX_DECODED_PIXELS })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();
    if (output.length > MAX_PROCESSED_BYTES)
      throw new PhotoError(
        "Processed photo is too large. Choose a smaller or simpler image.",
        413,
      );
    return output;
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError(
      "This photo could not be processed. Choose another image.",
    );
  }
}

export async function uploadPhoto(storageKey: string, bytes: Buffer) {
  const { origin, key, legacy } = configuration();
  const response = await fetch(
    `${origin}/storage/v1/object/${PHOTO_BUCKET}/${storageKey}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        ...(legacy ? { Authorization: `Bearer ${key}` } : {}),
        "Content-Type": "image/webp",
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok)
    throw new PhotoError("Photo upload failed. Please try saving again.", 503);
}

export async function deletePhoto(storageKey: string) {
  const { origin, key, legacy } = configuration();
  const response = await fetch(
    `${origin}/storage/v1/object/${PHOTO_BUCKET}/${storageKey}`,
    {
      method: "DELETE",
      headers: {
        apikey: key,
        ...(legacy ? { Authorization: `Bearer ${key}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok && response.status !== 404)
    throw new PhotoError("Photo cleanup will be retried later.", 503);
}
