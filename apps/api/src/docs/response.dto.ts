import { ApiProperty } from "@nestjs/swagger";
import type {
  Collaborator,
  Reservation,
  Resource,
  ResourceType,
} from "../contracts";

export class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status!: string;

  @ApiProperty({ example: "AgendaLab" })
  application!: string;
}

export class CollaboratorResponseDto implements Collaborator {
  @ApiProperty({ example: "colaborador-demo" })
  id!: string;

  @ApiProperty({ example: "Ana Silva" })
  name!: string;

  @ApiProperty({ example: "ana.silva@example.com", format: "email" })
  email!: string;

  @ApiProperty({ example: "Secretaria de Administração" })
  department!: string;
}

export class ResourceResponseDto implements Resource {
  @ApiProperty({ example: "sala-capibaribe" })
  id!: string;

  @ApiProperty({ example: "Sala Capibaribe" })
  name!: string;

  @ApiProperty({ enum: ["room", "projector", "notebook"], example: "room" })
  type!: ResourceType;

  @ApiProperty({ example: "Edifício Sede · 1º andar" })
  location!: string;

  @ApiProperty({ example: "Um espaço reservado para reuniões de equipe." })
  description!: string;

  @ApiProperty({ type: "integer", minimum: 1, example: 8 })
  capacity!: number;

  @ApiProperty({ type: [String], example: ["Wi-Fi", "Quadro branco"] })
  features!: string[];

  @ApiProperty({
    example: true,
    description:
      "No catálogo, indica disponibilidade no período consultado (ou agora, sem período). " +
      "Na resposta de uma reserva, é apenas o valor padrão do cadastro do recurso; consulte /api/resources para verificar disponibilidade.",
  })
  available!: boolean;
}

export class ReservationResponseDto implements Reservation {
  @ApiProperty({
    format: "uuid",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id!: string;

  @ApiProperty({ example: "sala-capibaribe" })
  resourceId!: string;

  @ApiProperty({ example: "colaborador-demo" })
  collaboratorId!: string;

  @ApiProperty({ example: "Alinhamento da equipe" })
  title!: string;

  @ApiProperty({ enum: ["Perpart", "Seduh"], example: "Perpart" })
  organization!: Reservation["organization"];

  @ApiProperty({
    enum: ["Reunião interna", "Atendimento externo", "Capacitação"],
    example: "Reunião interna",
  })
  requestType!: Reservation["requestType"];

  @ApiProperty({ example: "Secretaria de Administração" })
  requestDetail!: string;

  @ApiProperty({
    example: "Apresentação do planejamento",
    description: "String vazia quando não informada.",
  })
  notes!: string;

  @ApiProperty({ type: "integer", minimum: 1, example: 4 })
  participants!: number;

  @ApiProperty({
    format: "date-time",
    example: "2027-01-12T12:00:00.000Z",
    description: "Início normalizado em UTC; equivale a 09h em Brasília.",
  })
  startAt!: string;

  @ApiProperty({
    format: "date-time",
    example: "2027-01-12T13:00:00.000Z",
    description: "Término normalizado em UTC; equivale a 10h em Brasília.",
  })
  endAt!: string;

  @ApiProperty({
    enum: ["confirmed", "cancelled"],
    example: "confirmed",
    description:
      "Reservas concluídas continuam com status confirmed; a conclusão é calculada a partir de endAt.",
  })
  status!: Reservation["status"];

  @ApiProperty({ format: "date-time", example: "2027-01-11T15:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ type: () => ResourceResponseDto })
  resource!: ResourceResponseDto;
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: "integer", example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
    example: "O horário de término deve ser posterior ao início.",
  })
  message!: string | string[];

  @ApiProperty({ example: "Bad Request" })
  error!: string;
}
