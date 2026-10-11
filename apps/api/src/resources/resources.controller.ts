import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AvailabilityDto } from "../reservations/reservation.dto";
import { validatePeriod } from "../reservations/period";

@Controller("resources")
export class ResourcesController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
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
