"use client";

import { useSearchParams } from "next/navigation";
import LiteratureDisplay from "./components/literature-display";
export const dynamic = "force-dynamic";

export default function ArticlesPage() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data");

  let keywords = [];
  if (dataParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      // For your use case, you probably want the symptoms and/or diagnosis as keywords
      keywords = [...parsed.symptoms, parsed.diagnosis];
    } catch (e) {
      console.error("Failed to parse query param 'data':", e);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-6">Related Literature</h1>
      <LiteratureDisplay keywords={keywords} />
    </div>
  );
}
