import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display the landing page", async ({ page }) => {
    await page.goto("/");

    // Sprawdź, czy strona się załadowała
    await expect(page).toHaveTitle(/Dziennik Wędkarski/i);
  });

  test("should have login button", async ({ page }) => {
    await page.goto("/");

    // Sprawdź, czy przycisk logowania jest widoczny
    const loginButton = page.getByRole("button", { name: /zaloguj/i });
    await expect(loginButton).toBeVisible();
  });
});

