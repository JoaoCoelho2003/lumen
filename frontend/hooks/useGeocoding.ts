"use client";

import { useEffect, useRef, useState } from "react";
import { MAPBOX_TOKEN } from "@/lib/constants";
import type { GeocodingResult, MapboxGeocodingResponse } from "@/lib/types";

type GeocodingState = {
  suggestions: GeocodingResult[];
  isLoading: boolean;
  error: string | null;
};

const CACHE_LIMIT = 20;

export function useGeocoding(query: string): GeocodingState {
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, GeocodingResult[]>>(new Map());

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      const reset = window.setTimeout(() => {
        setSuggestions([]);
        setIsLoading(false);
        setError(null);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    if (!MAPBOX_TOKEN) {
      const reset = window.setTimeout(() => {
        setSuggestions([]);
        setError("Configure NEXT_PUBLIC_MAPBOX_TOKEN to search places.");
        setIsLoading(false);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    const cacheKey = trimmedQuery.toLowerCase();
    const cachedSuggestions = cacheRef.current.get(cacheKey);

    if (cachedSuggestions) {
      const reset = window.setTimeout(() => {
        setSuggestions(cachedSuggestions);
        setError(null);
        setIsLoading(false);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    const controller = new AbortController();
    const debounce = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          country: "pt",
          language: "pt",
          limit: "5",
        });
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            trimmedQuery,
          )}.json?${params.toString()}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as MapboxGeocodingResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "Search failed. Try again.");
        }

        const nextSuggestions =
          data.features?.map((feature) => ({
            id: feature.id,
            place_name: feature.place_name,
            center: feature.center,
            text: feature.text,
            context: feature.context,
          })) ?? [];

        const cache = cacheRef.current;
        cache.set(cacheKey, nextSuggestions);

        if (cache.size > CACHE_LIMIT) {
          const oldestKey = cache.keys().next().value;

          if (oldestKey) {
            cache.delete(oldestKey);
          }
        }

        setSuggestions(nextSuggestions);
      } catch (searchError) {
        if (
          searchError instanceof DOMException &&
          searchError.name === "AbortError"
        ) {
          return;
        }

        setSuggestions([]);
        setError(
          searchError instanceof Error ? searchError.message : "Search failed.",
        );
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(debounce);
      controller.abort();
    };
  }, [query]);

  return { suggestions, isLoading, error };
}
