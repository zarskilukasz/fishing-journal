import { test, expect } from "@playwright/test";

test.describe("Logowanie", () => {
  test("powinno zalogować użytkownika z poprawnymi danymi", async ({ page }) => {
    // Przejdź do strony logowania
    await page.goto("/auth/login");

    // Poczekaj na pełną hydratację React (przycisk jest aktywny)
    const submitButton = page.getByRole("button", { name: "Zaloguj się" });
    await expect(submitButton).toBeEnabled();

    // Wypełnij formularz używając id selektorów
    await page.locator("#email").fill("test@zarskilukasz.pl");
    await page.locator("#password").fill("123456789");

    // Kliknij przycisk logowania
    await submitButton.click();

    // Poczekaj na przekierowanie do dashboardu
    await page.waitForURL("/app", { timeout: 15000 });

    // Sprawdź czy jesteśmy na stronie głównej aplikacji
    await expect(page).toHaveURL("/app");

    // Sprawdź czy widoczna jest karta powitalna lub lista wypraw
    await expect(page.getByText("Witaj w Dzienniku!").or(page.getByText("Twoje wyprawy"))).toBeVisible({
      timeout: 10000,
    });
  });

  test("powinno pokazać błąd przy niepoprawnych danych", async ({ page }) => {
    await page.goto("/auth/login");

    // Poczekaj na pełną hydratację React
    const submitButton = page.getByRole("button", { name: "Zaloguj się" });
    await expect(submitButton).toBeEnabled();

    // Wypełnij formularz z niepoprawnym hasłem
    await page.locator("#email").fill("test@zarskilukasz.pl");
    await page.locator("#password").fill("zle_haslo");

    // Kliknij przycisk logowania
    await submitButton.click();

    // Sprawdź czy pojawia się komunikat o błędzie (div z role="alert")
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });

  test("powinno przekierować zalogowanego użytkownika z /auth/login na /app", async ({ page }) => {
    // Najpierw zaloguj się
    await page.goto("/auth/login");

    // Poczekaj na pełną hydratację React
    const submitButton = page.getByRole("button", { name: "Zaloguj się" });
    await expect(submitButton).toBeEnabled();

    await page.locator("#email").fill("test@zarskilukasz.pl");
    await page.locator("#password").fill("123456789");
    await submitButton.click();
    await page.waitForURL("/app", { timeout: 15000 });

    // Spróbuj wejść ponownie na stronę logowania
    await page.goto("/auth/login");

    // Powinno przekierować z powrotem na /app
    await expect(page).toHaveURL("/app");
  });
});
