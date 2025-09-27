// src/lib/diagnosisApi.js
export async function fetchDiagnosis(symptoms, previousTests = [], minCost = 0, n = 2) {
  const requestBody = {
    symptoms: symptoms,
    previous_tests: previousTests,
    min_cost: minCost,
    n: n
  };

  const res = await fetch(`http://localhost:5050/api/next-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}