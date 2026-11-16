import {
  ReturnQueuePage,
  type ReturnQuery,
} from "@/features/returns/components/return-queue-page";
export default function Page(props: { searchParams: ReturnQuery }) {
  return <ReturnQueuePage {...props} staff />;
}
