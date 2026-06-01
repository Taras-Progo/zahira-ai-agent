import type { AiExit, Intent } from "./enums.js";

/** Standard error envelope returned by the API on failures. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ----- Auth -----
export interface AdminPublic {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: AdminPublic;
}

// ----- Chat -----
export interface ChatRequest {
  phone: string;
  message: string;
  session_id?: string;
}

export interface ChatMetadata {
  retrieved_documents: number;
  tokens_used: number;
}

export interface ChatResponse {
  reply: string;
  ai_exit: AiExit;
  intent: Intent;
  session_id: string;
  metadata: ChatMetadata;
}

// ----- Services -----
export interface ServiceDTO {
  id: string;
  service_name: string;
  category: string | null;
  description: string | null;
  price: string | null;
  duration: string | null;
  faq: string[];
  keywords: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceInput {
  service_name: string;
  category?: string;
  description?: string;
  price?: string;
  duration?: string;
  faq?: string[];
  keywords?: string[];
  is_active?: boolean;
}

// ----- Knowledge base -----
export interface KnowledgeDTO {
  id: string;
  title: string;
  content: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeInput {
  title: string;
  content: string;
  category?: string;
  is_active?: boolean;
}

// ----- Conversations / sessions -----
export interface ConversationSummaryDTO {
  session_id: string;
  phone: string;
  messages_count: number;
  status: string;
  started_at: string;
  last_activity_at: string;
}

export interface MessageDTO {
  id: string;
  role: string;
  content: string;
  intent: string | null;
  ai_exit: string | null;
  created_at: string;
}

export interface ConversationDetailDTO {
  session_id: string;
  phone: string;
  status: string;
  started_at: string;
  messages: MessageDTO[];
}

export interface SessionDTO {
  id: string;
  user_id: string;
  phone: string;
  status: string;
  message_count: number;
  started_at: string;
  last_activity_at: string;
  closed_at: string | null;
}

// ----- Memory -----
export interface MemoryDTO {
  id: string;
  user_id: string;
  type: string;
  content: string;
  relevance_score: number;
  created_at: string;
}

export interface MemoryInput {
  user_id: string;
  type?: string;
  content: string;
  relevance_score?: number;
}

// ----- Bookings -----
export interface BookingDTO {
  id: string;
  user_id: string;
  phone: string;
  session_id: string | null;
  service_id: string | null;
  service_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

// ----- Prompts -----
export interface PromptDTO {
  id: string;
  key: string;
  active_version_id: string | null;
  active_version: number | null;
  content: string;
  updated_at: string;
}

export interface PromptVersionDTO {
  id: string;
  prompt_id: string;
  version: number;
  content: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

// ----- Settings -----
export type SystemSettings = Record<string, unknown>;

// ----- Support -----
export interface HandoffDTO {
  id: string;
  session_id: string;
  user_id: string;
  phone: string;
  status: string;
  assigned_admin_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ----- Analytics -----
export interface DashboardAnalytics {
  total_conversations: number;
  messages_today: number;
  active_sessions: number;
  handoffs: number;
  bookings: number;
  top_services: { service_name: string; count: number }[];
}

// ----- Health -----
export interface HealthComponent {
  status: "ok" | "degraded" | "down";
  latency_ms?: number;
  detail?: string;
}

export interface SystemHealth {
  status: "ok" | "degraded" | "down";
  components: {
    database: HealthComponent;
    redis: HealthComponent;
    openai: HealthComponent;
    queue: HealthComponent & { depth?: number };
  };
}
