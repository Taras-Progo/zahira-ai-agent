"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { ServiceDTO } from "@zahira/types";
import { useServices, useServiceMutations } from "@/hooks/queries";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface FormState {
  id?: string;
  service_name: string;
  category: string;
  description: string;
  price: string;
  duration: string;
  faq: string;
  keywords: string;
}

const EMPTY: FormState = {
  service_name: "",
  category: "",
  description: "",
  price: "",
  duration: "",
  faq: "",
  keywords: "",
};

export default function ServicesPage() {
  const { data, isLoading } = useServices();
  const { create, update, remove } = useServiceMutations();
  const [form, setForm] = useState<FormState | null>(null);

  function startEdit(s: ServiceDTO) {
    setForm({
      id: s.id,
      service_name: s.service_name,
      category: s.category ?? "",
      description: s.description ?? "",
      price: s.price ?? "",
      duration: s.duration ?? "",
      faq: s.faq.join("\n"),
      keywords: s.keywords.join(", "),
    });
  }

  async function submit() {
    if (!form) return;
    const body = {
      service_name: form.service_name,
      category: form.category || undefined,
      description: form.description || undefined,
      price: form.price || undefined,
      duration: form.duration || undefined,
      faq: form.faq
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      keywords: form.keywords
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    if (form.id) await update.mutateAsync({ id: form.id, body });
    else await create.mutateAsync(body);
    setForm(null);
  }

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Os embeddings são gerados automaticamente ao salvar"
        action={
          <Button onClick={() => setForm({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Novo serviço
          </Button>
        }
      />

      {form && (
        <Card className="mb-6">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do serviço">
                <Input
                  value={form.service_name}
                  onChange={(e) =>
                    setForm({ ...form, service_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Categoria">
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </Field>
              <Field label="Preço">
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Duração">
                <Input
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Descrição">
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="FAQ (uma por linha)">
              <Textarea
                value={form.faq}
                onChange={(e) => setForm({ ...form, faq: e.target.value })}
              />
            </Field>
            <Field label="Palavras-chave (separadas por vírgula)">
              <Input
                value={form.keywords}
                onChange={(e) =>
                  setForm({ ...form, keywords: e.target.value })
                }
              />
            </Field>
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
        <EmptyState message="Nenhum serviço cadastrado." />
      ) : (
        <div className="grid gap-3">
          {data.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{s.service_name}</h3>
                    {s.category && <Badge tone="primary">{s.category}</Badge>}
                    {s.price && <Badge tone="green">{s.price}</Badge>}
                  </div>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  {s.keywords.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {s.keywords.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(s.id)}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
