import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

const TIMEZONE = "America/Sao_Paulo";
const FALLBACK =
  "Nao consegui verificar a agenda em tempo real agora. Posso te direcionar para o atendimento humano ou para o agendamento oficial.";

export interface AvailabilityAnswer {
  reply: string;
  tool: string;
  success: boolean;
  errorCode?: string;
}

interface LovableError {
  code?: string;
  message?: string;
}

interface LovableEnvelope<T> {
  success: boolean;
  error?: LovableError;
  disclaimer?: string;
  booking_url?: string;
  date?: string;
  service?: { id?: string; name?: string; duration_minutes?: number };
  professional?: { slug?: string; display_name?: string };
  slots?: string[];
  dates?: Array<{
    date: string;
    weekday?: string;
    professional_slug?: string;
    booking_url?: string;
  }>;
  results?: Array<{
    date: string;
    weekday?: string;
    professional_slug?: string;
    display_name?: string;
    first_slot?: string;
    booking_url?: string;
  }>;
  professionals?: Array<{
    slug: string;
    display_name?: string;
    bio?: string | null;
    specialties?: string[] | null;
    avg_rating?: number | null;
    total_reviews?: number | null;
  }>;
  services?: Array<{
    id: string;
    name: string;
    duration_minutes?: number | null;
    price?: number | null;
    promotional_price?: number | null;
  }>;
  data?: T;
}

interface ResolvedService {
  id: string;
  name: string;
}

interface AvailabilityRequest {
  kind: "professionals" | "services_for_professional" | "dates" | "next" | "slots";
  service?: ResolvedService;
  professionalSlug?: string;
  date?: string;
}

export function isAvailabilityQuestion(message: string): boolean {
  const text = normalize(message);
  return (
    /\b(disponivel|disponiveis|vaga|vagas|agenda|agendas|proximo horario|primeiro horario|horario livre|horarios livres|tem horario|tem vaga|encaixe)\b/.test(
      text,
    ) ||
    /\b(quem atende|quem faz|qual profissional|quais profissionais|profissional disponivel|profissionais disponiveis)\b/.test(
      text,
    )
  );
}

export async function buildAvailabilityAnswer(params: {
  message: string;
  recentMessages: string[];
}): Promise<AvailabilityAnswer> {
  if (!env.AVAILABILITY_LOOKUP_ENABLED) {
    return { reply: FALLBACK, tool: "disabled", success: false, errorCode: "disabled" };
  }
  if (!env.ZAHIRA_AI_API_KEY) {
    return {
      reply: FALLBACK,
      tool: "missing_api_key",
      success: false,
      errorCode: "service_unavailable",
    };
  }

  const request = await resolveAvailabilityRequest(
    params.message,
    params.recentMessages,
  );

  if (
    request.kind !== "services_for_professional" &&
    request.kind !== "professionals" &&
    !request.service
  ) {
    return {
      reply:
        "Para verificar horarios reais, preciso saber qual servico voce quer. Pode escolher uma opcao, por exemplo: manicure, drenagem ou massagem?",
      tool: "missing_service",
      success: false,
      errorCode: "missing_service",
    };
  }

  switch (request.kind) {
    case "professionals":
      return professionalsReply(request);
    case "services_for_professional":
      return servicesForProfessionalReply(request);
    case "dates":
      return availableDatesReply(request);
    case "next":
      return nextAvailableReply(request);
    default:
      return availabilityReply(request);
  }
}

async function professionalsReply(request: AvailabilityRequest) {
  if (!request.service) {
    return {
      reply:
        "Posso verificar os profissionais, mas preciso saber para qual servico. Qual servico voce tem interesse?",
      tool: "ai-professionals",
      success: false,
      errorCode: "missing_service",
    };
  }
  const data = await callLovable<unknown>("ai-professionals", {
    service_id: request.service.id,
  });
  if (!data.success) return errorReply("ai-professionals", data.error?.code);
  const names = (data.professionals ?? [])
    .slice(0, 4)
    .map((pro) => pro.display_name || pro.slug)
    .filter(Boolean);
  if (names.length === 0) {
    return {
      reply: `Nao encontrei profissionais disponiveis para ${request.service.name} agora. Posso te passar o link oficial de agendamento ou chamar atendimento humano.`,
      tool: "ai-professionals",
      success: true,
    };
  }
  return {
    reply: `Para ${request.service.name}, encontrei: ${names.join(", ")}. Quer que eu veja os proximos horarios disponiveis?`,
    tool: "ai-professionals",
    success: true,
  };
}

