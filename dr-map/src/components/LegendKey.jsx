"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function LegendDot({ label, bg = "#e2e8f0", border = "#334155" }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-full border shrink-0"
        style={{
          width: 28,
          height: 28,
          background: bg,
          borderColor: border,
          fontSize: 14,
          lineHeight: "1",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function LegendKey() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Legend</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="py-3">
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <LegendDot label="S" />
            <div>
              <div className="font-medium">Symptom node</div>
              <div className="text-muted-foreground">
                Represents the patient’s current symptoms.
              </div>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <LegendDot label="D" />
            <div>
              <div className="font-medium">Diagnosis node</div>
              <div className="text-muted-foreground">
                Possible condition with confidence estimate.
              </div>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <LegendDot label="T" />
            <div>
              <div className="font-medium">Test node</div>
              <div className="text-muted-foreground">
                Next recommended investigation.
              </div>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
