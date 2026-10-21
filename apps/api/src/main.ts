import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : true;
  app.enableCors({ origin: corsOrigins });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  const swaggerConfig = new DocumentBuilder()
    .setTitle("AgendaLab API")
    .setDescription(
      "API de reserva de ambientes e equipamentos. POC com colaborador fixo de demonstração, sem autenticação. " +
        "Reservas no mesmo dia, entre 08h e 18h no horário de Brasília (UTC−03), com início no futuro. " +
        "Use uma data futura nos exemplos ao executar solicitações.",
    )
    .setVersion("0.1.0")
    .addTag("Sistema", "Estado da API e colaborador de demonstração")
    .addTag("Recursos", "Catálogo e consulta de disponibilidade")
    .addTag("Reservas", "Criação, consulta e cancelamento de reservas")
    .build();

  SwaggerModule.setup(
    "api/docs",
    app,
    () => SwaggerModule.createDocument(app, swaggerConfig),
    {
      jsonDocumentUrl: "api/docs-json",
      customSiteTitle: "AgendaLab | Documentação da API",
      swaggerOptions: { displayRequestDuration: true, validatorUrl: null },
    },
  );
  await app.listen(
    Number(process.env.PORT ?? 3001),
    process.env.HOST ?? "0.0.0.0",
  );
}
void bootstrap();
