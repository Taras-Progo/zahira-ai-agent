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
greeting, pricing, booking, opening_hours, support, complaint, menu, general_question, human_handoff.
Não escreva mais nada além da palavra da intenção.`,

  MEMORY_EXTRACTOR: `Extraia fatos importantes e duradouros sobre o cliente a partir da conversa (interesses, intenções de agendamento, preferências, histórico).
Responda APENAS com um array JSON no formato: [{"content": "fato", "relevance": 0.8}].
Se não houver nada relevante, responda [].
Escreva os fatos em português, de forma curta.`,

  SUMMARIZER: `Resuma a conversa abaixo em português, de forma objetiva, destacando o que o cliente quer, decisões tomadas e próximos passos.
O resumo deve ser curto (máximo 5 frases).`,

  SALES_PLAYBOOK: `Playbook de comunicacao da Zahira:
- Fale pouco: no maximo 2 frases curtas ou 3 bullets.
- Faca no maximo 1 pergunta por mensagem.
- Quando o cliente estiver confuso, ofereca 2 ou 3 escolhas simples.
- Nao repetir discurso de venda; explique o essencial e conduza para escolha ou atendimento humano.
- Nao confirmar disponibilidade, data, horario ou profissional pelo chat.
- Se houver muitas tentativas, confusao ou contexto sensivel, ofereca atendimento humano.`,
};

async function seedPrompts() {
  for (const [key, content] of Object.entries(PROMPTS)) {
    const existing = await prisma.prompt.findUnique({
      where: { key },
      include: { activeVersion: true },
    });
    if (existing) {
      const shouldUpgradeIntent =
        key === "INTENT_CLASSIFIER" &&
        !existing.activeVersion?.content.includes("opening_hours");
      if (!shouldUpgradeIntent) continue;

      const last = await prisma.promptVersion.findFirst({
        where: { promptId: existing.id },
        orderBy: { version: "desc" },
      });
      await prisma.promptVersion.updateMany({
        where: { promptId: existing.id },
        data: { isActive: false },
      });
      const version = await prisma.promptVersion.create({
        data: {
          promptId: existing.id,
          version: (last?.version ?? 0) + 1,
          content,
          isActive: true,
        },
      });
      await prisma.prompt.update({
        where: { id: existing.id },
        data: { activeVersionId: version.id },
      });
      continue;
    }

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
