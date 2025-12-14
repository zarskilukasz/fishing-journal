import { describe, it, expect } from "vitest";
import {
  formatTripDate,
  formatTimeRange,
  formatLocation,
  getStatusLabel,
  toTripCardViewModel,
  getStatusColorClass,
  formatCatchCount,
} from "./tripFormatters";
import type { TripListItemDto, TripLocationDto } from "@/types";

describe("tripFormatters", () => {
  // ---------------------------------------------------------------------------
  // formatTripDate
  // ---------------------------------------------------------------------------

  describe("formatTripDate", () => {
    it("formats date in Polish format (day month year)", () => {
      const result = formatTripDate("2025-12-14T10:00:00Z");
      expect(result).toMatch(/14 gru 2025/);
    });

    it("formats January correctly", () => {
      const result = formatTripDate("2025-01-05T10:00:00Z");
      expect(result).toMatch(/5 sty 2025/);
    });

    it("formats all months correctly", () => {
      const months = [
        { date: "2025-01-15", expected: "sty" },
        { date: "2025-02-15", expected: "lut" },
        { date: "2025-03-15", expected: "mar" },
        { date: "2025-04-15", expected: "kwi" },
        { date: "2025-05-15", expected: "maj" },
        { date: "2025-06-15", expected: "cze" },
        { date: "2025-07-15", expected: "lip" },
        { date: "2025-08-15", expected: "sie" },
        { date: "2025-09-15", expected: "wrz" },
        { date: "2025-10-15", expected: "paź" },
        { date: "2025-11-15", expected: "lis" },
        { date: "2025-12-15", expected: "gru" },
      ];

      for (const { date, expected } of months) {
        const result = formatTripDate(`${date}T10:00:00Z`);
        expect(result).toContain(expected);
      }
    });

    it("handles single-digit day without leading zero", () => {
      const result = formatTripDate("2025-06-05T10:00:00Z");
      expect(result).toMatch(/^5 /);
    });

    it("returns error message for invalid date", () => {
      const result = formatTripDate("invalid-date");
      expect(result).toBe("Nieprawidłowa data");
    });

    it("returns error message for empty string", () => {
      const result = formatTripDate("");
      expect(result).toBe("Nieprawidłowa data");
    });
  });

  // ---------------------------------------------------------------------------
  // formatTimeRange
  // ---------------------------------------------------------------------------

  describe("formatTimeRange", () => {
    it("formats time range for same day trip", () => {
      const result = formatTimeRange("2025-12-14T10:30:00Z", "2025-12-14T16:45:00Z");
      // Note: times will be in local timezone
      expect(result).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    });

    it("returns only start time when endAt is null", () => {
      const result = formatTimeRange("2025-12-14T10:30:00Z", null);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it("returns only start time for multi-day trips", () => {
      const result = formatTimeRange("2025-12-14T10:30:00Z", "2025-12-15T14:00:00Z");
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it("returns null for invalid start date", () => {
      const result = formatTimeRange("invalid-date", null);
      expect(result).toBeNull();
    });

    it("returns null for invalid end date with valid start", () => {
      const result = formatTimeRange("2025-12-14T10:30:00Z", "invalid-date");
      expect(result).toBeNull();
    });

    it("formats midnight correctly", () => {
      const result = formatTimeRange("2025-12-14T00:00:00", "2025-12-14T12:00:00");
      expect(result).toMatch(/00:00/);
    });
  });

  // ---------------------------------------------------------------------------
  // formatLocation
  // ---------------------------------------------------------------------------

  describe("formatLocation", () => {
    it("returns null for null location", () => {
      const result = formatLocation(null);
      expect(result).toBeNull();
    });

    it("returns label when available", () => {
      const location: TripLocationDto = {
        lat: 52.2297,
        lng: 21.0122,
        label: "Jezioro Zegrzyńskie",
      };
      const result = formatLocation(location);
      expect(result).toBe("Jezioro Zegrzyńskie");
    });

    it("returns formatted coordinates when no label", () => {
      const location: TripLocationDto = {
        lat: 52.2297,
        lng: 21.0122,
      };
      const result = formatLocation(location);
      expect(result).toBe("52.2297, 21.0122");
    });

    it("returns formatted coordinates when label is empty string", () => {
      const location: TripLocationDto = {
        lat: 52.2297,
        lng: 21.0122,
        label: "",
      };
      const result = formatLocation(location);
      expect(result).toBe("52.2297, 21.0122");
    });

    it("truncates coordinates to 4 decimal places", () => {
      const location: TripLocationDto = {
        lat: 52.22974567890123,
        lng: 21.01223456789012,
      };
      const result = formatLocation(location);
      expect(result).toBe("52.2297, 21.0122");
    });

    it("handles negative coordinates", () => {
      const location: TripLocationDto = {
        lat: -33.8688,
        lng: 151.2093,
      };
      const result = formatLocation(location);
      expect(result).toBe("-33.8688, 151.2093");
    });
  });

  // ---------------------------------------------------------------------------
  // getStatusLabel
  // ---------------------------------------------------------------------------

  describe("getStatusLabel", () => {
    it('returns "Szkic" for draft status', () => {
      expect(getStatusLabel("draft")).toBe("Szkic");
    });

    it('returns "W trakcie" for active status', () => {
      expect(getStatusLabel("active")).toBe("W trakcie");
    });

    it('returns "Zakończona" for closed status', () => {
      expect(getStatusLabel("closed")).toBe("Zakończona");
    });
  });

  // ---------------------------------------------------------------------------
  // getStatusColorClass
  // ---------------------------------------------------------------------------

  describe("getStatusColorClass", () => {
    it("returns success colors for active status", () => {
      const result = getStatusColorClass("active");
      expect(result).toContain("success");
    });

    it("returns primary colors for closed status", () => {
      const result = getStatusColorClass("closed");
      expect(result).toContain("primary");
    });

    it("returns muted colors for draft status", () => {
      const result = getStatusColorClass("draft");
      expect(result).toContain("muted");
    });
  });

  // ---------------------------------------------------------------------------
  // formatCatchCount
  // ---------------------------------------------------------------------------

  describe("formatCatchCount", () => {
    it('returns "0 ryb" for zero catches', () => {
      expect(formatCatchCount(0)).toBe("0 ryb");
    });

    it('returns "1 ryba" for one catch', () => {
      expect(formatCatchCount(1)).toBe("1 ryba");
    });

    it('returns "2 ryby" for two catches', () => {
      expect(formatCatchCount(2)).toBe("2 ryby");
    });

    it('returns "3 ryby" for three catches', () => {
      expect(formatCatchCount(3)).toBe("3 ryby");
    });

    it('returns "4 ryby" for four catches', () => {
      expect(formatCatchCount(4)).toBe("4 ryby");
    });

    it('returns "5 ryb" for five catches', () => {
      expect(formatCatchCount(5)).toBe("5 ryb");
    });

    it('returns "10 ryb" for ten catches', () => {
      expect(formatCatchCount(10)).toBe("10 ryb");
    });

    it('returns "100 ryb" for hundred catches', () => {
      expect(formatCatchCount(100)).toBe("100 ryb");
    });
  });

  // ---------------------------------------------------------------------------
  // toTripCardViewModel
  // ---------------------------------------------------------------------------

  describe("toTripCardViewModel", () => {
    const baseTripDto: TripListItemDto = {
      id: "trip-123",
      user_id: "user-456",
      status: "active",
      started_at: "2025-12-14T10:00:00Z",
      ended_at: "2025-12-14T16:00:00Z",
      location: {
        lat: 52.2297,
        lng: 21.0122,
        label: "Jezioro Zegrzyńskie",
      },
      summary: {
        catch_count: 5,
      },
      created_at: "2025-12-14T09:00:00Z",
      updated_at: "2025-12-14T16:00:00Z",
    };

    it("transforms TripListItemDto to TripCardViewModel", () => {
      const result = toTripCardViewModel(baseTripDto);

      expect(result.id).toBe("trip-123");
      expect(result.status).toBe("active");
      expect(result.isActive).toBe(true);
      expect(result.statusLabel).toBe("W trakcie");
      expect(result.catchCount).toBe(5);
      expect(result.locationLabel).toBe("Jezioro Zegrzyńskie");
    });

    it("formats start date correctly", () => {
      const result = toTripCardViewModel(baseTripDto);
      expect(result.formattedStartDate).toContain("gru");
      expect(result.formattedStartDate).toContain("2025");
    });

    it("sets isActive to false for closed trips", () => {
      const closedTrip: TripListItemDto = {
        ...baseTripDto,
        status: "closed",
      };
      const result = toTripCardViewModel(closedTrip);
      expect(result.isActive).toBe(false);
    });

    it("sets isActive to false for draft trips", () => {
      const draftTrip: TripListItemDto = {
        ...baseTripDto,
        status: "draft",
      };
      const result = toTripCardViewModel(draftTrip);
      expect(result.isActive).toBe(false);
    });

    it("handles null location", () => {
      const tripWithoutLocation: TripListItemDto = {
        ...baseTripDto,
        location: null,
      };
      const result = toTripCardViewModel(tripWithoutLocation);
      expect(result.locationLabel).toBeNull();
    });

    it("handles null ended_at", () => {
      const activeTrip: TripListItemDto = {
        ...baseTripDto,
        ended_at: null,
      };
      const result = toTripCardViewModel(activeTrip);
      expect(result.formattedTimeRange).not.toBeNull();
    });

    it("handles zero catch count", () => {
      const noCatchesTrip: TripListItemDto = {
        ...baseTripDto,
        summary: { catch_count: 0 },
      };
      const result = toTripCardViewModel(noCatchesTrip);
      expect(result.catchCount).toBe(0);
    });
  });
});
