/** Default system settings, used as fallback when DB has no override. */
export const DEFAULT_SETTINGS = {
  session_timeout_minutes: 30,
  retrieval_top_k: 4,
  max_memories: 10,
  temperature: 0.3,
  summarize_every_n: 20,
  recent_messages_window: 12,
  max_qualifying_questions: 3,
  max_booking_attempts: 2,
  max_sales_pitches: 1,
  response_delay_min_ms: 3000,
  response_delay_max_ms: 7000,
  business_hours: {
    timezone: "America/Sao_Paulo",
    weekly: {
      monday: [{ start: "09:00", end: "18:00" }],
      tuesday: [{ start: "09:00", end: "18:00" }],
      wednesday: [{ start: "09:00", end: "18:00" }],
      thursday: [{ start: "09:00", end: "18:00" }],
      friday: [{ start: "09:00", end: "18:00" }],
      saturday: [{ start: "09:00", end: "16:00" }],
      sunday: [],
    },
    exceptionNote:
      "Atendemos fora destes horarios mediante previa combinacao entre o profissional e o cliente.",
  },
} as const;

/** System setting keys (stored in system_settings table). */
export const SETTING_KEYS = {
  SESSION_TIMEOUT_MINUTES: "session_timeout_minutes",
  RETRIEVAL_TOP_K: "retrieval_top_k",
  MAX_MEMORIES: "max_memories",
  TEMPERATURE: "temperature",
  ACTIVE_MODEL: "active_model",
  EMBEDDING_MODEL: "embedding_model",
  SUMMARIZE_EVERY_N: "summarize_every_n",
  RECENT_MESSAGES_WINDOW: "recent_messages_window",
  MAX_QUALIFYING_QUESTIONS: "max_qualifying_questions",
  MAX_BOOKING_ATTEMPTS: "max_booking_attempts",
  MAX_SALES_PITCHES: "max_sales_pitches",
  RESPONSE_DELAY_MIN_MS: "response_delay_min_ms",
  RESPONSE_DELAY_MAX_MS: "response_delay_max_ms",
  BUSINESS_HOURS: "business_hours",
} as const;

/** Well-known prompt keys resolved by the AI module. */
export const PROMPT_KEYS = {
  SYSTEM_BASE: "SYSTEM_BASE",
  INTENT_CLASSIFIER: "INTENT_CLASSIFIER",
  MEMORY_EXTRACTOR: "MEMORY_EXTRACTOR",
  SUMMARIZER: "SUMMARIZER",
  SALES_PLAYBOOK: "SALES_PLAYBOOK",
} as const;

/** BullMQ queue names. */
export const QUEUES = {
  EMBEDDING: "embedding",
  MEMORY: "memory",
  SUMMARY: "summary",
  ANALYTICS: "analytics",
} as const;

/** Safe Portuguese fallback when the AI provider fails. */
export const FALLBACK_REPLY =
  "Desculpe, estou com uma instabilidade no momento. Pode repetir, por favor? 🙏";
