import { expect, test } from "@playwright/test";

const reservationCases = [
  {
    name: "reunião interna para equipe pequena",
    organization: "Perpart",
    requestType: "Reunião interna",
    title: "Alinhamento do projeto",
    participants: "3",
    start: "09:00",
    end: "10:00",
  },
  {
    name: "atendimento externo com entidade visitante",
    organization: "Seduh",
    requestType: "Atendimento externo",
    requestDetail: "Secretaria de Administração",
    title: "Atendimento sobre serviços",
    participants: "5",
    start: "14:00",
    end: "15:30",
  },
  {
    name: "capacitação com tema informado",
    organization: "Perpart",
    requestType: "Capacitação",
    requestDetail: "Acessibilidade digital",
    title: "Oficina de acessibilidade",
    participants: "8",
    start: "16:00",
    end: "17:00",
  },
] as const;

test.describe("Nova reserva: variações válidas", () => {
  for (const reservationCase of reservationCases) {
    test(`confirma ${reservationCase.name}`, async ({ page }) => {
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
            id: `test-${Date.now()}`,
            ...payload,
            collaboratorId: "colaborador-demo",
            status: "confirmed",
            createdAt: new Date().toISOString(),
            resource: {
              id: "sala-capibaribe",
              name: "Sala Capibaribe",
              type: "room",
              location: "Edifício Sede · 1º andar",
              description: "Sala de reunião",
              capacity: 8,
              features: [],
              available: true,
            },
          }),
        });
      });

      await page.goto("http://localhost:3000/");
      await page.getByRole("button", { name: "Nova reserva" }).click();

      const form = page.getByRole("dialog", { name: "Nova reserva" });
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

      if (reservationCase.requestDetail) {
        await form.locator("#reserva-detalhe-solicitacao").fill(
          reservationCase.requestDetail,
        );
      }

      const date = await form.locator("#reserva-data").inputValue();
      const reservation = {
        ...reservationCase,
        date,
        resource: "Sala Capibaribe",
      };

      await form.locator("#reserva-titulo").fill(reservation.title);
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

      if (reservationCase.requestDetail) {
        await expect(form.locator("#reserva-detalhe-solicitacao")).toHaveValue(
          reservationCase.requestDetail,
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
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  const form = page.getByRole("dialog", { name: "Nova reserva" });
  await form.locator("#reserva-titulo").fill("Período inválido");
  await form.locator("#reserva-inicio").fill("11:00");
  await form.locator("#reserva-fim").fill("10:00");
  await form.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(form.getByRole("alert")).toContainText(/posterior/);
  await expect(form).toBeVisible();
});

test("exige o órgão visitante em solicitações de atendimento externo", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  const form = page.getByRole("dialog", { name: "Nova reserva" });
  const requestType = form.locator("#reserva-tipo-solicitacao");
  await form.locator(".p-dropdown").nth(1).click();
  await form.getByRole("option", { name: "Atendimento externo" }).click();
  await form.locator("#reserva-titulo").fill("Atendimento sem visitante");

  const detail = form.locator("#reserva-detalhe-solicitacao");
  await expect(detail).toHaveAttribute("required", "");
  await expect(form.getByRole("button", { name: "Confirmar reserva" })).toBeVisible();
  await expect(form).toBeVisible();
});
