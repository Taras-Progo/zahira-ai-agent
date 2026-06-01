import { z } from "zod";

// ----- Auth -----
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ----- Chat -----
export const chatSchema = z.object({
  phone: z.string().min(5).max(32),
  message: z.string().min(1).max(4000),
  session_id: z.string().uuid().optional(),
});

// ----- Services -----
export const serviceInputSchema = z.object({
  service_name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(8000).optional(),
  price: z.string().max(100).optional(),
  duration: z.string().max(100).optional(),
  faq: z.array(z.string().max(2000)).max(50).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  is_active: z.boolean().optional(),
});

export const serviceUpdateSchema = serviceInputSchema.partial();

// ----- Knowledge base -----
export const knowledgeInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  category: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

export const knowledgeUpdateSchema = knowledgeInputSchema.partial();

// ----- Memory -----
export const memoryInputSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(["SHORT_TERM", "LONG_TERM"]).optional(),
  content: z.string().min(1).max(2000),
  relevance_score: z.number().min(0).max(1).optional(),
});

export const memoryUpdateSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  relevance_score: z.number().min(0).max(1).optional(),
});

// ----- Bookings -----
export const bookingUpdateSchema = z.object({
  status: z.enum(["REQUESTED", "CONFIRMED", "CANCELLED"]).optional(),
  notes: z.string().max(2000).optional(),
});

// ----- Prompts -----
export const promptUpdateSchema = z.object({
  content: z.string().min(1).max(20000),
});

export const promptRollbackSchema = z.object({
  versionId: z.string().uuid(),
});

// ----- Settings -----
export const settingsUpdateSchema = z.record(z.string(), z.unknown());

// ----- Support / handoffs -----
export const handoffUpdateSchema = z.object({
  status: z.enum(["PENDING", "ASSIGNED", "RESOLVED"]).optional(),
  assigned_admin_id: z.string().uuid().nullable().optional(),
});

// ----- Pagination -----
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type ServiceInput = z.infer<typeof serviceInputSchema>;
export type KnowledgeInput = z.infer<typeof knowledgeInputSchema>;
export type MemoryInput = z.infer<typeof memoryInputSchema>;
