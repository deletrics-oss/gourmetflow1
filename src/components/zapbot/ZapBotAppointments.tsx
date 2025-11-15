import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, List, Loader2, User, Clock, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ZapBotAppointments() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["whatsapp-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_appointments")
        .select("*")
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const appointmentsOnSelectedDate = appointments?.filter((apt) => {
    if (!selectedDate || !apt.appointment_date) return false;
    const aptDate = new Date(apt.appointment_date);
    return (
      aptDate.toDateString() === selectedDate.toDateString()
    );
  });

  const datesWithAppointments = appointments
    ?.filter((apt) => apt.appointment_date)
    .map((apt) => new Date(apt.appointment_date));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmado":
        return "bg-green-100 text-green-800 border-green-200";
      case "pendente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelado":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compromissos
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendário
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === "list" ? (
        <Card>
          <CardContent className="pt-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {appointments?.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{apt.customer_name || "Sem nome"}</span>
                      </div>
                      <Badge className={getStatusColor(apt.status || "pendente")}>
                        {apt.status || "pendente"}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {apt.appointment_date
                          ? format(new Date(apt.appointment_date), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })
                          : "Não agendado"}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {apt.appointment_type || "Tipo não especificado"}
                      </div>
                      {apt.notas && (
                        <p className="text-xs mt-2 p-2 bg-muted rounded">{apt.notas}</p>
                      )}
                    </div>
                  </div>
                ))}
                {appointments?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum compromisso agendado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="rounded-md border"
                modifiers={{
                  hasAppointment: datesWithAppointments || [],
                }}
                modifiersStyles={{
                  hasAppointment: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                    color: "hsl(var(--primary))",
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : "Selecione uma data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {appointmentsOnSelectedDate?.map((apt) => (
                    <div key={apt.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{apt.customer_name}</span>
                        <Badge
                          variant="outline"
                          className={getStatusColor(apt.status || "pendente")}
                        >
                          {apt.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {apt.appointment_date &&
                          format(new Date(apt.appointment_date), "HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">{apt.appointment_type}</p>
                    </div>
                  ))}
                  {appointmentsOnSelectedDate?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum compromisso nesta data
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
