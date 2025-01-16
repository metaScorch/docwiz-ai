import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format as dateFormat } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Sidebar({ documentValues, onValueChange }) {
  const [openCalendars, setOpenCalendars] = useState({});

  const totalFields = documentValues ? Object.keys(documentValues).length : 0;
  const filledFields = documentValues
    ? Object.values(documentValues).filter((field) => field.value).length
    : 0;

  const hasValues = documentValues && Object.keys(documentValues).length > 0;

  if (!hasValues) {
    return (
      <div className="w-80 border-l p-4">
        <p className="text-sm text-muted-foreground text-center">
          No document fields available
        </p>
      </div>
    );
  }

  const renderInput = (name, field) => {
    const format = field.format || { type: "text" };

    switch (format.type) {
      case "date":
        return (
          <Popover
            open={openCalendars[name]}
            onOpenChange={(open) =>
              setOpenCalendars((prev) => ({
                ...prev,
                [name]: open,
              }))
            }
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !field.value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value
                  ? dateFormat(new Date(field.value), "MM-dd-yyyy")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => {
                  const formattedDate = date
                    ? dateFormat(date, "MM-dd-yyyy")
                    : "";
                  onValueChange(name, formattedDate);
                  setOpenCalendars((prev) => ({
                    ...prev,
                    [name]: false,
                  }));
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "number":
        return (
          <Input
            id={name}
            type="number"
            value={field.value || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (format.pattern) {
                const regex = new RegExp(format.pattern);
                if (value === "" || regex.test(value)) {
                  onValueChange(name, value);
                }
              } else {
                onValueChange(name, value);
              }
            }}
            placeholder={`Enter ${name.toLowerCase().replace(/_/g, " ")}`}
            className="bg-background"
          />
        );

      default:
        return (
          <Input
            id={name}
            type={format.type === "email" ? "email" : "text"}
            value={field.value || ""}
            onChange={(e) => onValueChange(name, e.target.value)}
            placeholder={`Enter ${name.toLowerCase().replace(/_/g, " ")}`}
            className="bg-background"
          />
        );
    }
  };

  const getFormatHint = (format) => {
    if (!format) return null;

    switch (format.type) {
      case "date":
        return "Select a date from the calendar (MM-DD-YYYY)";
      case "number":
        return format.pattern
          ? `Must match pattern: ${format.pattern}`
          : "Enter a number";
      case "email":
        return "Enter a valid email address";
      case "phone":
        return "Enter a phone number";
      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l bg-muted/10">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Document Fields</h2>
        <p className="text-sm text-muted-foreground">
          Fill in the values for the placeholders in your document
        </p>
        <div className="mt-2 text-sm">
          <span
            className={`font-medium ${filledFields === totalFields ? "text-green-500" : "text-amber-500"}`}
          >
            {filledFields}/{totalFields} fields completed
          </span>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-4 space-y-6">
          {Object.entries(documentValues).map(([name, field]) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name} className="text-sm font-medium">
                {name
                  .replace(/_/g, " ")
                  .split(" ")
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  )
                  .join(" ")}
              </Label>

              {renderInput(name, field)}

              {field.description && (
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}

              {field.format && getFormatHint(field.format) && (
                <p className="text-xs text-blue-500">
                  {getFormatHint(field.format)}
                </p>
              )}

              {field.signer && (
                <p className="text-xs text-amber-500">
                  This field represents a signing party
                </p>
              )}
            </div>
          ))}
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
