"use client";

import { Link } from "next/link"
import { Button } from "@/components/ui/button"

export default function ArticleCard({ article }) {
  return (
    <div className="border rounded-md p-8 w-90 flex flex-col justify-between shadow-md">
      <h3 className="font-bold text-lg mb-2">{article.title}</h3>
      <p className="text-sm mb-2">{article.abstract || "No abstract available."}</p>
      {article.doi && (
        <p className="text-xs mb-1">
          DOI: <a href={`https://doi.org/${article.doi}`} target="_blank">{article.doi}</a>
        </p>
      )}
      {article.url && article.url.length > 0 && (
        <div className="flex flex-col gap-1">
          {article.url.map((url, i) => (
            <Button key={i} asChild>
                <a href={url} target="_blank" className="text-blue-600 text-sm underline">
                  Full text {i + 1}
                </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
