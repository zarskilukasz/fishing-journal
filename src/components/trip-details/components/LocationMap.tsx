/**
 * LocationMap - Interactive Google Map showing trip location.
 * Uses @vis.gl/react-google-maps for rendering.
 */
import React from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import type { LocationMapProps } from "../types";

const GOOGLE_MAPS_API_KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_MAP_ID = import.meta.env.PUBLIC_GOOGLE_MAPS_MAP_ID;

/**
 * Google Map component with marker at the specified location.
 */
export function LocationMap({ lat, lng, label }: LocationMapProps) {
  const position = { lat, lng };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="h-48 w-full rounded-lg overflow-hidden border border-border">
        <Map
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultZoom={13}
          defaultCenter={position}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          className="h-full w-full"
        >
          <AdvancedMarker position={position} title={label ?? "Lokalizacja wyprawy"}>
            <Pin background="#0070f3" borderColor="#0050a0" glyphColor="#ffffff" />
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
}
