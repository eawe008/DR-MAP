"use client";
import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import SymptomCard from "./symptom-card";

const SymptomDisplay = forwardRef(function SymptomDisplay(_, ref) {
  // Each card is tracked centrally so typing updates the store immediately
  const [cards, setCards] = useState([{ id: 1, value: "", added: false }]);
  const nextId = useRef(2);

  const ensureOneBlankAtEnd = (list) => {
    const last = list[list.length - 1];
    const hasBlankAtEnd = last && !last.added && last.value.trim() === "";
    return hasBlankAtEnd ? list : [...list, { id: nextId.current++, value: "", added: false }];
  };

  const handleChange = (id, value) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  // "+" commits the row and spawns a new blank
  const handleCommit = (id) => {
    setCards((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, added: true } : c));
      return ensureOneBlankAtEnd(updated);
    });
  };

  // "-" removes the row (committed or not); still keep one blank at end
  const handleRemove = (id) => {
    setCards((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) return [{ id: nextId.current++, value: "", added: false }];
      return ensureOneBlankAtEnd(updated);
    });
  };

  // Expose a getter for the parent
  useImperativeHandle(ref, () => ({
    getSymptoms: () => {
      // Build list of all non-empty values (includes last typed even if not "+")
      const list = cards.map((c) => c.value.trim()).filter(Boolean);

      // Trim trailing empty placeholder for cleanliness when user begins mapping
      setCards((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (!last.added && last.value.trim() === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });

      return list;
    },
  }));

  return (
    <div className="mt-6 space-y-2">
      {cards.map((c) => (
        <SymptomCard
          key={c.id}
          id={c.id}
          value={c.value}
          added={c.added}
          onChange={handleChange}
          onCommit={handleCommit}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
});

export default SymptomDisplay;