async function servicesForProfessionalReply(request: AvailabilityRequest) {
  if (!request.professionalSlug) {
    return {
      reply:
        "Consigo verificar os servicos de um profissional, mas preciso do nome dele. Qual profissional voce quer consultar?",
      tool: "ai-services-for-professional",
      success: false,
      errorCode: "missing_professional",
    };
  }
  const data = await callLovable<unknown>("ai-services-for-professional", {
    professional_slug: request.professionalSlug,
  });
  if (!data.success) {
    return errorReply("ai-services-for-professional", data.error?.code);
  }
  const services = (data.services ?? [])
    .slice(0, 5)
    .map((service) => service.name)
    .filter(Boolean);
  if (services.length === 0) {
    return {
      reply:
        "Nao encontrei servicos publicos para esse profissional agora. Posso verificar por categoria ou servico especifico.",
      tool: "ai-services-for-professional",
      success: true,
    };
  }
  return {
    reply: `${formatName(request.professionalSlug)} atende estes servicos: ${services.join(", ")}. Quer ver horarios de algum deles?`,
    tool: "ai-services-for-professional",
    success: true,
  };
}

async function availabilityReply(request: AvailabilityRequest) {
  if (!request.service) return errorReply("ai-availability", "missing_service");
  if (!request.professionalSlug) {
    if (request.date) {
      const dateMatch = await findProfessionalForDate(request);
      if (dateMatch?.professionalSlug) {
        return availabilityReply({
          ...request,
          professionalSlug: dateMatch.professionalSlug,
        });
      }
      return {
        reply: `Nao encontrei horarios livres para ${request.service.name} em ${formatDateBr(request.date)}. Posso procurar a proxima data disponivel ou chamar atendimento humano.`,
        tool: "ai-available-dates",
        success: true,
      };
    }
    return nextAvailableReply(request);
  }
  const data = await callLovable<unknown>("ai-availability", {
    service_id: request.service.id,
    professional_slug: request.professionalSlug,
    ...(request.date ? { date: request.date } : {}),
  });
  if (!data.success) return errorReply("ai-availability", data.error?.code);
  const slots = (data.slots ?? []).slice(0, env.AVAILABILITY_MAX_SLOTS);
  const serviceName = data.service?.name ?? request.service.name;
  const proName = data.professional?.display_name ?? formatName(request.professionalSlug);
  if (slots.length === 0) {
    return {
      reply: `Nao encontrei horarios livres para ${serviceName} com ${proName}${request.date ? ` em ${formatDateBr(request.date)}` : ""}. Posso procurar a proxima data disponivel?`,
      tool: "ai-availability",
      success: true,
    };
  }
  return {
    reply: withBookingLink(
      `Encontrei estes horarios para ${serviceName} com ${proName}${data.date ? ` em ${formatDateBr(data.date)}` : ""}: ${slots.join(", ")}. A disponibilidade pode mudar; finalize pelo link oficial.`,
      data.booking_url,
    ),
    tool: "ai-availability",
    success: true,
  };
}

async function findProfessionalForDate(request: AvailabilityRequest) {
  if (!request.service || !request.date) return undefined;
  const data = await callLovable<unknown>("ai-available-dates", {
    service_id: request.service.id,
    days_ahead: "14",
  });
  if (!data.success) return undefined;
  const match = (data.dates ?? []).find(
    (item) => item.date === request.date && item.professional_slug,
  );
  return match?.professional_slug
    ? { professionalSlug: match.professional_slug }
    : undefined;
}

