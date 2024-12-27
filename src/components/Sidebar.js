import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Sidebar({ documentValues, onValueChange }) {
  const hasValues = documentValues && Object.keys(documentValues).length > 0;

  console.log("Sidebar received values:", documentValues);

  if (!hasValues) {
    return (
      <div className="w-80 border-l p-4">
        <p className="text-sm text-muted-foreground text-center">
          No document fields available
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-muted/10">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Document Fields</h2>
        <p className="text-sm text-muted-foreground">
          Fill in the values for the placeholders in your document
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-4 space-y-6">
          {Object.entries(documentValues).map(([name, field]) => {
            console.log("Rendering field:", name, field);
            return (
              <div key={name} className="space-y-2">
                <Label htmlFor={name} className="text-sm font-medium">
                  {name
                    .replace(/_/g, " ")
                    .split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(" ")}
                </Label>

                <Input
                  id={name}
                  value={field.value || ""}
                  onChange={(e) => {
                    console.log("Input change:", name, e.target.value);
                    onValueChange(name, e.target.value);
                  }}
                  placeholder={`Enter ${name.toLowerCase().replace(/_/g, " ")}`}
                  className="bg-background"
                />

                {field.description && (
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Changes are automatically saved and updated in the document
        </p>
      </div>
    </div>
  );
}
