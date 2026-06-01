"use client";

import { useSupport, useSupportMutation } from "@/hooks/queries";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const tone: Record<string, "amber" | "blue" | "green"> = {
  PENDING: "amber",
  ASSIGNED: "blue",
  RESOLVED: "green",
};

export default function SupportPage() {
  const { data, isLoading } = useSupport();
  const mutate = useSupportMutation();

  return (
    <div>
      <PageHeader
        title="Fila de Suporte"
        description="Solicitações de atendimento humano (ai_exit = SUPPORT)"
      />
      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Nenhuma solicitação de suporte." />
      ) : (
        <div className="grid gap-2">
          {data.map((h) => (
            <Card key={h.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{h.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Aberto em {formatDate(h.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tone[h.status] ?? "default"}>{h.status}</Badge>
                  {h.status !== "RESOLVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        mutate.mutate({
                          id: h.id,
                          body: { status: "RESOLVED" },
                        })
                      }
                    >
                      Resolver
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
