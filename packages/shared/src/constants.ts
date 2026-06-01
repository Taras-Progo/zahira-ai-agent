/** Default system settings, used as fallback when DB has no override. */
export const DEFAULT_SETTINGS = {
  session_timeout_minutes: 30,
  retrieval_top_k: 4,
  max_memories: 10,
  temperature: 0.6,
  summarize_every_n: 20,
  recent_messages_window: 12,
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
} as const;

/** Well-known prompt keys resolved by the AI module. */
export const PROMPT_KEYS = {
  SYSTEM_BASE: "SYSTEM_BASE",
  INTENT_CLASSIFIER: "INTENT_CLASSIFIER",
  MEMORY_EXTRACTOR: "MEMORY_EXTRACTOR",
  SUMMARIZER: "SUMMARIZER",
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
