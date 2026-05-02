"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import { useState } from "react";
import { useGeocoding } from "@/hooks/useGeocoding";
import type { Coordinates, GeocodingResult } from "@/lib/types";

type SearchBarProps = {
  destinationLabel: string;
  error?: string | null;
  proximity?: Coordinates | null;
  suggestionsPlacement?: "above" | "below";
  onFocus?: () => void;
  onDestinationLabelChange: (value: string) => void;
  onDestinationSelect: (result: GeocodingResult) => void;
  onDestinationCoordinatesChange: (coordinates: Coordinates | null) => void;
};

export function SearchBar({
  destinationLabel,
  error,
  proximity,
  suggestionsPlacement = "above",
  onFocus,
  onDestinationLabelChange,
  onDestinationSelect,
  onDestinationCoordinatesChange,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const destinationSearch = useGeocoding(
    isFocused ? destinationLabel : "",
    proximity,
  );

  function handleResultClick(result: GeocodingResult) {
    onDestinationSelect(result);
    setIsFocused(false);
  }

  function handleFocus() {
    setIsFocused(true);
    onFocus?.();
  }

  const suggestionsClassName =
    suggestionsPlacement === "below"
      ? "relative z-40 mt-2 max-h-[42vh] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-md"
      : "absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-40 max-h-[42vh] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-md";

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="rounded-2xl border border-border/60 bg-card/95 p-2 text-foreground shadow-2xl backdrop-blur-md transition-all duration-300 ease-out">
          <label className="flex min-h-12 items-center gap-3 rounded-xl bg-muted/40 px-3">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <input
              value={destinationLabel}
              onChange={(event) => {
                onDestinationLabelChange(event.target.value);
                onDestinationCoordinatesChange(null);
                setIsFocused(true);
              }}
              onFocus={handleFocus}
              placeholder="Para onde?"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {destinationLabel && (
              <button
                type="button"
                onClick={() => {
                  onDestinationLabelChange("");
                  onDestinationCoordinatesChange(null);
                }}
                className="rounded-full p-1 text-muted-foreground transition-all duration-300 ease-out hover:bg-muted/50 hover:text-foreground"
                aria-label="Clear destination"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        {isFocused &&
          (destinationSearch.suggestions.length > 0 ||
            destinationSearch.isLoading) && (
            <div className={suggestionsClassName}>
              {destinationSearch.isLoading && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching Portugal
                </div>
              )}
              {destinationSearch.suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.id}
                  onClick={() => handleResultClick(suggestion)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-all duration-300 ease-out hover:bg-muted/50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">
                      {suggestion.text}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {suggestion.place_name}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
      </div>

      {(destinationSearch.error || error) && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/15 px-3 py-2 text-xs text-destructive">
          {destinationSearch.error ?? error}
        </p>
      )}
    </div>
  );
}
