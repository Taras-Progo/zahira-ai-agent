/**
 * Core domain enums shared across backend and frontend.
 * These mirror the Prisma enums so both sides stay in sync.
 */

export const Intent = {
  GREETING: "greeting",
  PRICING: "pricing",
  BOOKING: "booking",
  AVAILABILITY: "availability",
  OPENING_HOURS: "opening_hours",
  SUPPORT: "support",
  COMPLAINT: "complaint",
  MENU: "menu",
  GENERAL_QUESTION: "general_question",
  HUMAN_HANDOFF: "human_handoff",
} as const;
export type Intent = (typeof Intent)[keyof typeof Intent];

export const AiExit = {
  CONTINUE: "CONTINUE",
  BOOKING: "BOOKING",
  SUPPORT: "SUPPORT",
  MENU: "MENU",
  END_SESSION: "END_SESSION",
} as const;
export type AiExit = (typeof AiExit)[keyof typeof AiExit];

export const MessageRole = {
  USER: "USER",
  ASSISTANT: "ASSISTANT",
  SYSTEM: "SYSTEM",
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const MemoryType = {
  SHORT_TERM: "SHORT_TERM",
  LONG_TERM: "LONG_TERM",
} as const;
export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType];

export const SessionStatus = {
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const HandoffStatus = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  RESOLVED: "RESOLVED",
} as const;
export type HandoffStatus = (typeof HandoffStatus)[keyof typeof HandoffStatus];

export const BookingStatus = {
  REQUESTED: "REQUESTED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const EmbeddingSourceType = {
  SERVICE: "SERVICE",
  KNOWLEDGE: "KNOWLEDGE",
} as const;
export type EmbeddingSourceType =
  (typeof EmbeddingSourceType)[keyof typeof EmbeddingSourceType];

export const AdminRole = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];
