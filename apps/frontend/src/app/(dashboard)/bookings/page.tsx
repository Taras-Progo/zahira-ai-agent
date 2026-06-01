"use client";

import { useBookings, useBookingMutation } from "@/hooks/queries";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUSES = ["REQUESTED", "CONFIRMED", "CANCELLED"] as const;

const tone: Record<string, "amber" | "green" | "red"> = {
  REQUESTED: "amber",
  CONFIRMED: "green",
  CANCELLED: "red",
};

export default function BookingsPage() {
  const { data, isLoading } = useBookings();
  const mutate = useBookingMutation();

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Solicitações de agendamento capturadas nas conversas"
      />
      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Nenhuma reserva registrada." />
      ) : (
        <div className="grid gap-2">
          {data.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{b.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.service_name ?? "Serviço não especificado"} ·{" "}
                    {formatDate(b.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={tone[b.status] ?? "default"}>{b.status}</Badge>
                  <select
                    className="rounded-md border border-input bg-card px-2 py-1.5 text-sm"
                    value={b.status}
                    onChange={(e) =>
                      mutate.mutate({
                        id: b.id,
                        body: { status: e.target.value },
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
