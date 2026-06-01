import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  BookingDTO,
  ChatRequest,
  ChatResponse,
  ConversationDetailDTO,
  ConversationSummaryDTO,
  DashboardAnalytics,
  HandoffDTO,
  KnowledgeDTO,
  MemoryDTO,
  PromptDTO,
  PromptVersionDTO,
  ServiceDTO,
  SessionDTO,
  SystemHealth,
} from "@zahira/types";
import { api } from "@/lib/api";

// ----- Analytics -----
export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardAnalytics>("/analytics/dashboard"),
  });

// ----- Services -----
export const useServices = () =>
  useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ServiceDTO[]>("/services"),
  });

export function useServiceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["services"] });
  return {
    create: useMutation({
      mutationFn: (body: unknown) => api.post("/services", body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) =>
        api.put(`/services/${id}`, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/services/${id}`),
      onSuccess: invalidate,
    }),
  };
}

// ----- Knowledge -----
export const useKnowledge = () =>
  useQuery({
    queryKey: ["knowledge"],
    queryFn: () => api.get<KnowledgeDTO[]>("/knowledge"),
  });

export function useKnowledgeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["knowledge"] });
  return {
    create: useMutation({
      mutationFn: (body: unknown) => api.post("/knowledge", body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) =>
        api.put(`/knowledge/${id}`, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/knowledge/${id}`),
      onSuccess: invalidate,
    }),
  };
}

// ----- Chat (AI test panel) -----
export const useChat = () =>
  useMutation({
    mutationFn: (body: ChatRequest) => api.post<ChatResponse>("/chat", body),
  });

// ----- Conversations -----
export const useConversations = () =>
  useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<ConversationSummaryDTO[]>("/conversations"),
  });

export const useConversation = (sessionId: string) =>
  useQuery({
    queryKey: ["conversation", sessionId],
    queryFn: () =>
      api.get<ConversationDetailDTO>(`/conversations/${sessionId}`),
    enabled: !!sessionId,
  });

// ----- Sessions -----
export const useSessions = () =>
  useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<SessionDTO[]>("/sessions"),
  });

// ----- Memory -----
export const useMemories = (userId: string) =>
  useQuery({
    queryKey: ["memory", userId],
    queryFn: () => api.get<MemoryDTO[]>(`/memory/${userId}`),
    enabled: !!userId,
  });

export function useMemoryMutations(userId: string) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["memory", userId] });
  return {
    create: useMutation({
      mutationFn: (body: unknown) => api.post("/memory", body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) =>
        api.put(`/memory/${id}`, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/memory/${id}`),
      onSuccess: invalidate,
    }),
  };
}

// ----- Bookings -----
export const useBookings = () =>
  useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<BookingDTO[]>("/bookings"),
  });

export function useBookingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.put(`/bookings/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

// ----- Support / handoffs -----
export const useSupport = () =>
  useQuery({
    queryKey: ["support"],
    queryFn: () => api.get<HandoffDTO[]>("/support"),
  });

export function useSupportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.put(`/support/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support"] }),
  });
}

// ----- Prompts -----
export const usePrompts = () =>
  useQuery({
    queryKey: ["prompts"],
    queryFn: () => api.get<PromptDTO[]>("/prompts"),
  });

export const usePromptVersions = (id: string) =>
  useQuery({
    queryKey: ["prompt-versions", id],
    queryFn: () => api.get<PromptVersionDTO[]>(`/prompts/${id}/versions`),
    enabled: !!id,
  });

export function usePromptMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["prompts"] });
    qc.invalidateQueries({ queryKey: ["prompt-versions"] });
  };
  return {
    update: useMutation({
      mutationFn: ({ id, content }: { id: string; content: string }) =>
        api.put(`/prompts/${id}`, { content }),
      onSuccess: invalidate,
    }),
    rollback: useMutation({
      mutationFn: ({ id, versionId }: { id: string; versionId: string }) =>
        api.post(`/prompts/${id}/rollback`, { versionId }),
      onSuccess: invalidate,
    }),
  };
}

// ----- Settings -----
export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Record<string, unknown>>("/settings"),
  });

export function useSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put("/settings", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ----- Health -----
export const useHealth = () =>
  useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<SystemHealth>("/admin/health"),
    refetchInterval: 15_000,
  });
