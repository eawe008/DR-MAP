"use client";

import { Link } from "next/link"
import { Button } from "@/components/ui/button"

export default function ArticleCard({ article }) {
  return (
    <div className="border rounded-md pt-4 p-8 w-90 flex flex-col justify-between gap-6 shadow-md">
      <div className="flex flex-col">
        {article.doi && (
          <p className="text-xs mt-1 mb-2 text-end text-stone-400">
            DOI: <a href={`https://doi.org/${article.doi}`} target="_blank">{article.doi}</a>
          </p>
        )}  
        <h3 className="font-bold text-lg">{article.title}</h3>
        <p className="text-sm mt-2 line-clamp-8">{article.abstract || "No abstract available."}</p>
      </div>
      <div className="flex flex-col">
        {article.url && article.url.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {article.url.map((url, i) => (
              <Button key={i} asChild>
                  <a href={url} target="_blank" className="text-blue-600 text-sm">
                    Full text {i + 1}
                  </a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
