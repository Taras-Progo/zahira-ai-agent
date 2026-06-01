"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { KnowledgeDTO } from "@zahira/types";
import { useKnowledge, useKnowledgeMutations } from "@/hooks/queries";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface FormState {
  id?: string;
  title: string;
  category: string;
  content: string;
}

const EMPTY: FormState = { title: "", category: "", content: "" };

export default function KnowledgePage() {
  const { data, isLoading } = useKnowledge();
  const { create, update, remove } = useKnowledgeMutations();
  const [form, setForm] = useState<FormState | null>(null);

  function startEdit(k: KnowledgeDTO) {
    setForm({
      id: k.id,
      title: k.title,
      category: k.category ?? "",
      content: k.content,
    });
  }

  async function submit() {
    if (!form) return;
    const body = {
      title: form.title,
      category: form.category || undefined,
      content: form.content,
    };
    if (form.id) await update.mutateAsync({ id: form.id, body });
    else await create.mutateAsync(body);
    setForm(null);
  }

  return (
    <div>
      <PageHeader
        title="Base de Conhecimento"
        description="Políticas, informações da clínica, FAQs - embeddings gerados automaticamente"
        action={
          <Button onClick={() => setForm({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Nova entrada
          </Button>
        }
      />

      {form && (
        <Card className="mb-6">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo</Label>
              <Textarea
                className="min-h-[140px]"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={submit}
                disabled={create.isPending || update.isPending}
              >
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Nenhuma entrada cadastrada." />
      ) : (
        <div className="grid gap-3">
          {data.map((k) => (
            <Card key={k.id}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{k.title}</h3>
                    {k.category && <Badge tone="primary">{k.category}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {k.content}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(k)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(k.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
