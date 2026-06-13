import { prisma } from "../../lib/prisma.js";

export interface CategoryInfoAnswer {
  reply: string;
  tool: string;
  category?: string;
}

const CATEGORY_ALIASES: Array<{ category: string; aliases: string[] }> = [
  { category: "Cabelos", aliases: ["cabelos", "cabelo", "hair", "haircategory"] },
  { category: "Corpo", aliases: ["corpo", "body"] },
  {
    category: "Estética & Imagem",
    aliases: ["estetica", "estetica imagem", "imagem", "beauty", "aesthetic"],
  },
  { category: "Masculino", aliases: ["masculino", "male", "men", "barba"] },
  { category: "Mente", aliases: ["mente", "mind", "mental"] },
  { category: "Performance", aliases: ["performance"] },
  { category: "Saúde", aliases: ["saude", "health"] },
  {
    category: "Tratamentos Específicos",
    aliases: ["tratamentos especificos", "specific treatments", "microvasos"],
  },
];

export async function buildCategoryInfoAnswer(
  message: string,
): Promise<CategoryInfoAnswer | null> {
  if (!isCategoryQuestion(message)) return null;

  const category = resolveCategory(message);
  if (!category) {
    const categories = await prisma.service.findMany({
      where: { isActive: true, deletedAt: null, NOT: { category: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
    return {
      reply: `Temos estas categorias: ${categories
        .map((item) => item.category)
        .filter(Boolean)
        .join(", ")}. Qual delas voce quer ver?`,
      tool: "category-info",
    };
  }

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      category,
    },
    select: {
      serviceName: true,
      price: true,
      duration: true,
    },
    orderBy: { serviceName: "asc" },
  });

  if (services.length === 0) {
    return {
      reply: `Nao encontrei servicos ativos na categoria ${category}. Posso mostrar as categorias disponiveis?`,
      tool: "category-info",
      category,
    };
  }

  const lines = services.map((service) => {
    const details = [service.price, service.duration].filter(Boolean).join(", ");
    return details ? `${service.serviceName} (${details})` : service.serviceName;
  });

  return {
    reply: `Na categoria ${category}, temos: ${lines.join("; ")}.`,
    tool: "category-info",
    category,
  };
}

function isCategoryQuestion(message: string): boolean {
  const normalized = normalize(message);
  return (
    normalized.includes("categoria") ||
    normalized.includes("category") ||
    /\b(servicos|services)\s+(de|da|do|of)\s+(mente|mind|saude|health|cabelo|cabelos|hair|corpo|body|estetica|beauty|performance|masculino|male)\b/.test(
      normalized,
    )
  );
}

function resolveCategory(message: string): string | undefined {
  const normalized = normalize(message);
  return CATEGORY_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => normalized.includes(alias)),
  )?.category;
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
