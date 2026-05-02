"use client";

import { CircleOff, Flame, Layers, Lightbulb, Map } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type LayerTogglesProps = {
  satelliteEnabled: boolean;
  heatmapEnabled: boolean;
  lightingEnabled: boolean;
  onSatelliteToggle: () => void;
  onHeatmapToggle: () => void;
  onLightingToggle: () => void;
};

export function LayerToggles({
  satelliteEnabled,
  heatmapEnabled,
  lightingEnabled,
  onSatelliteToggle,
  onHeatmapToggle,
  onLightingToggle,
}: LayerTogglesProps) {
  const activeLayer = satelliteEnabled
    ? "satellite"
    : heatmapEnabled
      ? "heatmap"
      : lightingEnabled
        ? "lighting"
        : "none";

  const handleLayerChange = (value: string) => {
    if (value === "none") {
      if (satelliteEnabled) onSatelliteToggle();
      if (heatmapEnabled) onHeatmapToggle();
      if (lightingEnabled) onLightingToggle();
      return;
    }

    if (value === "satellite" && !satelliteEnabled) {
      onSatelliteToggle();
    }

    if (value === "heatmap" && !heatmapEnabled) {
      onHeatmapToggle();
    }

    if (value === "lighting" && !lightingEnabled) {
      onLightingToggle();
    }

    if (value !== "satellite" && satelliteEnabled) onSatelliteToggle();
    if (value !== "heatmap" && heatmapEnabled) onHeatmapToggle();
    if (value !== "lighting" && lightingEnabled) onLightingToggle();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-card/95 text-foreground shadow-2xl backdrop-blur-md transition-all duration-300 ease-out hover:bg-muted/40"
          aria-label="Open layer options"
          title="Layers"
        >
          <Layers className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="rounded-2xl w-fit p-0! min-w-0 border border-border/60 bg-card/95 text-foreground shadow-2xl backdrop-blur-md"
        sideOffset={10}
      >
        <DropdownMenuLabel className="sr-only">Map layers</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeLayer}
          onValueChange={handleLayerChange}
        >
          <DropdownMenuRadioItem
            value="none"
            className="flex h-11 w-11 items-center justify-center rounded-xl p-3 text-muted-foreground transition-all duration-300 ease-out data-[state=checked]:bg-muted/60 data-[state=checked]:text-foreground hover:bg-muted/50 hover:text-foreground focus:bg-muted/60 focus:text-foreground [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            title="None"
          >
            <CircleOff className="h-5 w-5" />
            <span className="sr-only">None</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="satellite"
            className="flex h-11 w-11 items-center justify-center rounded-xl p-3 text-muted-foreground transition-all duration-300 ease-out data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground hover:bg-muted/50 hover:text-foreground focus:bg-muted/60 focus:text-foreground [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            title="Satellite"
          >
            <Map className="h-5 w-5" />
            <span className="sr-only">Satellite</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="heatmap"
            className="flex h-11 w-11 items-center justify-center rounded-xl p-3 text-muted-foreground transition-all duration-300 ease-out data-[state=checked]:bg-muted/60 data-[state=checked]:text-foreground hover:bg-muted/50 hover:text-foreground focus:bg-muted/60 focus:text-foreground [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            title="Heatmap"
          >
            <Flame className="h-5 w-5" />
            <span className="sr-only">Heatmap</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="lighting"
            className="flex h-11 w-11 items-center justify-center rounded-xl p-3 text-muted-foreground transition-all duration-300 ease-out data-[state=checked]:bg-muted/60 data-[state=checked]:text-foreground hover:bg-muted/50 hover:text-foreground focus:bg-muted/60 focus:text-foreground [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            title="Lighting"
          >
            <Lightbulb className="h-5 w-5" />
            <span className="sr-only">Lighting</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
