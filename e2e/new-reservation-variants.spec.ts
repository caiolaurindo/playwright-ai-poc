import { expect, test } from "@playwright/test";
import { fakerPT_BR as faker } from "@faker-js/faker";

type ReservationCase = {
  name: string;
  organization: "Perpart" | "Seduh";
  requestType: "Reunião interna" | "Atendimento externo" | "Capacitação";
  hasRequestDetail: boolean;
  useMaximumCapacity: boolean;
};

const reservationCases = [
  {
    name: "reunião interna para equipe pequena",
    organization: "Perpart",
    requestType: "Reunião interna",
    hasRequestDetail: false,
    useMaximumCapacity: false,
  },
  {
    name: "atendimento externo com entidade visitante",
    organization: "Seduh",
    requestType: "Atendimento externo",
    hasRequestDetail: true,
    useMaximumCapacity: false,
  },
  {
    name: "capacitação com tema informado",
    organization: "Perpart",
    requestType: "Capacitação",
    hasRequestDetail: true,
    useMaximumCapacity: true,
  },
] satisfies readonly ReservationCase[];

test.describe("Nova reserva: variações válidas", () => {
  for (const reservationCase of reservationCases) {
    test(`confirma ${reservationCase.name}`, async ({ page }) => {
      const date = faker.date.future({ years: 1 }).toISOString().slice(0, 10);
      const startHour = faker.number.int({ min: 8, max: 16 });
      const period = {
        date,
        start: `${String(startHour).padStart(2, "0")}:00`,
        end: `${String(startHour + 1).padStart(2, "0")}:00`,
      };
      let resourceName = "";
      let resourceCapacity = 1;

      await page.route("**/reservations", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }

        const payload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: faker.string.uuid(),
            ...payload,
            collaboratorId: "colaborador-demo",
            status: "confirmed",
            createdAt: new Date().toISOString(),
            resource: {
              id: payload.resourceId,
              name: resourceName,
              type: "room",
              location: "",
              description: "",
              capacity: resourceCapacity,
              features: [],
              available: true,
            },
          }),
        });
      });

      await page.goto("http://localhost:3000/");
      await page.getByRole("button", { name: "Nova reserva" }).click();

      const form = page.getByRole("dialog", { name: "Nova reserva" });
      resourceName = await form.locator("#reserva-recurso").inputValue();
      resourceCapacity = Number(
        await form.locator("#reserva-participantes").getAttribute("max"),
      );
      const reservationData = {
        ...period,
        title: `Reserva de teste ${faker.string.uuid()}`,
        participants: String(
          reservationCase.useMaximumCapacity
            ? resourceCapacity
            : faker.number.int({ min: 1, max: resourceCapacity }),
        ),
        requestDetail: faker.company.name(),
      };

      const requestType = form.locator("#reserva-tipo-solicitacao");
      if (reservationCase.requestType !== "Reunião interna") {
        await form.locator(".p-dropdown").nth(1).click();
        await form
          .getByRole("option", { name: reservationCase.requestType })
          .click();
      }

      if (reservationCase.organization === "Seduh") {
        await form.locator(".p-dropdown").nth(0).click();
        await form.getByRole("option", { name: "Seduh" }).click();
      }

      if (reservationCase.hasRequestDetail) {
        await form.locator("#reserva-detalhe-solicitacao").fill(
          reservationData.requestDetail,
        );
      }

      const reservation = {
        ...reservationCase,
        ...reservationData,
        resource: resourceName,
      };

      await form.locator("#reserva-titulo").fill(reservation.title);
      await form.locator("#reserva-data").fill(reservation.date);
      await form.locator("#reserva-inicio").fill(reservation.start);
      await form.locator("#reserva-fim").fill(reservation.end);
      await form.locator("#reserva-participantes").fill(reservation.participants);

      await expect(form.locator("#reserva-organizacao")).toHaveValue(
        reservation.organization,
      );
      await expect(requestType).toHaveValue(reservation.requestType);
      await expect(
        form.locator("#reserva-titulo"),
      ).toHaveValue(reservation.title);
      await expect(form.locator("#reserva-data")).toHaveValue(
        reservation.date,
      );
      await expect(form.locator("#reserva-inicio")).toHaveValue(
        reservation.start,
      );
      await expect(form.locator("#reserva-fim")).toHaveValue(
        reservation.end,
      );
      await expect(
        form.locator("#reserva-participantes"),
      ).toHaveValue(reservation.participants);

      if (reservationCase.hasRequestDetail) {
        await expect(form.locator("#reserva-detalhe-solicitacao")).toHaveValue(
          reservationData.requestDetail,
        );
      }

      await form.getByRole("button", { name: "Confirmar reserva" }).click();
      await expect(
        page.getByRole("status").filter({
          hasText: `Reserva de ${reservation.resource} confirmada com sucesso.`,
        }),
      ).toBeVisible();
    });
  }
});

test("impede confirmar uma reserva quando o término antecede o início", async ({
  page,
}) => {
  const title = `Reserva de teste ${faker.string.uuid()}`;
  const date = faker.date.future({ years: 1 }).toISOString().slice(0, 10);
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  const form = page.getByRole("dialog", { name: "Nova reserva" });
  await form.locator("#reserva-titulo").fill(title);
  await form.locator("#reserva-data").fill(date);
  await form.locator("#reserva-inicio").fill("11:00");
  await form.locator("#reserva-fim").fill("10:00");
  await form.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(form.getByRole("alert")).toContainText(/posterior/);
  await expect(form).toBeVisible();
});

test("exige o órgão visitante em solicitações de atendimento externo", async ({
  page,
}) => {
  const title = `Reserva de teste ${faker.string.uuid()}`;
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  const form = page.getByRole("dialog", { name: "Nova reserva" });
  const requestType = form.locator("#reserva-tipo-solicitacao");
  await form.locator(".p-dropdown").nth(1).click();
  await form.getByRole("option", { name: "Atendimento externo" }).click();
  await form.locator("#reserva-titulo").fill(title);

  const detail = form.locator("#reserva-detalhe-solicitacao");
  await expect(detail).toHaveAttribute("required", "");
  await expect(form.getByRole("button", { name: "Confirmar reserva" })).toBeVisible();
  await expect(form).toBeVisible();
});
