import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./reservation.dto";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiErrorResponseDto,
  ReservationResponseDto,
} from "../docs/response.dto";

@ApiTags("Reservas")
@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}
  @Get("mine")
  @ApiOperation({
    summary: "Consultar minhas reservas",
    description:
      "Lista todas as reservas do colaborador de demonstração, incluindo canceladas, por início decrescente.",
  })
  @ApiOkResponse({ type: ReservationResponseDto, isArray: true })
  mine() {
    return this.reservations.mine();
  }
  @Post()
  @ApiOperation({
    summary: "Criar reserva",
    description:
      "Confirma uma reserva futura. Valida capacidade e período e impede sobreposição de reservas confirmadas do mesmo recurso. A identidade do colaborador é definida pela API. Atualize a data do exemplo antes de executar.",
  })
  @ApiCreatedResponse({
    description: "Reserva confirmada.",
    type: ReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      "Dados inválidos, capacidade excedida ou período inválido/no passado.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Recurso não encontrado.",
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "O recurso já está reservado nesse período.",
    type: ApiErrorResponseDto,
  })
  create(@Body() dto: CreateReservationDto) {
    return this.reservations.create(dto);
  }
  @Patch(":id/cancel")
  @ApiOperation({
    summary: "Cancelar reserva",
    description:
      "Cancela uma reserva do colaborador de demonstração que ainda não começou e libera o período. Repetir o cancelamento retorna a reserva já cancelada.",
  })
  @ApiParam({
    name: "id",
    description: "UUID da reserva, retornado na criação ou em minhas reservas.",
    format: "uuid",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiOkResponse({
    description: "Reserva cancelada.",
    type: ReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description: "UUID inválido ou reserva que já começou.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Reserva não encontrada para o colaborador atual.",
    type: ApiErrorResponseDto,
  })
  cancel(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.reservations.cancel(id);
  }
}
