import { describe, expect, it } from "vitest";
import { isAvailabilityQuestion, parseDatePt } from "./availability.service.js";

describe("availability helpers", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  it("detects availability questions", () => {
    expect(isAvailabilityQuestion("Tem horario disponivel para manicure amanha?")).toBe(
      true,
    );
    expect(isAvailabilityQuestion("Quem atende drenagem?")).toBe(true);
  });

  it("parses simple Portuguese relative dates", () => {
    expect(parseDatePt("tem vaga amanha?", now)).toBe("2026-06-15");
    expect(parseDatePt("tem vaga depois de amanha?", now)).toBe("2026-06-16");
  });

  it("parses explicit ISO dates", () => {
    expect(parseDatePt("tem vaga em 2026-06-20?", now)).toBe("2026-06-20");
  });
});
