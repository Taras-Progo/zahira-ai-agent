import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { enqueueEmbedding } from "../src/modules/jobs/queues.js";

const prisma = new PrismaClient();

const CATEGORY = "Corpo";

interface SeedService {
  id: string;
  serviceName: string;
  price: string;
  duration: string;
  description: string;
  keywords: string[];
  faq: string[];
}

// Real Zahira data (category "Corpo"). IDs match the source database so the
// backend can map service names to the canonical service records.
const SERVICES: SeedService[] = [
  {
    id: "5accd57a-4bbf-4564-bed9-66bae7146e0f",
    serviceName: "Bronze Maquina",
    price: "R$ 70,00",
    duration: "90 min",
    description:
      "O Bronze Máquina é um serviço estético corporal voltado para quem deseja uniformizar e realçar o tom da pele com bronzeamento feito por equipamento próprio na Zahira. É uma opção prática para clientes que querem aquele aspecto de pele bronzeada sem precisar de longa exposição ao sol. Costuma ser procurado antes de viagens, eventos, fotos ou simplesmente como cuidado estético de rotina. A sessão dura cerca de 90 minutos.",
    keywords: [
      "bronzeamento",
      "bronze",
      "pele bronzeada",
      "máquina de bronzear",
      "estética corporal",
    ],
    faq: [
      "Quanto tempo dura a sessão de bronzeamento?",
      "O bronzeamento é feito por aparelho?",
      "É indicado antes de viagens ou eventos?",
    ],
  },
  {
    id: "87194376-a7e8-4345-8278-c5218e2810dc",
    serviceName: "Drenagem Linfática",
    price: "R$ 147,00",
    duration: "60 min",
    description:
      "A Drenagem Linfática é uma técnica de massagem suave e ritmada que ajuda o corpo a estimular a circulação e reduzir a sensação de inchaço e retenção de líquidos. É bastante procurada por quem sente as pernas pesadas, percebe inchaço ao fim do dia ou busca uma sensação de leveza no corpo. A sessão dura cerca de 60 minutos e é conduzida por profissional habilitado.",
    keywords: [
      "drenagem linfática",
      "inchaço",
      "retenção de líquidos",
      "circulação",
      "pernas pesadas",
      "leveza",
    ],
    faq: [
      "A drenagem ajuda com inchaço e retenção de líquidos?",
      "Quanto tempo dura a sessão?",
      "É feita por profissional habilitado?",
    ],
  },
  {
    id: "b6ad789c-64ed-40ac-8e21-146249450321",
    serviceName: "Massagem Relaxante",
    price: "R$ 127,00",
    duration: "60 min",
    description:
      "A Massagem Relaxante é uma massagem corporal com movimentos suaves e ritmados, pensada para aliviar o estresse do dia a dia, soltar tensões leves e proporcionar uma sensação geral de bem-estar e tranquilidade. É uma boa porta de entrada para quem nunca fez massagem na Zahira e quer um momento de autocuidado sem foco em tratamento específico. A sessão dura cerca de 60 minutos.",
    keywords: [
      "massagem relaxante",
      "relaxar",
      "estresse",
      "bem-estar",
      "autocuidado",
    ],
    faq: [
      "A massagem relaxante é boa para quem está estressado?",
      "Serve para quem nunca fez massagem?",
      "Quanto tempo dura a sessão?",
    ],
  },
  {
    id: "7ee5e1cb-86b6-4cf2-a5b3-387887088555",
    serviceName: "Massagem Terapeutica",
    price: "R$ 147,00",
    duration: "60 min",
    description:
      "A Massagem Terapêutica é uma massagem com foco em aliviar tensões musculares mais marcadas, como incômodos nas costas, lombar e regiões de muita tensão do dia a dia (postura, computador, esforço repetitivo). Costuma ser procurada por clientes que já sentem o corpo travado e querem alívio. A sessão dura cerca de 60 minutos e é conduzida por profissional habilitado. A assistente não diagnostica nem afirma que a massagem cura qualquer condição; em caso de lesão, dor intensa ou indicação médica, o atendimento é encaminhado para um humano.",
    keywords: [
      "massagem terapêutica",
      "dor muscular",
      "tensão nas costas",
      "lombar",
      "ciático",
      "ombros",
    ],
    faq: [
      "A massagem terapêutica ajuda com dor nas costas e lombar?",
      "É mais firme que a massagem relaxante?",
      "Quanto tempo dura a sessão?",
    ],
  },
];

