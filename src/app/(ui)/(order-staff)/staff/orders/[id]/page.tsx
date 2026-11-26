import { OrderDetailWorkspacePage } from "@/features/owner/pages/order-detail-page";
export { generateMetadata } from "@/features/owner/pages/order-detail-page";
export default function StaffOrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <OrderDetailWorkspacePage {...props} staff />;
}
