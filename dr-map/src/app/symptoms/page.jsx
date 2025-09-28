"use client";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import SymptomDisplay from "./components/symptom-display";
import { fetchDiagnosis } from "@/lib/diagnosisApi";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export default function SymptomsPage() {
  const router = useRouter();
  const displayRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const handleBeginMapping = async () => {
    // getSymptoms() returns all non-empty values and trims the trailing empty row
    const symptoms = displayRef.current?.getSymptoms?.() ?? [];
    console.log(symptoms);

    // Start loading state
    setIsLoading(true);
    setLoadingProgress(10);

    try {
      // Simulate progress updates
      setLoadingProgress(30);

      // send to Flask
      const data = await fetchDiagnosis(symptoms);
      console.log("Flask response:", data);

      setLoadingProgress(70);

      // Pass data to graph page via URL parameters (encoded)
      const encodedData = encodeURIComponent(JSON.stringify(data));

      setLoadingProgress(90);

      // Small delay to show completion
      setTimeout(() => {
        setLoadingProgress(100);
        router.push(`/graph?data=${encodedData}`);
      }, 200);
    } catch (error) {
      console.error("Error fetching diagnosis:", error);
      setIsLoading(false);
      setLoadingProgress(0);
      // Still navigate to graph page with just symptoms if API fails
      // const fallbackData = { allSymptoms: symptoms, diseases: [], tests: [] };
      // const encodedData = encodeURIComponent(JSON.stringify(fallbackData));
      // router.push(`/graph?data=${encodedData}`);
    }
  };

  return (
    <div className="w-full">
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-center font-bold text-3xl">
            Add Patient Symptoms
          </h1>

          {!isLoading ? (
            <>
              <SymptomDisplay ref={displayRef} />
              <Button className="mt-6" onClick={handleBeginMapping}>
                Begin Mapping
              </Button>
            </>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">
                  Analyzing symptoms...
                </h2>
                <p className="text-gray-600 mb-4">
                  Please wait while we process your data
                </p>
                <Progress
                  value={loadingProgress}
                  className="w-full max-w-md mx-auto [&>*]:bg-[#6366f1]"
                />

                <p className="text-sm text-gray-500 mt-2">
                  {loadingProgress}% complete
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
