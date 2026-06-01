"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatResponse } from "@zahira/types";
import { useChat } from "@/hooks/queries";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatLine {
  role: "user" | "assistant";
  content: string;
  meta?: ChatResponse;
}

export default function AiTestPage() {
  const [phone, setPhone] = useState("+5511999999999");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const chat = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = input.trim();
    if (!message) return;
    setInput("");
    setLines((prev) => [...prev, { role: "user", content: message }]);

    try {
      const res = await chat.mutateAsync({ phone, message, session_id: sessionId });
      setSessionId(res.session_id);
      setLines((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, meta: res },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao enviar";
      setLines((prev) => [
        ...prev,
        { role: "assistant", content: `[erro] ${msg}` },
      ]);
    }
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 50);
  }

  function reset() {
    setLines([]);
    setSessionId(undefined);
  }

  return (
    <div>
      <PageHeader
        title="Painel de Teste IA"
        description="Simule conversas do WhatsApp usando o mesmo endpoint da produção (POST /api/chat)"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Conversa</CardTitle>
            <Button variant="outline" size="sm" onClick={reset}>
              Nova sessão
            </Button>
          </CardHeader>
          <CardContent>
            <div
              ref={scrollRef}
              className="mb-4 h-[55vh] space-y-3 overflow-y-auto rounded-md border border-border bg-muted/30 p-4"
            >
              {lines.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Envie uma mensagem para começar.
                </p>
              )}
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    line.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      line.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{line.content}</p>
                    {line.meta && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="primary">{line.meta.intent}</Badge>
                        <Badge tone="blue">{line.meta.ai_exit}</Badge>
                        <Badge>
                          docs: {line.meta.metadata.retrieved_documents}
                        </Badge>
                        <Badge>tokens: {line.meta.metadata.tokens_used}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite uma mensagem em português..."
              />
              <Button type="submit" disabled={chat.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone de teste</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session ID</Label>
              <p className="break-all rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {sessionId ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
