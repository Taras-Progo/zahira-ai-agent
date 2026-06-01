"use client";

import { useState } from "react";
import { History, Save, RotateCcw } from "lucide-react";
import { usePrompts, usePromptVersions, usePromptMutations } from "@/hooks/queries";
import { PageHeader, LoadingState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function PromptsPage() {
  const { data, isLoading } = usePrompts();
  const { update, rollback } = usePromptMutations();
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Prompts"
        description="Edite os prompts do sistema com versionamento e rollback (sem redeploy)"
      />
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4">
          {data.map((p) => {
            const value = editing[p.id] ?? p.content;
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {p.key}
                    <Badge tone="primary">v{p.active_version ?? 0}</Badge>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setHistoryFor(historyFor === p.id ? null : p.id)
                    }
                  >
                    <History className="h-4 w-4" /> Versões
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    className="min-h-[120px] font-mono text-xs"
                    value={value}
                    onChange={(e) =>
                      setEditing({ ...editing, [p.id]: e.target.value })
                    }
                  />
                  <Button
                    size="sm"
                    disabled={value === p.content || update.isPending}
                    onClick={() =>
                      update.mutate({ id: p.id, content: value })
                    }
                  >
                    <Save className="h-4 w-4" /> Salvar nova versão
                  </Button>

                  {historyFor === p.id && <VersionList promptId={p.id} onRollback={(versionId) => rollback.mutate({ id: p.id, versionId })} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VersionList({
  promptId,
  onRollback,
}: {
  promptId: string;
  onRollback: (versionId: string) => void;
}) {
  const { data } = usePromptVersions(promptId);
  if (!data) return null;
  return (
    <div className="mt-2 space-y-2 rounded-md border border-border p-3">
      {data.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <Badge tone={v.is_active ? "green" : "default"}>v{v.version}</Badge>
            <span className="text-muted-foreground">
              {formatDate(v.created_at)}
            </span>
          </div>
          {!v.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRollback(v.id)}
            >
              <RotateCcw className="h-3 w-3" /> Restaurar
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
