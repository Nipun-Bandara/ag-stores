// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocked = vi.hoisted(() => ({
  requireRole: vi.fn(),
  shop: vi.fn(),
  product: vi.fn(),
  create: vi.fn(),
  process: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/auth/request", () => ({ requireApiRole: mocked.requireRole }));
vi.mock("@/db", () => ({
  getDb: () => ({
    shop: { findFirst: mocked.shop },
    product: { findFirst: mocked.product },
    productPhotoUpload: { create: mocked.create },
  }),
}));
vi.mock("@/lib/product-photo-storage", () => ({
  PhotoError: class PhotoError extends Error {
    status = 400;
  },
  readBoundedPhotoRequest: vi.fn(
    async () => new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
  ),
  processPhoto: mocked.process,
  uploadPhoto: mocked.upload,
  deletePhoto: mocked.remove,
}));

import { POST } from "@/app/api/owner/products/photo/route";

const shopId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const request = (query = `shopId=${shopId}`) =>
  new NextRequest(`http://localhost/api/owner/products/photo?${query}`, {
    method: "POST",
    body: new FormData(),
  });

describe("owner photo upload route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocked.requireRole.mockResolvedValue({
      authorized: true,
      user: { id: "owner-1", role: "SHOP_OWNER" },
    });
    mocked.shop.mockResolvedValue({ id: shopId });
    mocked.product.mockResolvedValue({ id: productId });
    mocked.process.mockResolvedValue(Buffer.from("webp"));
    mocked.upload.mockResolvedValue(undefined);
    mocked.create.mockResolvedValue({ id: "upload-1" });
  });

  it("rejects unauthenticated owners before reading a file", async () => {
    mocked.requireRole.mockResolvedValue({
      authorized: false,
      response: new Response(null, { status: 401 }),
    });
    expect((await POST(request())).status).toBe(401);
    expect(mocked.shop).not.toHaveBeenCalled();
    expect(mocked.upload).not.toHaveBeenCalled();
  });

  it("rejects cross-shop and cross-product attempts", async () => {
    mocked.shop.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(404);
    mocked.product.mockResolvedValueOnce(null);
    expect(
      (await POST(request(`shopId=${shopId}&productId=${productId}`))).status,
    ).toBe(404);
    expect(mocked.upload).not.toHaveBeenCalled();
  });

  it("uploads under the checked shop and records its owner", async () => {
    const response = await POST(
      request(`shopId=${shopId}&productId=${productId}`),
    );
    expect(response.status).toBe(201);
    expect(mocked.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "owner-1",
          shopId,
          productId,
          storageKey: expect.stringMatching(
            new RegExp(`^products/${shopId}/[a-f0-9-]+\\.webp$`),
          ),
        }),
      }),
    );
    expect(mocked.upload).toHaveBeenCalledOnce();
  });

  it("does not issue an attachment when storage upload fails", async () => {
    mocked.upload.mockRejectedValueOnce(new Error("unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocked.remove).toHaveBeenCalledOnce();
  });
});
