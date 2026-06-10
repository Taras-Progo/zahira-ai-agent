import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@zahira/shared";
import { getOpeningHoursStatusForSetting } from "./opening-hours.service.js";

const hours = DEFAULT_SETTINGS.business_hours;

describe("opening hours", () => {
  it("is open on a weekday during business hours", () => {
    const status = getOpeningHoursStatusForSetting(
      hours,
      new Date("2026-06-10T13:00:00.000Z"),
    );

    expect(status.isOpen).toBe(true);
  });

  it("is closed on a weekday after business hours", () => {
    const status = getOpeningHoursStatusForSetting(
      hours,
      new Date("2026-06-10T23:00:00.000Z"),
    );

    expect(status.isOpen).toBe(false);
  });

  it("is open on Saturday morning", () => {
    const status = getOpeningHoursStatusForSetting(
      hours,
      new Date("2026-06-13T14:00:00.000Z"),
    );

    expect(status.isOpen).toBe(true);
  });

  it("is closed on Sunday", () => {
    const status = getOpeningHoursStatusForSetting(
      hours,
      new Date("2026-06-14T14:00:00.000Z"),
    );

    expect(status.isOpen).toBe(false);
  });
});
