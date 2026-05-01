"use client";

import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { useState } from "react";
import { useGeocoding } from "@/hooks/useGeocoding";
import type { Coordinates, GeocodingResult } from "@/lib/types";

type SearchBarProps = {
  originLabel: string;
  destinationLabel: string;
  onOriginLabelChange: (value: string) => void;
  onDestinationLabelChange: (value: string) => void;
  onOriginSelect: (result: GeocodingResult) => void;
  onDestinationSelect: (result: GeocodingResult) => void;
  onOriginCoordinatesChange: (coordinates: Coordinates | null) => void;
  onDestinationCoordinatesChange: (coordinates: Coordinates | null) => void;
  onUseMyLocation: (coordinates: Coordinates, label: string) => void;
};

type ActiveInput = "origin" | "destination" | null;

export function SearchBar({
  originLabel,
  destinationLabel,
  onOriginLabelChange,
  onDestinationLabelChange,
  onOriginSelect,
  onDestinationSelect,
  onOriginCoordinatesChange,
  onDestinationCoordinatesChange,
  onUseMyLocation,
}: SearchBarProps) {
  const [activeInput, setActiveInput] = useState<ActiveInput>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const originSearch = useGeocoding(activeInput === "origin" ? originLabel : "");
  const destinationSearch = useGeocoding(
    activeInput === "destination" ? destinationLabel : "",
  );
  const activeSearch = activeInput === "origin" ? originSearch : destinationSearch;

  function handleResultClick(result: GeocodingResult) {
    if (activeInput === "origin") {
      onOriginSelect(result);
    }

    if (activeInput === "destination") {
      onDestinationSelect(result);
    }

    setActiveInput(null);
  }

  function handleMyLocation() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
      return;
    }

    if (!window.isSecureContext) {
      setLocationError("GPS requires HTTPS on mobile browsers. Use HTTPS or test on localhost.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (location) => {
        onUseMyLocation(
          [location.coords.longitude, location.coords.latitude],
          "A minha localização",
        );
        setIsLocating(false);
      },
      () => {
        setLocationError("Could not get your location. Check browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="rounded-2xl border border-white/10 bg-[#0f1117]/95 p-3 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out">
          <div className="grid gap-2">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-3">
              <Crosshair className="h-5 w-5 shrink-0 text-emerald-400" />
              <input
                value={originLabel}
                onChange={(event) => {
                  onOriginLabelChange(event.target.value);
                  onOriginCoordinatesChange(null);
                  setActiveInput("origin");
                }}
                onFocus={() => setActiveInput("origin")}
                placeholder="Origem"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
              {originLabel ? (
                <button
                  type="button"
                  onClick={() => {
                    onOriginLabelChange("");
                    onOriginCoordinatesChange(null);
                  }}
                  className="rounded-full p-1 text-slate-400 transition-all duration-300 ease-out hover:bg-white/10 hover:text-white"
                  aria-label="Clear origin"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleMyLocation}
                className="rounded-full p-1.5 text-blue-300 transition-all duration-300 ease-out hover:bg-blue-500/20 hover:text-blue-100"
                aria-label="Use my location"
                title="My location"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
              </button>
            </label>

            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-3">
              <Search className="h-5 w-5 shrink-0 text-blue-400" />
              <input
                value={destinationLabel}
                onChange={(event) => {
                  onDestinationLabelChange(event.target.value);
                  onDestinationCoordinatesChange(null);
                  setActiveInput("destination");
                }}
                onFocus={() => setActiveInput("destination")}
                placeholder="Destino"
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
        </div>

        {activeInput && (activeSearch.suggestions.length > 0 || activeSearch.isLoading) ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1117]/95 shadow-2xl backdrop-blur-md">
            {activeSearch.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching Portugal
              </div>
            ) : null}
            {activeSearch.suggestions.map((suggestion) => (
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

      {originSearch.error || destinationSearch.error || locationError ? (
        <p className="rounded-xl border border-red-400/30 bg-red-950/60 px-3 py-2 text-xs text-red-100">
          {originSearch.error ?? destinationSearch.error ?? locationError}
        </p>
      ) : null}
    </div>
  );
}
