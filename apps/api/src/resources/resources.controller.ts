import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AvailabilityDto } from "../reservations/reservation.dto";
import { validatePeriod } from "../reservations/period";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorResponseDto, ResourceResponseDto } from "../docs/response.dto";

@ApiTags("Recursos")
@Controller("resources")
export class ResourcesController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOperation({
    summary: "Listar recursos e consultar disponibilidade",
    description:
      "Retorna todos os recursos com available para o período informado. Sem parâmetros, consulta o instante atual. Informe startAt e endAt juntos, com fuso explícito, no mesmo dia, entre 08h e 18h em Brasília.",
  })
  @ApiOkResponse({ type: ResourceResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description:
      "Datas inválidas, período fora do expediente ou apenas um dos horários informado.",
    type: ApiErrorResponseDto,
  })
  list(@Query() query: AvailabilityDto) {
    if (Boolean(query.startAt) !== Boolean(query.endAt))
      throw new BadRequestException(
        "Informe início e término para consultar disponibilidade.",
      );
    const period =
      query.startAt && query.endAt
        ? validatePeriod(query.startAt, query.endAt)
        : null;
    const now = new Date().toISOString();
    return this.database.resources().map((resource) => ({
      ...resource,
      available: !this.database.hasConflict(
        resource.id,
        period?.startAt ?? now,
        period?.endAt ?? new Date(Date.now() + 1).toISOString(),
      ),
    }));
  }
}
