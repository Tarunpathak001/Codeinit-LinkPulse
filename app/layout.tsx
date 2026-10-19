import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LinkPulse · Short links you can trust",
  description:
    "Create, protect and measure your links. Prove every redirect rule before it goes live.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
