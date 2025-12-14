/**
 * LocationSection - Displays trip location with interactive map.
 * Uses lazy-loaded Google Maps component.
 */
import { MapPin, ExternalLink } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import type { LocationSectionProps } from "../types";

// TODO: Uncomment when ready to use Google Maps API
// import { Suspense, lazy } from "react";
// const LocationMap = lazy(() => import("./LocationMap").then((mod) => ({ default: mod.LocationMap })));

/**
 * Placeholder for the map (used during testing to save API tokens)
 */
function MapPlaceholder({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-48 w-full rounded-lg bg-secondary border border-border flex flex-col items-center justify-center gap-2">
      <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-xs text-muted-foreground">Mapa wyłączona (tryb testowy)</p>
      <p className="text-xs text-muted-foreground font-mono">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </p>
    </div>
  );
}

/**
 * Location section with interactive Google Map.
 */
export function LocationSection({ location }: LocationSectionProps) {
  if (!location) return null;

  return (
    <section className="geist-card p-6" aria-labelledby="location-heading">
      <SectionHeader
        title="Lokalizacja"
        action={
          <a
            href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            aria-label="Otwórz w Google Maps"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Otwórz w Google Maps</span>
          </a>
        }
      />

      <div className="mt-4">
        {/* TODO: Uncomment when ready to use Google Maps API */}
        {/* <Suspense fallback={<MapPlaceholder lat={location.lat} lng={location.lng} />}>
          <LocationMap lat={location.lat} lng={location.lng} label={location.label} />
        </Suspense> */}

        {/* Placeholder for testing (comment out when enabling real map) */}
        <MapPlaceholder lat={location.lat} lng={location.lng} />

        {/* Location details below map */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {location.label && <span className="font-medium text-foreground">{location.label}</span>}
          <span>
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </span>
        </div>
      </div>
    </section>
  );
}
