import React from "react";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "cmdk";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function JurisdictionSearch({ value, onChange, defaultValue }) {
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const searchJurisdictions = async (searchTerm) => {
    console.log('Searching for:', searchTerm);
    setInputValue(searchTerm);
    if (!searchTerm || searchTerm.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(searchTerm)}`
      );
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.predictions) {
        const formattedResults = data.predictions.map(prediction => ({
          value: prediction.description,
          label: prediction.description
        }));
        console.log('Formatted Results:', formattedResults);
        setSearchResults(formattedResults);
      }
    } catch (error) {
      console.error("Error fetching jurisdictions:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value
            ? value
            : defaultValue || "Select jurisdiction..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search jurisdictions..." 
            value={inputValue}
            onValueChange={searchJurisdictions}
          />
          {searchResults.length === 0 ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <CommandGroup>
              {searchResults.map((result) => (
                <CommandItem
                  key={result.value}
                  onSelect={() => {
                    onChange(result.value);
                    setOpen(false);
                  }}
                >
                  {result.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
