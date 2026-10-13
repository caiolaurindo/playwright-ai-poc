import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("textbox", { name: "Data" }).fill("2026-10-15");
  await page.getByRole("textbox", { name: "Horário de início" }).fill("11:00");
  await page.getByRole("textbox", { name: "Horário de término" }).fill("13:00");
  await page.getByRole("button", { name: "Consultar disponibilidade" }).click();
});
