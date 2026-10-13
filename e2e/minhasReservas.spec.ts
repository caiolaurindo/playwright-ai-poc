import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page
    .getByRole("link", { name: "Minhas reservas", exact: true })
    .click();
  await page.getByRole("button", { name: "Canceladas" }).click();
  await page.getByRole("button", { name: "Concluídas" }).click();
  await page.getByRole("button", { name: "Próximas" }).click();
  await page
    .getByRole("article")
    .filter({ hasText: "14 de out. de 202610:00 – 11:" })
    .getByLabel("Cancelar reserva alinhamento")
    .click();
  await page.getByRole("button", { name: "Sim, cancelar reserva" }).click();
  await page
    .getByRole("button", { name: "Cancelar reserva alinhamento de equipe" })
    .click();
  await page.getByRole("button", { name: "Sim, cancelar reserva" }).click();
  await page
    .getByRole("article")
    .filter({ hasText: "17 de out. de 202613:00 – 15:" })
    .getByLabel("Cancelar reserva Alinhamento")
    .click();
  await page.getByRole("button", { name: "Sim, cancelar reserva" }).click();
  await page.getByRole("button", { name: "Canceladas" }).click();
  await page.getByRole("button", { name: "Próximas" }).click();
});
