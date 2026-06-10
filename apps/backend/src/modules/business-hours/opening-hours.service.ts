import { DEFAULT_SETTINGS, SETTING_KEYS } from "@zahira/shared";

export interface BusinessHourInterval {
  start: string;
  end: string;
}

export interface BusinessHoursSetting {
  timezone: string;
  weekly: Record<string, BusinessHourInterval[]>;
  exceptionNote?: string;
}

export interface OpeningHoursStatus {
  isOpen: boolean;
  timezone: string;
  todayLabel: string;
  currentTime: string;
  todayIntervals: BusinessHourInterval[];
  nextOpenLabel: string | null;
  summary: string;
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
type Weekday = (typeof WEEKDAYS)[number];

const DAY_LABELS: Record<string, string> = {
  sunday: "domingo",
  monday: "segunda-feira",
  tuesday: "terca-feira",
  wednesday: "quarta-feira",
  thursday: "quinta-feira",
  friday: "sexta-feira",
  saturday: "sabado",
};

function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function getLocalParts(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const weekday = String(parts.weekday ?? "sunday").toLowerCase();
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  const minute = Number(parts.minute ?? "0");
  const dayIndex = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  return {
    weekday: dayIndex >= 0 ? WEEKDAYS[dayIndex]! : "sunday",
    dayIndex: dayIndex >= 0 ? dayIndex : 0,
    minutes: hour * 60 + minute,
    timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function normalizeSetting(value: unknown): BusinessHoursSetting {
  if (!value || typeof value !== "object") {
    return DEFAULT_SETTINGS.business_hours as unknown as BusinessHoursSetting;
  }
  const candidate = value as Partial<BusinessHoursSetting>;
  if (!candidate.weekly || typeof candidate.weekly !== "object") {
    return DEFAULT_SETTINGS.business_hours as unknown as BusinessHoursSetting;
  }
  return {
    timezone: candidate.timezone ?? DEFAULT_SETTINGS.business_hours.timezone,
    weekly: candidate.weekly as Record<string, BusinessHourInterval[]>,
    exceptionNote:
      candidate.exceptionNote ?? DEFAULT_SETTINGS.business_hours.exceptionNote,
  };
}

function intervalLabel(intervals: BusinessHourInterval[]): string {
  if (intervals.length === 0) return "fechado";
  return intervals.map((slot) => `${slot.start}-${slot.end}`).join(", ");
}

function findNextOpen(
  setting: BusinessHoursSetting,
  dayIndex: number,
  nowMinutes: number,
): string | null {
  for (let offset = 0; offset < 7; offset++) {
    const index = (dayIndex + offset) % 7;
    const day = WEEKDAYS[index]!;
    const intervals = setting.weekly[day] ?? [];
    const upcoming = intervals.find((slot: BusinessHourInterval) => {
      if (offset > 0) return true;
      return toMinutes(slot.start) > nowMinutes;
    });
    if (upcoming) {
      const label = offset === 0 ? "hoje" : DAY_LABELS[day];
      return `${label} as ${upcoming.start}`;
    }
  }
  return null;
}

export async function getOpeningHoursStatus(
  now = new Date(),
): Promise<OpeningHoursStatus> {
  const settingsService = await import("../system-settings/settings.service.js");
  const raw = await settingsService.getValue<unknown>(
    SETTING_KEYS.BUSINESS_HOURS,
    DEFAULT_SETTINGS.business_hours,
  );
  return getOpeningHoursStatusForSetting(raw, now);
}

export function getOpeningHoursStatusForSetting(
  raw: unknown,
  now = new Date(),
): OpeningHoursStatus {
  const setting = normalizeSetting(raw);
  const local = getLocalParts(now, setting.timezone);
  const todayIntervals = setting.weekly[local.weekday] ?? [];
  const isOpen = todayIntervals.some(
    (slot: BusinessHourInterval) =>
      local.minutes >= toMinutes(slot.start) &&
      local.minutes < toMinutes(slot.end),
  );
  const nextOpenLabel = isOpen
    ? null
    : findNextOpen(setting, local.dayIndex, local.minutes);
  const weeklySummary =
    "Seg a sex 09:00-18:00; sabado 09:00-16:00.";
  const status = isOpen
    ? `Agora estamos em horario de atendimento (${local.timeLabel}, ${setting.timezone}).`
    : `Agora estamos fora do horario de atendimento (${local.timeLabel}, ${setting.timezone}).`;

  return {
    isOpen,
    timezone: setting.timezone,
    todayLabel: DAY_LABELS[local.weekday as Weekday] ?? "domingo",
    currentTime: local.timeLabel,
    todayIntervals,
    nextOpenLabel,
    summary: `${weeklySummary} Hoje: ${intervalLabel(todayIntervals)}. ${status} ${
      nextOpenLabel ? `Proximo atendimento: ${nextOpenLabel}.` : ""
    } ${setting.exceptionNote ?? ""}`.trim(),
  };
}
