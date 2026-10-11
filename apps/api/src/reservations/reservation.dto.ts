import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateReservationDto {
  @IsString() @MinLength(1) resourceId!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(3, { message: "O título deve ter pelo menos 3 caracteres." })
  @MaxLength(120, { message: "O título deve ter até 120 caracteres." })
  title!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsInt()
  @Min(1, { message: "Informe pelo menos um participante." })
  participants!: number;
  @IsISO8601({ strict: true }) startAt!: string;
  @IsISO8601({ strict: true }) endAt!: string;
}

export class AvailabilityDto {
  @IsOptional() @IsISO8601({ strict: true }) startAt?: string;
  @IsOptional() @IsISO8601({ strict: true }) endAt?: string;
}
