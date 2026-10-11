import { Controller, Get } from "@nestjs/common";
import { DEMO_COLLABORATOR } from "./demo-collaborator";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return { status: "ok", application: "AgendaLab" };
  }

  @Get("me")
  me() {
    return DEMO_COLLABORATOR;
  }
}
