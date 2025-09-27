"use client";

import { useState, useEffect } from "react";

export default function LiteratureDisplay({ keywords }) {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    if (!keywords || keywords.length === 0) return;

    fetch("http://localhost:5000/literature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords }),
    })
      .then((res) => res.json())
      .then((data) => setArticles(data))
      .catch((err) => console.error("Error fetching articles:", err));
  }, [keywords]);

  return (
    <div className="flex gap-4 justify-center flex-wrap">
      {articles.map((article, index) => (
        <ArticleCard key={index} article={article} />
      ))}
    </div>
  );
}
