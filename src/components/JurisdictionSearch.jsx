"use client";

import React, { useState, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export function JurisdictionSearch({ value, onChange, defaultValue }) {
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchJurisdictions = useCallback(
    async (searchTerm) => {
      setInputValue(searchTerm);
      if (!searchTerm || searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();

        console.log("API Response:", data);

        if (data.predictions) {
          const formattedResults = data.predictions.map((prediction) => ({
            value: prediction.place_id,
            label: prediction.description,
          }));
          setSearchResults(formattedResults);
        }
      } catch (error) {
        console.error("Error fetching jurisdictions:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? value : defaultValue || "Select jurisdiction..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search jurisdictions..."
            value={inputValue}
            onValueChange={searchJurisdictions}
          />
          <ScrollArea className="max-h-[300px] overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {searchResults.map((result) => (
                  <CommandItem
                    key={result.value}
                    onSelect={() => {
                      onChange(result.label);
                      setInputValue(result.label);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === result.label ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {result.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}