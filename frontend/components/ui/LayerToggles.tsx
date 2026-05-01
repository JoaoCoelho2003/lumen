"use client";

import { Flame, Lightbulb, Map } from "lucide-react";

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
  return (
    <div className="pointer-events-auto fixed left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 rounded-2xl border border-white/10 bg-[#0f1117]/95 p-2 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out">
      <button
        type="button"
        onClick={onSatelliteToggle}
        className={`rounded-xl p-3 transition-all duration-300 ease-out ${
          satelliteEnabled
            ? "bg-blue-500 text-white"
            : "text-slate-400 hover:bg-white/10 hover:text-white"
        }`}
        title="Satellite"
        aria-label="Toggle satellite map"
      >
        <Map className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onHeatmapToggle}
        className={`rounded-xl p-3 transition-all duration-300 ease-out ${
          heatmapEnabled
            ? "bg-white/10 text-slate-300"
            : "text-slate-500 hover:bg-white/10 hover:text-slate-300"
        }`}
        title="Heatmap"
        aria-label="Toggle heatmap placeholder"
      >
        <Flame className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onLightingToggle}
        className={`rounded-xl p-3 transition-all duration-300 ease-out ${
          lightingEnabled
            ? "bg-white/10 text-slate-300"
            : "text-slate-500 hover:bg-white/10 hover:text-slate-300"
        }`}
        title="Lighting"
        aria-label="Toggle lighting placeholder"
      >
        <Lightbulb className="h-5 w-5" />
      </button>
    </div>
  );
}
