/**
 * LocationPickerMap - Interactive Google Map for selecting a location.
 * Users can click on the map to place a marker or drag the marker to adjust.
 */
import React, { useCallback, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import type { MapMouseEvent } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_MAP_ID = import.meta.env.PUBLIC_GOOGLE_MAPS_MAP_ID;

// Default center - Poland (Warsaw)
const DEFAULT_CENTER = { lat: 52.2297, lng: 21.0122 };
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 13;

export interface LocationPickerMapProps {
  /** Current selected location (if any) */
  value: { lat: number; lng: number } | null;
  /** Callback when location is selected/changed */
  onChange: (location: { lat: number; lng: number } | null) => void;
  /** Callback when user confirms selection */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Inner map component that handles click events
 */
function MapWithClickHandler({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (location: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (event.detail.latLng) {
        const newLocation = {
          lat: event.detail.latLng.lat,
          lng: event.detail.latLng.lng,
        };
        onChange(newLocation);
      }
    },
    [onChange]
  );

  const handleMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        onChange({
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        });
      }
    },
    [onChange]
  );

  // Determine center and zoom based on whether we have a value
  const center = value ?? DEFAULT_CENTER;
  const zoom = value ? SELECTED_ZOOM : DEFAULT_ZOOM;

  return (
    <Map
      mapId={GOOGLE_MAPS_MAP_ID}
      defaultZoom={zoom}
      defaultCenter={center}
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl={true}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      className="h-full w-full"
      onClick={handleMapClick}
    >
      {value && (
        <AdvancedMarker
          position={value}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
          title="Przeciągnij aby dopasować lokalizację"
        >
          <Pin background="#0070f3" borderColor="#0050a0" glyphColor="#ffffff" />
        </AdvancedMarker>
      )}
    </Map>
  );
}

/**
 * Location picker with interactive Google Map.
 * Allows clicking to set location and dragging marker to adjust.
 */
export function LocationPickerMap({ value, onChange, onConfirm, onCancel }: LocationPickerMapProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Instructions */}
      <div className="bg-secondary/50 px-4 py-3 border-b border-border">
        <p className="text-sm text-muted-foreground">
          {value ? (
            <>
              <span className="text-foreground font-medium">Lokalizacja wybrana.</span> Przeciągnij marker aby dopasować
              lub kliknij w inne miejsce.
            </>
          ) : (
            "Kliknij na mapę aby wybrać lokalizację."
          )}
        </p>
        {value && (
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </p>
        )}
      </div>

      {/* Map container */}
      <div className="flex-1 min-h-[300px]">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <MapWithClickHandler value={value} onChange={onChange} />
        </APIProvider>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 p-4 border-t border-border bg-card">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="button" onClick={onConfirm} disabled={!value}>
          Zatwierdź lokalizację
        </Button>
      </div>
    </div>
  );
}
