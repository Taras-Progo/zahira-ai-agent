"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useMemories, useMemoryMutations } from "@/hooks/queries";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function MemoryPage() {
  const [userId, setUserId] = useState("");
  const [active, setActive] = useState("");
  const { data } = useMemories(active);
  const { create, remove } = useMemoryMutations(active);
  const [newContent, setNewContent] = useState("");

  return (
    <div>
      <PageHeader
        title="Memórias"
        description="Inspecione, adicione ou remova memórias de um cliente (por User ID)"
      />
      <Card className="mb-6">
        <CardContent className="flex items-end gap-3 p-5">
          <div className="flex-1 space-y-1.5">
            <Label>User ID</Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID do usuário (veja em Sessões)"
            />
          </div>
          <Button onClick={() => setActive(userId.trim())}>Carregar</Button>
        </CardContent>
      </Card>

      {active && (
        <>
          <Card className="mb-4">
            <CardContent className="flex items-end gap-3 p-5">
              <div className="flex-1 space-y-1.5">
                <Label>Nova memória</Label>
                <Input
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ex: Interessado em clareamento"
                />
              </div>
              <Button
                onClick={async () => {
                  if (!newContent.trim()) return;
                  await create.mutateAsync({
                    user_id: active,
                    content: newContent.trim(),
                  });
                  setNewContent("");
                }}
              >
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </CardContent>
          </Card>

          {!data || data.length === 0 ? (
            <EmptyState message="Nenhuma memória para este usuário." />
          ) : (
            <div className="grid gap-2">
              {data.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm">{m.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(m.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="primary">{m.type}</Badge>
                      <Badge>rel: {m.relevance_score.toFixed(2)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(m.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
