"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SuggestionPopup({ position, onSubmit, onClose }) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(prompt);
    setPrompt("");
  };

  return (
    <div
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full p-2 border rounded-md mb-2 dark:bg-gray-700"
          placeholder="How would you like to improve this section?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!prompt.trim()}>
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}
