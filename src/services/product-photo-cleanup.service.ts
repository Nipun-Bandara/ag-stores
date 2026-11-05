import type { PrismaClient } from "@/generated/prisma/client";
import { deletePhoto } from "@/lib/product-photo-storage";

export async function cleanupProductPhotos(
  db: PrismaClient,
  remove: (key: string) => Promise<void> = deletePhoto,
  now = new Date(),
) {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let examined = 0,
    deleted = 0,
    retained = 0,
    failed = 0;
  let cursor: string | undefined;
  while (deleted + failed < 100) {
    const candidates = await db.productPhotoUpload.findMany({
      where: { createdAt: { lt: cutoff }, purgedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!candidates.length) break;
    for (const candidate of candidates) {
      cursor = candidate.id;
      examined++;
      const claim = await db.$transaction(async (tx) => {
        if (
          await tx.product.count({
            where: { imageStorageKey: candidate.storageKey },
          })
        )
          return false;
        if (candidate.deletedAt) return true;
        const result = await tx.productPhotoUpload.updateMany({
          where: {
            id: candidate.id,
            deletedAt: null,
            attachedAt: candidate.attachedAt,
          },
          data: { deletedAt: new Date() },
        });
        return result.count === 1;
      });
      if (!claim) {
        retained++;
        continue;
      }
      try {
        await remove(candidate.storageKey);
        await db.productPhotoUpload.update({
          where: { id: candidate.id },
          data: { purgedAt: new Date() },
        });
        deleted++;
      } catch {
        failed++;
      }
      if (deleted + failed >= 100) break;
    }
    if (candidates.length < 100) break;
  }
  return { examined, deleted, retained, failed };
}
