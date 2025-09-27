"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


export default function SymptomCard({ id, onAdd, onRemove }) {
  const [value, setValue] = useState("");
  const [added, setAdded] = useState(false);

  const add = () => {
    const text = value.trim();
    if (!text) return;
    setAdded(true);
    onAdd(id, text); // parent stores it (not shown in UI)
  };

  const remove = () => {
    onRemove(id); // parent removes it from internal list + unmounts this card
  };

  return (
    <span className="w-full flex px-2">
      <Input
        type="text"
        className="w-11/12 border px-2 py-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={added}
        placeholder="Add a symptom…"
      />

      <div className="w-1/12 h-auto flex justify-end">
        {added ? (
          <Button variant="destructive"
            className="w-1/2"
            onClick={remove}
          >
            -
          </Button>
        ) : (
          <Button variant="secondary"
            className="w-1/2 "
            onClick={add}
            disabled={!value.trim()}
          >
            +
          </Button>
        )}
      </div>
      
    </span>
  );
}