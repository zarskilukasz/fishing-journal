import { describe, it, expect } from "vitest";
import {
  tripIdParamSchema,
  snapshotIdParamSchema,
  weatherSnapshotSourceSchema,
  weatherSnapshotListQuerySchema,
  weatherSnapshotGetQuerySchema,
  weatherHourSchema,
  weatherRefreshCommandSchema,
  weatherManualCommandSchema,
} from "./weather.schema";

describe("weather.schema", () => {
  const validUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
  const invalidUuid = "not-a-uuid";
  const validDatetime = "2025-01-15T10:00:00Z";
  const invalidDatetime = "not-a-datetime";

  // ---------------------------------------------------------------------------
  // weatherSnapshotSourceSchema
  // ---------------------------------------------------------------------------

  describe("weatherSnapshotSourceSchema", () => {
    it("accepts 'api' source", () => {
      const result = weatherSnapshotSourceSchema.safeParse("api");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("api");
      }
    });

    it("accepts 'manual' source", () => {
      const result = weatherSnapshotSourceSchema.safeParse("manual");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("manual");
      }
    });

    it("rejects invalid source", () => {
      const result = weatherSnapshotSourceSchema.safeParse("external");
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // tripIdParamSchema
  // ---------------------------------------------------------------------------

  describe("tripIdParamSchema", () => {
    it("accepts valid UUID for tripId", () => {
      const result = tripIdParamSchema.safeParse({ tripId: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tripId).toBe(validUuid);
      }
    });

    it("rejects invalid UUID for tripId", () => {
      const result = tripIdParamSchema.safeParse({ tripId: invalidUuid });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects missing tripId", () => {
      const result = tripIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // snapshotIdParamSchema
  // ---------------------------------------------------------------------------

  describe("snapshotIdParamSchema", () => {
    it("accepts valid UUID for snapshotId", () => {
      const result = snapshotIdParamSchema.safeParse({ snapshotId: validUuid });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.snapshotId).toBe(validUuid);
      }
    });

    it("rejects invalid UUID for snapshotId", () => {
      const result = snapshotIdParamSchema.safeParse({ snapshotId: invalidUuid });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("UUID");
      }
    });

    it("rejects missing snapshotId", () => {
      const result = snapshotIdParamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // weatherSnapshotListQuerySchema
  // ---------------------------------------------------------------------------

  describe("weatherSnapshotListQuerySchema", () => {
    describe("defaults", () => {
      it("applies default values when not provided", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({});

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(20);
          expect(result.data.sort).toBe("fetched_at");
          expect(result.data.order).toBe("desc");
        }
      });
    });

    describe("source filter", () => {
      it("accepts 'api' source filter", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ source: "api" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.source).toBe("api");
        }
      });

      it("accepts 'manual' source filter", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ source: "manual" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.source).toBe("manual");
        }
      });

      it("rejects invalid source filter", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ source: "external" });
        expect(result.success).toBe(false);
      });
    });

    describe("sort field", () => {
      it("accepts 'fetched_at' sort", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ sort: "fetched_at" });
        expect(result.success).toBe(true);
      });

      it("accepts 'created_at' sort", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ sort: "created_at" });
        expect(result.success).toBe(true);
      });

      it("rejects invalid sort field", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ sort: "updated_at" });
        expect(result.success).toBe(false);
      });
    });

    describe("order", () => {
      it("accepts 'asc' order", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ order: "asc" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("asc");
        }
      });

      it("accepts 'desc' order", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ order: "desc" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe("desc");
        }
      });

      it("rejects invalid order", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ order: "random" });
        expect(result.success).toBe(false);
      });
    });

    describe("limit", () => {
      it("coerces string to number", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ limit: "50" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(50);
        }
      });

      it("rejects limit below 1", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ limit: "0" });
        expect(result.success).toBe(false);
      });

      it("rejects limit above 100", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ limit: "101" });
        expect(result.success).toBe(false);
      });

      it("accepts limit at boundary 1", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ limit: "1" });
        expect(result.success).toBe(true);
      });

      it("accepts limit at boundary 100", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({ limit: "100" });
        expect(result.success).toBe(true);
      });
    });

    describe("cursor", () => {
      it("accepts cursor string", () => {
        const result = weatherSnapshotListQuerySchema.safeParse({
          cursor: "eyJzb3J0VmFsdWUiOiIuLi4iLCJpZCI6Ii4uLiJ9",
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cursor).toBe("eyJzb3J0VmFsdWUiOiIuLi4iLCJpZCI6Ii4uLiJ9");
        }
      });
    });
  });

  // ---------------------------------------------------------------------------
  // weatherSnapshotGetQuerySchema
  // ---------------------------------------------------------------------------

  describe("weatherSnapshotGetQuerySchema", () => {
    it("defaults include_hours to false", () => {
      const result = weatherSnapshotGetQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_hours).toBe(false);
      }
    });

    it("transforms 'true' string to boolean true", () => {
      const result = weatherSnapshotGetQuerySchema.safeParse({ include_hours: "true" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_hours).toBe(true);
      }
    });

    it("transforms 'false' string to boolean false", () => {
      const result = weatherSnapshotGetQuerySchema.safeParse({ include_hours: "false" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_hours).toBe(false);
      }
    });

    it("transforms any other string to false", () => {
      const result = weatherSnapshotGetQuerySchema.safeParse({ include_hours: "yes" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_hours).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // weatherHourSchema
  // ---------------------------------------------------------------------------

  describe("weatherHourSchema", () => {
    const validHour = {
      observed_at: validDatetime,
    };

    describe("observed_at", () => {
      it("requires observed_at", () => {
        const result = weatherHourSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it("accepts valid datetime for observed_at", () => {
        const result = weatherHourSchema.safeParse(validHour);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.observed_at).toBe(validDatetime);
        }
      });

      it("rejects invalid datetime for observed_at", () => {
        const result = weatherHourSchema.safeParse({ observed_at: invalidDatetime });
        expect(result.success).toBe(false);
      });
    });

    describe("temperature_c", () => {
      it("accepts temperature within range", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, temperature_c: 15.5 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.temperature_c).toBe(15.5);
        }
      });

      it("accepts temperature at minimum (-100)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, temperature_c: -100 });
        expect(result.success).toBe(true);
      });

      it("accepts temperature at maximum (100)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, temperature_c: 100 });
        expect(result.success).toBe(true);
      });

      it("rejects temperature below -100", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, temperature_c: -101 });
        expect(result.success).toBe(false);
      });

      it("rejects temperature above 100", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, temperature_c: 101 });
        expect(result.success).toBe(false);
      });

      it("accepts null for temperature", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, temperature_c: null });
        expect(result.success).toBe(true);
      });
    });

    describe("pressure_hpa", () => {
      it("accepts pressure within range", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, pressure_hpa: 1015 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.pressure_hpa).toBe(1015);
        }
      });

      it("accepts pressure at minimum (800)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, pressure_hpa: 800 });
        expect(result.success).toBe(true);
      });

      it("accepts pressure at maximum (1200)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, pressure_hpa: 1200 });
        expect(result.success).toBe(true);
      });

      it("rejects pressure below 800", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, pressure_hpa: 799 });
        expect(result.success).toBe(false);
      });

      it("rejects pressure above 1200", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, pressure_hpa: 1201 });
        expect(result.success).toBe(false);
      });

      it("rejects non-integer pressure", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, pressure_hpa: 1015.5 });
        expect(result.success).toBe(false);
      });
    });

    describe("wind_speed_kmh", () => {
      it("accepts positive wind speed", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_speed_kmh: 25.5 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.wind_speed_kmh).toBe(25.5);
        }
      });

      it("accepts zero wind speed", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_speed_kmh: 0 });
        expect(result.success).toBe(true);
      });

      it("rejects negative wind speed", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_speed_kmh: -5 });
        expect(result.success).toBe(false);
      });
    });

    describe("wind_direction", () => {
      it("accepts direction within range", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_direction: 180 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.wind_direction).toBe(180);
        }
      });

      it("accepts direction at minimum (0)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_direction: 0 });
        expect(result.success).toBe(true);
      });

      it("accepts direction at maximum (360)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_direction: 360 });
        expect(result.success).toBe(true);
      });

      it("rejects negative direction", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_direction: -1 });
        expect(result.success).toBe(false);
      });

      it("rejects direction above 360", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_direction: 361 });
        expect(result.success).toBe(false);
      });

      it("rejects non-integer direction", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, wind_direction: 180.5 });
        expect(result.success).toBe(false);
      });
    });

    describe("humidity_percent", () => {
      it("accepts humidity within range", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, humidity_percent: 65 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.humidity_percent).toBe(65);
        }
      });

      it("accepts humidity at minimum (0)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, humidity_percent: 0 });
        expect(result.success).toBe(true);
      });

      it("accepts humidity at maximum (100)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, humidity_percent: 100 });
        expect(result.success).toBe(true);
      });

      it("rejects negative humidity", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, humidity_percent: -1 });
        expect(result.success).toBe(false);
      });

      it("rejects humidity above 100", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, humidity_percent: 101 });
        expect(result.success).toBe(false);
      });
    });

    describe("precipitation_mm", () => {
      it("accepts positive precipitation", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, precipitation_mm: 5.5 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.precipitation_mm).toBe(5.5);
        }
      });

      it("accepts zero precipitation", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, precipitation_mm: 0 });
        expect(result.success).toBe(true);
      });

      it("rejects negative precipitation", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, precipitation_mm: -1 });
        expect(result.success).toBe(false);
      });
    });

    describe("cloud_cover", () => {
      it("accepts cloud cover within range", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, cloud_cover: 50 });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cloud_cover).toBe(50);
        }
      });

      it("accepts cloud cover at minimum (0)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, cloud_cover: 0 });
        expect(result.success).toBe(true);
      });

      it("accepts cloud cover at maximum (100)", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, cloud_cover: 100 });
        expect(result.success).toBe(true);
      });

      it("rejects negative cloud cover", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, cloud_cover: -1 });
        expect(result.success).toBe(false);
      });

      it("rejects cloud cover above 100", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, cloud_cover: 101 });
        expect(result.success).toBe(false);
      });
    });

    describe("weather_icon", () => {
      it("accepts valid weather icon", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, weather_icon: "cloud" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.weather_icon).toBe("cloud");
        }
      });

      it("rejects weather icon exceeding 50 characters", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, weather_icon: "a".repeat(51) });
        expect(result.success).toBe(false);
      });

      it("accepts weather icon with exactly 50 characters", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, weather_icon: "a".repeat(50) });
        expect(result.success).toBe(true);
      });
    });

    describe("weather_text", () => {
      it("accepts valid weather text", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, weather_text: "Partly cloudy" });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.weather_text).toBe("Partly cloudy");
        }
      });

      it("rejects weather text exceeding 255 characters", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, weather_text: "a".repeat(256) });
        expect(result.success).toBe(false);
      });

      it("accepts weather text with exactly 255 characters", () => {
        const result = weatherHourSchema.safeParse({ ...validHour, weather_text: "a".repeat(255) });
        expect(result.success).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // weatherRefreshCommandSchema
  // ---------------------------------------------------------------------------

  describe("weatherRefreshCommandSchema", () => {
    const validRefreshInput = {
      period_start: "2025-01-15T08:00:00Z",
      period_end: "2025-01-15T18:00:00Z",
    };

    describe("valid inputs", () => {
      it("accepts valid refresh command with required fields", () => {
        const result = weatherRefreshCommandSchema.safeParse(validRefreshInput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.period_start).toBe("2025-01-15T08:00:00Z");
          expect(result.data.period_end).toBe("2025-01-15T18:00:00Z");
          expect(result.data.force).toBe(false);
        }
      });

      it("accepts force=true", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          ...validRefreshInput,
          force: true,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.force).toBe(true);
        }
      });

      it("accepts period_end equal to period_start", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          period_start: validDatetime,
          period_end: validDatetime,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("required fields", () => {
      it("rejects missing period_start", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          period_end: validRefreshInput.period_end,
        });
        expect(result.success).toBe(false);
      });

      it("rejects missing period_end", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          period_start: validRefreshInput.period_start,
        });
        expect(result.success).toBe(false);
      });
    });

    describe("datetime validation", () => {
      it("rejects invalid period_start format", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          ...validRefreshInput,
          period_start: invalidDatetime,
        });
        expect(result.success).toBe(false);
      });

      it("rejects invalid period_end format", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          ...validRefreshInput,
          period_end: invalidDatetime,
        });
        expect(result.success).toBe(false);
      });
    });

    describe("period_end >= period_start refinement", () => {
      it("rejects period_end before period_start", () => {
        const result = weatherRefreshCommandSchema.safeParse({
          period_start: "2025-01-15T18:00:00Z",
          period_end: "2025-01-15T08:00:00Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("period_end");
        }
      });
    });
  });

  // ---------------------------------------------------------------------------
  // weatherManualCommandSchema
  // ---------------------------------------------------------------------------

  describe("weatherManualCommandSchema", () => {
    const validManualInput = {
      fetched_at: "2025-01-15T12:00:00Z",
      period_start: "2025-01-15T08:00:00Z",
      period_end: "2025-01-15T18:00:00Z",
      hours: [
        {
          observed_at: "2025-01-15T10:00:00Z",
          temperature_c: 15.5,
          pressure_hpa: 1015,
        },
      ],
    };

    describe("valid inputs", () => {
      it("accepts valid manual command with required fields", () => {
        const result = weatherManualCommandSchema.safeParse(validManualInput);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.fetched_at).toBe("2025-01-15T12:00:00Z");
          expect(result.data.period_start).toBe("2025-01-15T08:00:00Z");
          expect(result.data.period_end).toBe("2025-01-15T18:00:00Z");
          expect(result.data.hours).toHaveLength(1);
        }
      });

      it("accepts multiple hours", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          hours: [
            { observed_at: "2025-01-15T10:00:00Z", temperature_c: 15 },
            { observed_at: "2025-01-15T11:00:00Z", temperature_c: 16 },
            { observed_at: "2025-01-15T12:00:00Z", temperature_c: 17 },
          ],
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.hours).toHaveLength(3);
        }
      });

      it("accepts hours with all optional fields", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          hours: [
            {
              observed_at: "2025-01-15T10:00:00Z",
              temperature_c: 15.5,
              pressure_hpa: 1015,
              wind_speed_kmh: 12.0,
              wind_direction: 180,
              humidity_percent: 70,
              precipitation_mm: 0.0,
              cloud_cover: 30,
              weather_icon: "cloud",
              weather_text: "Partly cloudy",
            },
          ],
        });

        expect(result.success).toBe(true);
      });
    });

    describe("required fields", () => {
      it("rejects missing fetched_at", () => {
        const { fetched_at: _, ...input } = validManualInput;
        void _;
        const result = weatherManualCommandSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("rejects missing period_start", () => {
        const { period_start: _, ...input } = validManualInput;
        void _;
        const result = weatherManualCommandSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("rejects missing period_end", () => {
        const { period_end: _, ...input } = validManualInput;
        void _;
        const result = weatherManualCommandSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it("rejects missing hours", () => {
        const { hours: _, ...input } = validManualInput;
        void _;
        const result = weatherManualCommandSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe("hours array validation", () => {
      it("rejects empty hours array", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          hours: [],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("co najmniej jeden");
        }
      });
    });

    describe("period_end >= period_start refinement", () => {
      it("rejects period_end before period_start", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          period_start: "2025-01-15T18:00:00Z",
          period_end: "2025-01-15T08:00:00Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain("period_end");
        }
      });

      it("accepts period_end equal to period_start", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          period_start: validDatetime,
          period_end: validDatetime,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("datetime validation", () => {
      it("rejects invalid fetched_at format", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          fetched_at: invalidDatetime,
        });
        expect(result.success).toBe(false);
      });

      it("rejects invalid period_start format", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          period_start: invalidDatetime,
        });
        expect(result.success).toBe(false);
      });

      it("rejects invalid period_end format", () => {
        const result = weatherManualCommandSchema.safeParse({
          ...validManualInput,
          period_end: invalidDatetime,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
