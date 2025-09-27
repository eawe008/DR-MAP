// src/lib/diagnosisApi.js
export async function fetchDiagnosis(symptoms) {
  const res = await fetch(`/backend/receive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(symptoms),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
