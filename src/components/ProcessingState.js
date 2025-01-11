import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export function ProcessingState({ state, progress }) {
  const states = {
    uploading: {
      title: "Uploading Document",
      description: "Uploading your PDF file...",
    },
    processing: {
      title: "Processing Document",
      description: "Converting your PDF to an editable format...",
    },
    analyzing: {
      title: "Analyzing Content",
      description: "Preparing your document for editing...",
    },
    failed: {
      title: "Processing Failed",
      description: "There was an error processing your document.",
    },
  };

  const currentState = states[state];

  return (
    <Card className="w-[450px]">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <h3 className="font-semibold text-lg mb-2">{currentState.title}</h3>
            <p className="text-sm text-muted-foreground">
              {currentState.description}
            </p>
          </div>
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground text-right">
              {progress}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
