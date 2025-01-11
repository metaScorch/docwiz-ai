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
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response type from API");
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.predictions) {
          const formattedResults = data.predictions.map((prediction) => ({
            value: prediction.place_id,
            label: prediction.description,
            placeId: prediction.place_id
          }));
          setSearchResults(formattedResults);
        } else {
          setSearchResults([]);
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

  const getPlaceDetails = async (placeId) => {
    try {
      const response = await fetch(`/api/places/details?place_id=${placeId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        const text = await response.text();
        console.error('Raw response:', text);
        throw new Error('Invalid JSON response from API');
      }
      
      if (!data || !data.result) {
        throw new Error('Invalid data structure from API');
      }

      return data.result;
    } catch (error) {
      console.error("Error fetching place details:", error);
      // Return a minimal valid structure
      return {
        address_components: [],
        formatted_address: value || defaultValue,
        place_id: placeId
      };
    }
  };

  const handleSelect = async (result) => {
    try {
      setIsLoading(true);
      const placeDetails = await getPlaceDetails(result.placeId);
      onChange(result.label); // Simplified to just pass the label
      setInputValue(result.label);
      setOpen(false);
    } catch (error) {
      console.error('Error handling selection:', error);
      // Still update the UI even if details fetch fails
      onChange(result.label);
      setInputValue(result.label);
      setOpen(false);
    } finally {
      setIsLoading(false);
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
                    onSelect={() => handleSelect(result)}
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