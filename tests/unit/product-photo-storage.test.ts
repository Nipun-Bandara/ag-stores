// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  MAX_DECODED_PIXELS,
  MAX_ORIGINAL_BYTES,
  processPhoto,
  publicPhotoUrl,
  readBoundedPhotoRequest,
  uploadPhoto,
  deletePhoto,
} from "@/lib/product-photo-storage";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase photo configuration", () => {
  it("reuses the public project URL but requires a server-only write key", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => publicPhotoUrl("products/shop/photo.webp")).toThrow(
      "server-side Supabase secret key",
    );
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_publishable_wrong");
    expect(() => publicPhotoUrl("products/shop/photo.webp")).toThrow(
      "secret key is invalid",
    );
  });

  it("uses a new secret key only as an apikey for upload and deletion", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const key = "products/shop/photo.webp";
    expect(publicPhotoUrl(key)).toBe(
      `https://project.supabase.co/storage/v1/object/public/product-photos/${key}`,
    );
    await uploadPhoto(key, Buffer.from("webp"));
    await deletePhoto(key);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      const headers = new Headers(options?.headers);
      expect(headers.get("apikey")).toBe("sb_secret_test");
      expect(headers.has("Authorization")).toBe(false);
    }
  });

  it("keeps legacy service-role bearer headers compatible", async () => {
    vi.stubEnv("SUPABASE_URL", "https://legacy.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "legacy-jwt");
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await uploadPhoto("products/shop/photo.webp", Buffer.from("webp"));
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("apikey")).toBe("legacy-jwt");
    expect(headers.get("Authorization")).toBe("Bearer legacy-jwt");
  });
});

describe("product photo processing", () => {
  it("re-encodes and removes metadata while honoring camera orientation", async () => {
    const original = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: "red" },
    })
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Copyright: "fixture" } },
      })
      .jpeg()
      .toBuffer();
    const output = await processPhoto(
      new File([new Uint8Array(original)], "camera.jpg", {
        type: "image/jpeg",
      }),
    );
    const info = await sharp(output).metadata();
    expect(info.format).toBe("webp");
    expect(info.width).toBeLessThanOrEqual(1600);
    expect(info.height).toBeLessThanOrEqual(1600);
    expect(info.exif).toBeUndefined();
    expect(info.orientation).toBeUndefined();
  });

  it("rejects spoofed image data and unsupported formats", async () => {
    await expect(
      processPhoto(new File(["<svg/>"], "fake.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow("could not be decoded");
    await expect(
      processPhoto(new File(["photo"], "photo.heic", { type: "image/heic" })),
    ).rejects.toThrow("HEIC");
    await expect(
      processPhoto(
        new File(["<svg/>"], "vector.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("JPEG, PNG or WebP");
  });

  it("rejects excessive dimensions and original body size", async () => {
    const giant = await sharp({
      create: { width: 7000, height: 6000, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    expect(7000 * 6000).toBeGreaterThan(MAX_DECODED_PIXELS);
    await expect(
      processPhoto(
        new File([new Uint8Array(giant)], "giant.png", { type: "image/png" }),
      ),
    ).rejects.toMatchObject({ status: 413 });
    const form = new FormData();
    form.set(
      "photo",
      new File([new Uint8Array(MAX_ORIGINAL_BYTES + 1)], "huge.jpg", {
        type: "image/jpeg",
      }),
    );
    const request = new Request("http://localhost/photo", {
      method: "POST",
      body: form,
    });
    await expect(readBoundedPhotoRequest(request)).rejects.toMatchObject({
      status: 413,
    });
  });
});
