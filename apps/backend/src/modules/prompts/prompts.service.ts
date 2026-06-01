import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";

const cache = new Map<string, { content: string; version: number; at: number }>();
const CACHE_TTL_MS = 30_000;

/** Resolve the active prompt content for a key (cached). Falls back to ''. */
export async function resolveActive(
  key: string,
): Promise<{ content: string; version: number }> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { content: cached.content, version: cached.version };
  }

  const prompt = await prisma.prompt.findUnique({
    where: { key },
    include: { activeVersion: true },
  });

  const content = prompt?.activeVersion?.content ?? "";
  const version = prompt?.activeVersion?.version ?? 0;
  cache.set(key, { content, version, at: Date.now() });
  return { content, version };
}

export async function listPrompts() {
  const prompts = await prisma.prompt.findMany({
    include: { activeVersion: true },
    orderBy: { key: "asc" },
  });
  return prompts.map((p) => ({
    id: p.id,
    key: p.key,
    active_version_id: p.activeVersionId,
    active_version: p.activeVersion?.version ?? null,
    content: p.activeVersion?.content ?? "",
    updated_at: p.updatedAt.toISOString(),
  }));
}

export async function listVersions(promptId: string) {
  const versions = await prisma.promptVersion.findMany({
    where: { promptId },
    orderBy: { version: "desc" },
  });
  return versions.map((v) => ({
    id: v.id,
    prompt_id: v.promptId,
    version: v.version,
    content: v.content,
    is_active: v.isActive,
    created_by: v.createdBy,
    created_at: v.createdAt.toISOString(),
  }));
}

/** Create a new version, mark it active, and point the prompt at it. */
export async function updateContent(
  promptId: string,
  content: string,
  adminId: string,
) {
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw notFound("Prompt não encontrado");

  const last = await prisma.promptVersion.findFirst({
    where: { promptId },
    orderBy: { version: "desc" },
  });
  const nextVersion = (last?.version ?? 0) + 1;

  const result = await prisma.$transaction(async (tx) => {
    await tx.promptVersion.updateMany({
      where: { promptId },
      data: { isActive: false },
    });
    const version = await tx.promptVersion.create({
      data: {
        promptId,
        version: nextVersion,
        content,
        isActive: true,
        createdBy: adminId,
      },
    });
    await tx.prompt.update({
      where: { id: promptId },
      data: { activeVersionId: version.id },
    });
    return version;
  });

  cache.delete(prompt.key);
  return result;
}

/** Roll back the active version to an existing version. */
export async function rollback(promptId: string, versionId: string) {
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw notFound("Prompt não encontrado");

  const target = await prisma.promptVersion.findFirst({
    where: { id: versionId, promptId },
  });
  if (!target) throw notFound("Versão não encontrada");

  await prisma.$transaction([
    prisma.promptVersion.updateMany({
      where: { promptId },
      data: { isActive: false },
    }),
    prisma.promptVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    }),
    prisma.prompt.update({
      where: { id: promptId },
      data: { activeVersionId: versionId },
    }),
  ]);

  cache.delete(prompt.key);
  return target;
}
