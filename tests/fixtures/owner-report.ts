import type { OwnerReportsView } from "@/services/owner-report.service";
export const ownerReport: OwnerReportsView = {
  filters: { from: "2026-10-01", to: "2026-10-08", status: "DELIVERED" },
  period: { from: "2026-10-01", to: "2026-10-08" },
  summary: {
    totalOrders: 3,
    totalRevenue: "1100.50",
    completedDeliveries: 3,
    failedDeliveries: 0,
  },
  dailyOrders: [{ date: "2026-10-01", orders: 3 }],
  dailyRevenue: [{ date: "2026-10-01", revenue: "1100.50" }],
  ordersByStatus: [{ status: "DELIVERED", orders: 3 }],
  bestSellingProducts: [
    {
      productId: "product-id",
      nameEn: 'Tea, "Premium"',
      nameSi: "තේ",
      shopName: "Test Shop",
      quantitySold: 5,
    },
  ],
  lowStockProducts: [
    {
      productId: "product-id",
      nameEn: "Tea",
      nameSi: "තේ",
      shopName: "Test Shop",
      stockQuantity: 2,
      lowStockThreshold: 5,
    },
  ],
  completedDeliveries: 3,
  failedDeliveries: 0,
};
