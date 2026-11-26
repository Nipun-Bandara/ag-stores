import {
  OrderWorkspacePage,
  type OwnerOrdersPageProps,
} from "@/features/owner/pages/order-list-page";
export { generateMetadata } from "@/features/owner/pages/order-list-page";
export default function OwnerOrdersPage(props: OwnerOrdersPageProps) {
  return OrderWorkspacePage(props);
}