async function availableDatesReply(request: AvailabilityRequest) {
  if (!request.service) return errorReply("ai-available-dates", "missing_service");
  const data = await callLovable<unknown>("ai-available-dates", {
    service_id: request.service.id,
    ...(request.professionalSlug ? { professional_slug: request.professionalSlug } : {}),
    days_ahead: "14",
  });
  if (!data.success) return errorReply("ai-available-dates", data.error?.code);
  const dates = (data.dates ?? []).slice(0, 5);
  if (dates.length === 0) {
    return {
      reply: `Nao encontrei datas disponiveis para ${request.service.name} nos proximos dias. Posso te direcionar para atendimento humano.`,
      tool: "ai-available-dates",
      success: true,
    };
  }
  const formatted = dates.map((item) => formatDateBr(item.date)).join(", ");
  return {
    reply: `Encontrei disponibilidade para ${request.service.name} nestas datas: ${formatted}. Quer que eu veja horarios de uma delas?`,
    tool: "ai-available-dates",
    success: true,
  };
}

async function nextAvailableReply(request: AvailabilityRequest) {
  if (!request.service) return errorReply("ai-next-available", "missing_service");
  const data = await callLovable<unknown>("ai-next-available", {
    service_id: request.service.id,
    days_ahead: "7",
  });
  if (!data.success) return errorReply("ai-next-available", data.error?.code);
  const results = (data.results ?? []).slice(0, env.AVAILABILITY_MAX_SLOTS);
  if (results.length === 0) {
    return {
      reply: `Nao encontrei horarios para ${request.service.name} nos proximos dias. Posso chamar atendimento humano ou tentar outra data.`,
      tool: "ai-next-available",
      success: true,
    };
  }
  const firstLink = results.find((item) => item.booking_url)?.booking_url;
  const options = results
    .map(
      (item) =>
        `${formatDateBr(item.date)} as ${item.first_slot} com ${item.display_name ?? formatName(item.professional_slug ?? "profissional")}`,
    )
    .join("; ");
  return {
    reply: withBookingLink(
      `Encontrei estas opcoes para ${request.service.name}: ${options}. A disponibilidade pode mudar; finalize pelo link oficial.`,
      firstLink,
    ),
    tool: "ai-next-available",
    success: true,
  };
}

async function resolveAvailabilityRequest(
  message: string,
  recentMessages: string[],
): Promise<AvailabilityRequest> {
  const context = `${recentMessages.join("\n")}\n${message}`;
  const normalized = normalize(message);
  const service = (await resolveService(message)) ?? (await resolveService(context));
  const date = parseDatePt(message);
  const professionalSlug = await resolveProfessionalSlug(message, service?.id);

  if (/\b(quem atende|quem faz|quais profissionais|qual profissional|profissionais)\b/.test(normalized)) {
    return { kind: "professionals", service, professionalSlug, date };
  }
  if (/\b(quais servicos|servicos da|servicos do)\b/.test(normalized)) {
    return { kind: "services_for_professional", service, professionalSlug, date };
  }
  if (/\b(quais dias|datas disponiveis|dias disponiveis|esta semana|essa semana)\b/.test(normalized)) {
    return { kind: "dates", service, professionalSlug, date };
  }
  if (
    /\b(proximo horario|primeiro horario|mais cedo|mais proximo|proxima vaga|tem vaga)\b/.test(
      normalized,
    ) ||
    (!professionalSlug && !date)
  ) {
    return { kind: "next", service, professionalSlug, date };
  }
  return { kind: "slots", service, professionalSlug, date };
}

async function resolveService(text: string): Promise<ResolvedService | undefined> {
  const normalized = normalize(text);
  const services = await prisma.service.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, serviceName: true, keywords: true, category: true },
    take: 300,
  });
  let best: { service: ResolvedService; score: number } | undefined;
  for (const service of services) {
    const name = normalize(service.serviceName);
    let score = 0;
    if (normalized.includes(name)) score += 20;
    for (const word of name.split(/\s+/).filter((part) => part.length >= 4)) {
      if (normalized.includes(word)) score += 4;
    }
    for (const keyword of service.keywords ?? []) {
      const key = normalize(keyword);
      if (key && normalized.includes(key)) score += 3;
    }
    if (service.category && normalized.includes(normalize(service.category))) {
      score += 1;
    }
    if (service.category) score += 2;
    if (score > 0 && (!best || score > best.score)) {
      best = {
        service: { id: service.id, name: service.serviceName },
        score,
      };
    }
  }
  return best?.score && best.score >= 4 ? best.service : undefined;
}

