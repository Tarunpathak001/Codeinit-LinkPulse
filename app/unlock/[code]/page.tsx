import { Unlock } from "@/components/unlock";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return <Unlock code={(await params).code} />;
}
