import type { Metadata } from "next";
import LinksContent from "../links-content";

export const metadata: Metadata = {
  title: "Links",
};

export default function LinksPage() {
  return <LinksContent />;
}
