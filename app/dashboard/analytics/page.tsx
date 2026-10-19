import { Suspense } from "react";
import { AnalyticsView } from "@/components/analytics";
export default function Page() {
  return (
    <Suspense>
      <AnalyticsView />
    </Suspense>
  );
}
