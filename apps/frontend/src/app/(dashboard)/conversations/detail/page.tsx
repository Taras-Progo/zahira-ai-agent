"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useConversation } from "@/hooks/queries";
import { PageHeader, LoadingState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

function ConversationDetail() {
  const params = useSearchParams();
  const sessionId = params.get("session") ?? "";
  const { data, isLoading } = useConversation(sessionId);

  return (
    <div>
      <PageHeader
        title="Detalhe da conversa"
        description={data?.phone}
        action={
          <Link href="/conversations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>
        }
      />
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            {data.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "USER" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                    m.role === "USER"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] opacity-70">
                    <span>{formatDate(m.created_at)}</span>
                    {m.intent && <Badge tone="primary">{m.intent}</Badge>}
                    {m.ai_exit && <Badge tone="blue">{m.ai_exit}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ConversationDetailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ConversationDetail />
    </Suspense>
  );
}
