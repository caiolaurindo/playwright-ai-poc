import { test, expect } from '@playwright/test';

test('adiciona itens na lista do TodoMVC', async ({ page }) => {
  const todos = ['Estudar Playwright', 'Validar a demo', 'Enviar relatório'];

  await page.goto('https://demo.playwright.dev/todomvc');

  for (const todo of todos) {
    await page.getByPlaceholder('What needs to be done?').fill(todo);
    await page.getByPlaceholder('What needs to be done?').press('Enter');
  }

  await expect(page.locator('.todo-list li')).toHaveCount(3);

  for (const todo of todos) {
    await expect(page.locator('.todo-list')).toContainText(todo);
  }
});
