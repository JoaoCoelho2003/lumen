"use client";

import { useEffect, useRef, useState } from "react";
import { MAPBOX_TOKEN } from "@/lib/constants";
import type {
  Coordinates,
  GeocodingResult,
} from "@/lib/types";

type GeocodingState = {
  suggestions: GeocodingResult[];
  isLoading: boolean;
  error: string | null;
};

const CACHE_LIMIT = 20;
const SEARCH_RESULT_LIMIT = 10;
const SEARCH_TYPES = [
  "poi",
  "address",
  "street",
  "place",
  "locality",
  "neighborhood",
  "district",
  "postcode",
  "region",
].join(",");

type SearchBoxFeature = {
  geometry?: {
    coordinates?: Coordinates;
  };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
    };
  };
};

type SearchBoxResponse = {
  features?: SearchBoxFeature[];
  message?: string;
};

function formatSearchBoxPlaceName(feature: SearchBoxFeature) {
  const name = feature.properties?.name ?? "";
  const fullAddress = feature.properties?.full_address;
  const placeFormatted = feature.properties?.place_formatted;

  if (fullAddress) {
    return fullAddress;
  }

  return [name, placeFormatted].filter(Boolean).join(", ");
}

function searchBoxFeatureToResult(feature: SearchBoxFeature) {
  const longitude =
    feature.properties?.coordinates?.longitude ??
    feature.geometry?.coordinates?.[0];
  const latitude =
    feature.properties?.coordinates?.latitude ??
    feature.geometry?.coordinates?.[1];
  const name = feature.properties?.name;

  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !name
  ) {
    return null;
  }

  return {
    id: feature.properties?.mapbox_id ?? `${name}-${longitude}-${latitude}`,
    place_name: formatSearchBoxPlaceName(feature),
    center: [longitude, latitude] as Coordinates,
    text: name,
  } satisfies GeocodingResult;
}

export function useGeocoding(
  query: string,
  proximity?: Coordinates | null,
): GeocodingState {
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

    const proximityKey = proximity?.join(",") ?? "ip";
    const cacheKey = `${trimmedQuery.toLowerCase()}|${proximityKey}`;
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
          limit: String(SEARCH_RESULT_LIMIT),
          proximity: proximityKey,
          types: SEARCH_TYPES,
          auto_complete: "true",
          q: trimmedQuery,
        });
        const response = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/forward?${params.toString()}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as SearchBoxResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "Search failed. Try again.");
        }

        const nextSuggestions =
          data.features
            ?.map(searchBoxFeatureToResult)
            .filter((result): result is GeocodingResult => result !== null) ??
          [];

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
  }, [proximity, query]);

  return { suggestions, isLoading, error };
}
