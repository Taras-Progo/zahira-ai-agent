"use client";

import { useEffect, useState } from "react";
import { useSettings, useSettingsMutation } from "@/hooks/queries";
import { PageHeader, LoadingState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NUMERIC_KEYS = [
  "session_timeout_minutes",
  "retrieval_top_k",
  "max_memories",
  "temperature",
  "summarize_every_n",
  "recent_messages_window",
];

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const mutate = useSettingsMutation();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) next[k] = String(v);
      setDraft(next);
    }
  }, [data]);

  function save() {
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      body[k] = NUMERIC_KEYS.includes(k) && v !== "" ? Number(v) : v;
    }
    mutate.mutate(body);
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Parâmetros editáveis do sistema (aplicados sem redeploy)"
      />
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="space-y-4 p-5">
            {Object.keys(draft)
              .sort()
              .map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label>{key}</Label>
                  <Input
                    value={draft[key] ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            <Button onClick={save} disabled={mutate.isPending}>
              {mutate.isPending ? "Salvando..." : "Salvar configurações"}
            </Button>
            {mutate.isSuccess && (
              <p className="text-sm text-emerald-600">Configurações salvas.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
