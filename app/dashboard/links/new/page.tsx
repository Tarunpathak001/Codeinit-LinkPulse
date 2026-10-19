import { LinkForm } from "@/components/link-form";
import { Heading } from "@/components/ui";
export default function Page() {
  return (
    <>
      <Heading
        eyebrow="MAKE A CONNECTION"
        title="A small link. A fresh start."
        description="Choose a destination, give it a name, and set your rules."
      />
      <LinkForm />
    </>
  );
}
