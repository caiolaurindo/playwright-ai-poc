export const TIME_ZONE = "America/Sao_Paulo";
export function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) =>
    parts.find((entry) => entry.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function initialPeriod() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { date: localDate(tomorrow), start: "09:00", end: "10:00" };
}
export function toTimestamp(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function periodError(
  date: string,
  start: string,
  end: string,
  future = true,
) {
  if (!date || !start || !end) return "Preencha a data e os dois horários.";
  const begin = new Date(toTimestamp(date, start));
  const finish = new Date(toTimestamp(date, end));
  if (!Number.isFinite(begin.getTime()) || !Number.isFinite(finish.getTime()))
    return "Informe uma data e horários válidos.";
  if (end <= start) return "O término deve ser posterior ao início.";
  if (start < "08:00" || end > "18:00")
    return "Escolha horários entre 08h e 18h.";
  if (future && begin.getTime() <= Date.now())
    return "Escolha um horário futuro.";
  return "";
}
