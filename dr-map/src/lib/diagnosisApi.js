const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

// Sends a POST with a JSON array body to /receive  (matches your Flask endpoint)
export async function fetchDiagnosis(symptoms) {
  const res = await fetch(`${API_BASE}/receive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(symptoms), // e.g., ["fever","cough"]
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}