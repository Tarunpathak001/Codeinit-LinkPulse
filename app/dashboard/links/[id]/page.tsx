import { LinkDetail } from "@/components/links";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <LinkDetail id={(await params).id} />;
}