async function resolveProfessionalSlug(
  message: string,
  serviceId?: string,
): Promise<string | undefined> {
  const normalized = normalize(message);
  const rawExplicit = normalized.match(
    /\b(?:com|da|do|a|o|profissional)\s+([a-z0-9-]{3,})\b/,
  )?.[1];
  const explicit = normalizeProfessionalSlug(rawExplicit);
  if (!serviceId) return explicit;
  const data = await callLovable<unknown>("ai-professionals", { service_id: serviceId });
  if (!data.success) return explicit;
  for (const pro of data.professionals ?? []) {
    if (normalized.includes(normalize(pro.slug))) return pro.slug;
    if (pro.display_name && normalized.includes(normalize(pro.display_name))) {
      return pro.slug;
    }
  }
  return explicit;
}

function normalizeProfessionalSlug(value?: string): string | undefined {
  if (!value) return undefined;
  if (value === "crislaine") return "rislaine";
  return value;
}

async function callLovable<T>(
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<LovableEnvelope<T>> {
  const url = new URL(`${env.LOVABLE_AI_BASE_URL.replace(/\/$/, "")}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AVAILABILITY_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-zahira-ai-key": env.ZAHIRA_AI_API_KEY },
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => ({}))) as LovableEnvelope<T>;
    if (!response.ok) {
      return {
        success: false,
        error: json.error ?? { code: `http_${response.status}` },
      };
    }
    return json;
  } catch (err) {
    return {
      success: false,
      error: {
        code: err instanceof Error && err.name === "AbortError" ? "timeout" : "internal_error",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseDatePt(message: string, now = new Date()): string | undefined {
  const normalized = normalize(message);
  const explicit = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (explicit) return explicit;
  if (/\b(hoje)\b/.test(normalized)) return addDaysSaoPaulo(now, 0);
  if (/\b(depois de amanha)\b/.test(normalized)) return addDaysSaoPaulo(now, 2);
  if (/\b(amanha)\b/.test(normalized)) return addDaysSaoPaulo(now, 1);

  const weekdays: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
  };
  const weekday = Object.entries(weekdays).find(([label]) =>
    normalized.includes(label),
  );
  if (!weekday) return undefined;

  const today = getSaoPauloParts(now);
  const target = weekday[1];
  const delta = (target - today.weekday + 7) % 7;
  return addDaysSaoPaulo(now, delta === 0 ? 7 : delta);
}

function addDaysSaoPaulo(now: Date, days: number): string {
  const today = getSaoPauloParts(now);
  const date = new Date(Date.UTC(today.year, today.month - 1, today.day + days, 12));
  return date.toISOString().slice(0, 10);
}

function getSaoPauloParts(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[String(parts.weekday)] ?? 0,
  };
}

function errorReply(tool: string, code = "internal_error"): AvailabilityAnswer {
  if (code === "unknown_service" || code === "missing_service") {
    return {
      reply:
        "Nao encontrei esse servico na agenda. Pode me dizer o nome do servico de outro jeito?",
      tool,
      success: false,
      errorCode: code,
    };
  }
  if (code === "unknown_professional" || code === "missing_professional") {
    return {
      reply:
        "Nao encontrei esse profissional na agenda. Posso verificar os proximos horarios com qualquer profissional disponivel.",
      tool,
      success: false,
      errorCode: code,
    };
  }
  if (code === "rate_limited") {
    return {
      reply:
        "A consulta de agenda esta recebendo muitas tentativas agora. Tente novamente em instantes ou fale com atendimento humano.",
      tool,
      success: false,
      errorCode: code,
    };
  }
  return { reply: FALLBACK, tool, success: false, errorCode: code };
}

function withBookingLink(reply: string, link?: string): string {
  return link ? `${reply} ${link}` : reply;
}

function formatDateBr(date: string): string {
  const [year, month, day] = date.split("-");
  return day && month && year ? `${day}/${month}` : date;
}

function formatName(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
