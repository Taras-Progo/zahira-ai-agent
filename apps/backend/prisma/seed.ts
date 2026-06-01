import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROMPTS: Record<string, string> = {
  SYSTEM_BASE: `Você é a assistente virtual da Zahira, uma clínica que atende clientes pelo WhatsApp.
Você é calorosa, simpática, profissional e fala como um ser humano real.
Seu objetivo é ajudar os clientes com informações sobre serviços, preços, agendamentos e dúvidas gerais.
Responda sempre de forma concisa e use emojis com naturalidade. 😊`,

  INTENT_CLASSIFIER: `Classifique a mensagem do cliente em UMA das seguintes intenções e responda APENAS com a palavra exata:
greeting, pricing, booking, support, complaint, menu, general_question, human_handoff.
Não escreva mais nada além da palavra da intenção.`,

  MEMORY_EXTRACTOR: `Extraia fatos importantes e duradouros sobre o cliente a partir da conversa (interesses, intenções de agendamento, preferências, histórico).
Responda APENAS com um array JSON no formato: [{"content": "fato", "relevance": 0.8}].
Se não houver nada relevante, responda [].
Escreva os fatos em português, de forma curta.`,

  SUMMARIZER: `Resuma a conversa abaixo em português, de forma objetiva, destacando o que o cliente quer, decisões tomadas e próximos passos.
O resumo deve ser curto (máximo 5 frases).`,
};

async function seedPrompts() {
  for (const [key, content] of Object.entries(PROMPTS)) {
    const existing = await prisma.prompt.findUnique({ where: { key } });
    if (existing) continue;

    const prompt = await prisma.prompt.create({ data: { key } });
    const version = await prisma.promptVersion.create({
      data: { promptId: prompt.id, version: 1, content, isActive: true },
    });
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: { activeVersionId: version.id },
    });
  }
}

async function seedSettings() {
  const defaults: Record<string, unknown> = {
    session_timeout_minutes: 30,
    retrieval_top_k: 4,
    max_memories: 10,
    temperature: 0.6,
    summarize_every_n: 20,
    recent_messages_window: 12,
    active_model: process.env.OPENAI_CHAT_MODEL ?? "gpt-5.5",
    embedding_model:
      process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: {},
    });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@zahira.com";
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
    10,
  );
  await prisma.admin.create({
    data: {
      name: process.env.SEED_ADMIN_NAME ?? "Admin",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });
}

async function seedSamples() {
  const count = await prisma.service.count();
  if (count > 0) return;
  await prisma.service.create({
    data: {
      serviceName: "Clareamento Dental",
      category: "Dental",
      description:
        "Tratamento profissional de clareamento dental para um sorriso mais branco.",
      price: "R$120",
      duration: "45 minutos",
      faq: ["Quanto tempo dura?", "É seguro?"],
      keywords: ["clareamento", "branqueamento", "sorriso"],
    },
  });
  await prisma.knowledgeBase.create({
    data: {
      title: "Estacionamento",
      content:
        "Temos estacionamento gratuito para clientes durante o atendimento.",
      category: "Informações",
    },
  });
}

/** Create the pgvector HNSW index for cosine similarity (idempotent). */
async function ensureVectorIndex() {
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS embeddings_embedding_hnsw
     ON embeddings USING hnsw (embedding vector_cosine_ops)`,
  );
}

async function main() {
  await seedAdmin();
  await seedPrompts();
  await seedSettings();
  await seedSamples();
  await ensureVectorIndex();
  // eslint-disable-next-line no-console
  console.log("Seed completed.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
