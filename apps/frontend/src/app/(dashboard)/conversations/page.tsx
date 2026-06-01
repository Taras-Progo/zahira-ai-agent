"use client";

import Link from "next/link";
import { useConversations } from "@/hooks/queries";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function ConversationsPage() {
  const { data, isLoading } = useConversations();

  return (
    <div>
      <PageHeader
        title="Conversas"
        description="Histórico de conversas do WhatsApp"
      />
      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Nenhuma conversa ainda." />
      ) : (
        <div className="grid gap-2">
          {data.map((c) => (
            <Link key={c.session_id} href={`/conversations/${c.session_id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{c.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      Início: {formatDate(c.started_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      tone={c.status === "ACTIVE" ? "green" : "default"}
                    >
                      {c.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {c.messages_count} msgs
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