const KNOWLEDGE: { title: string; category: string; content: string }[] = [
  {
    title: "Categoria Corpo — visão geral",
    category: CATEGORY,
    content:
      "A categoria Corpo reúne serviços voltados ao cuidado corporal, bem-estar e estética do corpo: massagens (relaxante e terapêutica), drenagem linfática e bronzeamento (Bronze Máquina). É indicada para quem busca relaxar, aliviar tensões musculares, melhorar a circulação e reduzir a sensação de inchaço/retenção de líquidos, ou cuidar da aparência da pele do corpo. Quando o cliente está indeciso, faça no máximo duas perguntas curtas (se busca relaxamento ou alívio de uma tensão específica; se é a primeira vez) antes de sugerir de 1 a 3 opções, sem prometer disponibilidade.",
  },
  {
    title: "Regras de atendimento e encaminhamento humano",
    category: "Atendimento",
    content:
      "A assistente nunca inventa preços, durações, disponibilidade, contraindicações ou nomes de profissionais. A assistente não confirma agendamentos: o agendamento é feito pelo fluxo oficial. Encaminhe para atendimento humano quando o cliente: fizer perguntas médicas, clínicas ou de diagnóstico; mencionar gravidez, lesão, dor intensa, varizes, trombose, pós-operatório ou condição de saúde; pedir negociação de preço, desconto ou pacote; reclamar ou demonstrar insatisfação; ou quando o caso for ambíguo ou fora do escopo dos serviços. Use linguagem acolhedora, simples e brasileira, sem jargão médico.",
  },
  {
    title: "Agendamento e preços atualizados",
    category: "Atendimento",
    content:
      "Os preços e durações podem mudar. Quando o cliente pedir o valor final, confirme que vai verificar o valor atualizado e siga o fluxo oficial. Não prometa horários nem profissionais específicos pela conversa; sempre direcione o cliente ao fluxo de agendamento, que consulta a agenda real.",
  },
];

async function seedServices() {
  for (const s of SERVICES) {
    await prisma.service.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        serviceName: s.serviceName,
        category: CATEGORY,
        description: s.description,
        price: s.price,
        duration: s.duration,
        faq: s.faq as Prisma.InputJsonValue,
        keywords: s.keywords,
        isActive: true,
        deletedAt: null,
      },
      update: {
        serviceName: s.serviceName,
        category: CATEGORY,
        description: s.description,
        price: s.price,
        duration: s.duration,
        faq: s.faq as Prisma.InputJsonValue,
        keywords: s.keywords,
        isActive: true,
        deletedAt: null,
      },
    });
    await enqueueEmbedding({ sourceType: "SERVICE", sourceId: s.id });
  }
}

async function seedKnowledge() {
  for (const k of KNOWLEDGE) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { title: k.title },
    });
    if (existing) {
      const updated = await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: {
          content: k.content,
          category: k.category,
          isActive: true,
          deletedAt: null,
        },
      });
      await enqueueEmbedding({ sourceType: "KNOWLEDGE", sourceId: updated.id });
    } else {
      const created = await prisma.knowledgeBase.create({
        data: { title: k.title, content: k.content, category: k.category },
      });
      await enqueueEmbedding({ sourceType: "KNOWLEDGE", sourceId: created.id });
    }
  }
}

/** Remove the placeholder demo records inserted by the base seed. */
async function removeDemoData() {
  await prisma.service.deleteMany({ where: { serviceName: "Clareamento Dental" } });
  await prisma.knowledgeBase.deleteMany({ where: { title: "Estacionamento" } });
}

async function main() {
  await removeDemoData();
  await seedServices();
  await seedKnowledge();
  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${SERVICES.length} services and ${KNOWLEDGE.length} knowledge entries (embedding jobs enqueued).`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
