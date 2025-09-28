"use client"

import * as React from "react"

import { Progress } from "@/components/ui/progress";


export function ProgressDemo() {
  const [progress, setProgress] = React.useState(13)

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return <Progress value={progress} className="w-[60%]" />
}

// Default export for Next.js loading page
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-4">Loading diagnostic map...</h2>
        <ProgressDemo />
      </div>
    </div>
  )
}
