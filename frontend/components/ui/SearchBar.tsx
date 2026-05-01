"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import { useState } from "react";
import { useGeocoding } from "@/hooks/useGeocoding";
import type { Coordinates, GeocodingResult } from "@/lib/types";

type SearchBarProps = {
  destinationLabel: string;
  error?: string | null;
  suggestionsPlacement?: "above" | "below";
  onFocus?: () => void;
  onDestinationLabelChange: (value: string) => void;
  onDestinationSelect: (result: GeocodingResult) => void;
  onDestinationCoordinatesChange: (coordinates: Coordinates | null) => void;
};

export function SearchBar({
  destinationLabel,
  error,
  suggestionsPlacement = "above",
  onFocus,
  onDestinationLabelChange,
  onDestinationSelect,
  onDestinationCoordinatesChange,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const destinationSearch = useGeocoding(isFocused ? destinationLabel : "");

  function handleResultClick(result: GeocodingResult) {
    onDestinationSelect(result);
    setIsFocused(false);
  }

  function handleFocus() {
    setIsFocused(true);
    onFocus?.();
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-[#0f1117]/95 p-2 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out">
          <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-3">
            <Search className="h-5 w-5 shrink-0 text-blue-400" />
            <input
              value={destinationLabel}
              onChange={(event) => {
                onDestinationLabelChange(event.target.value);
                onDestinationCoordinatesChange(null);
                setIsFocused(true);
              }}
              onFocus={handleFocus}
              placeholder="Para onde?"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
            {destinationLabel ? (
              <button
                type="button"
                onClick={() => {
                  onDestinationLabelChange("");
                  onDestinationCoordinatesChange(null);
                }}
                className="rounded-full p-1 text-slate-400 transition-all duration-300 ease-out hover:bg-white/10 hover:text-white"
                aria-label="Clear destination"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </div>

        {isFocused &&
        (destinationSearch.suggestions.length > 0 || destinationSearch.isLoading) ? (
          <div
            className={`absolute left-0 right-0 z-40 max-h-[42vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1117]/95 shadow-2xl backdrop-blur-md ${
              suggestionsPlacement === "below"
                ? "top-[calc(100%+0.5rem)]"
                : "bottom-[calc(100%+0.5rem)]"
            }`}
          >
            {destinationSearch.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching Portugal
              </div>
            ) : null}
            {destinationSearch.suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.id}
                onClick={() => handleResultClick(suggestion)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-all duration-300 ease-out hover:bg-white/10"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-white">{suggestion.text}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {suggestion.place_name}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {destinationSearch.error || error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-950/60 px-3 py-2 text-xs text-red-100">
          {destinationSearch.error ?? error}
        </p>
      ) : null}
    </div>
  );
}
