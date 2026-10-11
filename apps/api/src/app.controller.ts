import { Controller, Get } from "@nestjs/common";
import { DEMO_COLLABORATOR } from "./demo-collaborator";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CollaboratorResponseDto,
  HealthResponseDto,
} from "./docs/response.dto";

@ApiTags("Sistema")
@Controller()
export class AppController {
  @Get("health")
  @ApiOperation({ summary: "Consultar estado da API" })
  @ApiOkResponse({ description: "API em execução.", type: HealthResponseDto })
  health() {
    return { status: "ok", application: "AgendaLab" };
  }

  @Get("me")
  @ApiOperation({
    summary: "Consultar colaborador de demonstração",
    description:
      "Retorna a identidade fixa utilizada pela POC, sem autenticação.",
  })
  @ApiOkResponse({ type: CollaboratorResponseDto })
  me() {
    return DEMO_COLLABORATOR;
  }
}
