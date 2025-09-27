"use client";
import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import SymptomCard from "./symptom-card";

const SymptomDisplay = forwardRef(function SymptomDisplay(_, ref) {
  // Rendered cards (ids only). Always keep one blank card.
  const [cards, setCards] = useState([{ id: 1 }]);
  const nextId = useRef(2);

  // Internal symptom store (not displayed)
  const [symptoms, setSymptoms] = useState([]); // [{ id, text }]

  // Expose a getter to the parent
  useImperativeHandle(ref, () => ({
    getSymptoms: () => symptoms.map((s) => s.text), // return just strings
    // if you prefer full objects later: () => [...symptoms]
  }));

  const handleAdd = (id, text) => {
    setSymptoms((prev) => [...prev, { id, text }]);
    setCards((prev) => [...prev, { id: nextId.current++ }]); // always keep a blank
  };

  const handleRemove = (id) => {
    setCards((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      return updated.length ? updated : [{ id: nextId.current++ }];
    });
    setSymptoms((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mt-6 space-y-2">
      {cards.map((c) => (
        <SymptomCard
          key={c.id}
          id={c.id}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
});

export default SymptomDisplay;