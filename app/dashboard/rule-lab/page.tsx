import { Suspense } from "react";
import { RuleLab } from "@/components/rule-lab";
export default function Page() {
  return (
    <Suspense>
      <RuleLab />
    </Suspense>
  );
}
