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
    // (optional) navigate first
    router.push("/graph");
    // send to Flask
    const data = await fetchDiagnosis(symptoms);
    console.log("Flask response:", data);
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