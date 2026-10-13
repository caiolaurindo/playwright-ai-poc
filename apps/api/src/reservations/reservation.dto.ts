import {
  IsInt,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateReservationDto {
  @ApiProperty({ enum: ["Perpart", "Seduh"] })
  @IsIn(["Perpart", "Seduh"])
  organization!: "Perpart" | "Seduh";

  @ApiProperty({
    enum: ["Reunião interna", "Atendimento externo", "Capacitação"],
  })
  @IsIn(["Reunião interna", "Atendimento externo", "Capacitação"])
  requestType!: "Reunião interna" | "Atendimento externo" | "Capacitação";

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestDetail?: string;

  @ApiProperty({
    example: "sala-capibaribe",
    minLength: 1,
    description: "Identificador de um recurso do catálogo.",
  })
  @IsString()
  @MinLength(1)
  resourceId!: string;
  @ApiProperty({
    example: "Alinhamento da equipe",
    minLength: 3,
    maxLength: 120,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(3, { message: "O título deve ter pelo menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter até 120 caracteres." })
  title!: string;
  @ApiPropertyOptional({
    example: "Apresentação do planejamento",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
  @ApiProperty({
    type: "integer",
    minimum: 1,
    example: 4,
    description: "Até a capacidade da sala. Para equipamentos, informe 1.",
  })
  @IsInt()
  @Min(1, { message: "Informe pelo menos um participante." })
  participants!: number;
  @ApiProperty({
    format: "date-time",
    example: "2027-01-12T09:00:00-03:00",
    description:
      "Início futuro com fuso explícito. Mesmo dia do término, entre 08h e 18h em Brasília, sem segundos.",
  })
  @IsISO8601({ strict: true })
  startAt!: string;
  @ApiProperty({
    format: "date-time",
    example: "2027-01-12T10:00:00-03:00",
    description:
      "Término posterior ao início, com fuso explícito, até 18h em Brasília, sem segundos.",
  })
  @IsISO8601({ strict: true })
  endAt!: string;
}

export class AvailabilityDto {
  @ApiPropertyOptional({
    format: "date-time",
    example: "2027-01-12T09:00:00-03:00",
    description:
      "Início da consulta com fuso explícito. Informe junto com endAt, no mesmo dia, entre 08h e 18h em Brasília.",
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  startAt?: string;
  @ApiPropertyOptional({
    format: "date-time",
    example: "2027-01-12T10:00:00-03:00",
    description:
      "Término da consulta com fuso explícito, posterior ao início. Informe junto com startAt.",
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  endAt?: string;
}
