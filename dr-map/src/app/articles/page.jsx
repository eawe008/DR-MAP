"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LiteratureDisplay from "./components/literature-display";

function ArticlesContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data");

  let keywords = [];
  if (dataParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
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

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ArticlesContent />
    </Suspense>
  );
}
