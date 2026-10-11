import { BadRequestException } from "@nestjs/common";

export function validatePeriod(
  startAt: string,
  endAt: string,
  requireFuture = false,
) {
  // Exigir fuso explícito evita horários diferentes conforme o ambiente da API.
  const withOffset = /(?:Z|[+-]\d{2}:\d{2})$/;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (
    !withOffset.test(startAt) ||
    !withOffset.test(endAt) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime())
  ) {
    throw new BadRequestException("Informe datas válidas com o fuso horário.");
  }
  if (end <= start)
    throw new BadRequestException(
      "O horário de término deve ser posterior ao início.",
    );
  if (requireFuture && start.getTime() <= Date.now())
    throw new BadRequestException(
      "A reserva deve começar em um horário futuro.",
    );
  const localStart = new Date(start.getTime() - 3 * 60 * 60 * 1000);
  const localEnd = new Date(end.getTime() - 3 * 60 * 60 * 1000);
  const startMinutes =
    localStart.getUTCHours() * 60 + localStart.getUTCMinutes();
  const endMinutes = localEnd.getUTCHours() * 60 + localEnd.getUTCMinutes();
  if (
    localStart.toISOString().slice(0, 10) !==
      localEnd.toISOString().slice(0, 10) ||
    startMinutes < 480 ||
    endMinutes > 1080 ||
    start.getUTCSeconds() !== 0 ||
    end.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0 ||
    end.getUTCMilliseconds() !== 0
  ) {
    throw new BadRequestException(
      "Escolha um período no mesmo dia, entre 08h e 18h, sem segundos.",
    );
  }
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
