"use client";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import SymptomDisplay from "./components/symptom-display";
import { fetchDiagnosis } from "@/lib/diagnosisApi";
import { useRouter } from "next/navigation";

export default function SymptomsPage() {
  const router = useRouter();
  const displayRef = useRef(null);

  const handleBeginMapping = async () => {
    // getSymptoms() returns all non-empty values and trims the trailing empty row
    const symptoms = displayRef.current?.getSymptoms?.() ?? [];
    console.log(symptoms)
    
    try {
      // send to Flask
      const data = await fetchDiagnosis(symptoms);
      console.log("Flask response:", data);
      
      // Pass data to graph page via URL parameters (encoded)
      const encodedData = encodeURIComponent(JSON.stringify(data));
      router.push(`/graph?data=${encodedData}`);
    } catch (error) {
      console.error("Error fetching diagnosis:", error);
      // Still navigate to graph page with just symptoms if API fails
      // const fallbackData = { allSymptoms: symptoms, diseases: [], tests: [] };
      // const encodedData = encodeURIComponent(JSON.stringify(fallbackData));
      // router.push(`/graph?data=${encodedData}`);
    }
  };

  return (
    <div className="w-full">
      <div className="w-1/2 h-screen m-auto flex items-center">
        <div className="flex flex-col w-full">
          <h1 className="text-center font-bold text-3xl">Add Patient Symptoms</h1>
          <SymptomDisplay ref={displayRef} />
          <Button className="mt-6" onClick={handleBeginMapping}>
            Begin Mapping
          </Button>
        </div>
      </div>
    </div>
  );
}