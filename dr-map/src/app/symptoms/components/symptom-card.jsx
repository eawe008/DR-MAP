"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SymptomCard({
  id,
  value,
  added,
  onChange,
  onCommit,
  onRemove,
}) {
  return (
    <span className="w-full flex px-2">
      <Input
        type="text"
        className="w-11/12 border px-2 py-1"
        value={value}
        onChange={(e) => onChange(id, e.target.value)} // ← updates store as you type
        disabled={added}
        placeholder="Add a symptom…"
      />
      <div className="w-1/12 h-auto flex justify-end">
        {added ? (
          <Button
            variant="destructive"
            className="w-1/2"
            onClick={() => onRemove(id)}
          >
            -
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-1/2"
            onClick={() => onCommit(id)} // ← commit & spawn next
            disabled={!value.trim()}
          >
            +
          </Button>
        )}
      </div>
    </span>
  );
}
