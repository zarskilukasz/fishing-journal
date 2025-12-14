import { test, expect } from "@playwright/test";

test.describe("Zarządzanie wyprawami", () => {
  // Przed każdym testem zaloguj się
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");

    // Poczekaj na pełną hydratację React
    const submitButton = page.getByRole("button", { name: "Zaloguj się" });
    await expect(submitButton).toBeEnabled();

    await page.locator("#email").fill("test@zarskilukasz.pl");
    await page.locator("#password").fill("123456789");
    await submitButton.click();
    await page.waitForURL("/app", { timeout: 15000 });
  });

  test("powinno dodać i usunąć wyprawę", async ({ page }) => {
    // ====== DODAWANIE WYPRAWY ======

    // Kliknij FAB lub link do rozpoczęcia wyprawy
    // FAB ma aria-label "Nowa wyprawa"
    const fabButton = page.getByRole("button", { name: /nowa wyprawa/i });
    const startTripLink = page.getByRole("link", { name: /rozpocznij wyprawę/i });

    // Kliknij ten element który jest widoczny
    if (await fabButton.isVisible()) {
      await fabButton.click();
    } else {
      await startTripLink.click();
    }

    // Poczekaj aż dialog/sheet się otworzy
    await expect(page.getByRole("dialog").or(page.getByRole("heading", { name: "Nowa wyprawa" }))).toBeVisible({
      timeout: 5000,
    });

    // Odznacz opcję GPS (może wymagać zgody przeglądarki)
    const gpsCheckbox = page.getByRole("checkbox", { name: /lokalizacji GPS/i });
    if (await gpsCheckbox.isChecked()) {
      await gpsCheckbox.uncheck();
    }

    // Odznacz opcję kopiowania sprzętu (opcjonalnie)
    const equipmentCheckbox = page.getByRole("checkbox", { name: /kopiuj sprzęt/i });
    if (await equipmentCheckbox.isChecked()) {
      await equipmentCheckbox.uncheck();
    }

    // Kliknij przycisk "Rozpocznij"
    await page.getByRole("button", { name: /rozpocznij/i }).click();

    // Poczekaj na przekierowanie do szczegółów wyprawy
    await page.waitForURL(/\/app\/trips\/[a-f0-9-]+/, { timeout: 15000 });

    // Sprawdź czy jesteśmy na stronie szczegółów wyprawy
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/app\/trips\/[a-f0-9-]+/);

    // Zapisz ID wyprawy z URL do późniejszego użycia
    const tripId = currentUrl.split("/").pop();
    expect(tripId).toBeTruthy();

    // Sprawdź czy widoczna jest strona szczegółów
    // Powinien być widoczny status "Aktywna" lub inne elementy strony
    await expect(
      page
        .getByText(/aktywna/i)
        .or(page.getByText(/szkic/i))
        .or(page.getByRole("button", { name: /opcje wyprawy/i }))
    ).toBeVisible({ timeout: 10000 });

    // ====== USUWANIE WYPRAWY ======

    // Kliknij menu opcji (trzy kropki)
    await page.getByRole("button", { name: /opcje wyprawy/i }).click();

    // Poczekaj na otwarcie menu
    await expect(page.getByRole("menu").or(page.getByRole("menuitem", { name: /usuń/i }))).toBeVisible({
      timeout: 5000,
    });

    // Kliknij "Usuń"
    await page.getByRole("menuitem", { name: /usuń/i }).click();

    // Poczekaj na dialog potwierdzenia
    await expect(page.getByRole("dialog").or(page.getByText(/na pewno chcesz usunąć/i))).toBeVisible({
      timeout: 5000,
    });

    // Potwierdź usunięcie
    // Dialog potwierdzenia ma przycisk "Usuń"
    await page.getByRole("button", { name: /^usuń$/i }).click();

    // Poczekaj na przekierowanie z powrotem do dashboardu
    await page.waitForURL("/app", { timeout: 15000 });

    // Sprawdź czy jesteśmy z powrotem na dashboardzie
    await expect(page).toHaveURL("/app");

    // Sprawdź czy wyprawa została usunięta (opcjonalnie - sprawdź czy nie ma jej na liście)
    // Możemy sprawdzić czy tekst "Witaj w Dzienniku!" lub lista jest widoczna
    await expect(page.getByText("Witaj w Dzienniku!").or(page.getByText("Twoje wyprawy"))).toBeVisible({
      timeout: 10000,
    });
  });

  test("powinno wyświetlić pustą listę wypraw lub istniejące wyprawy", async ({ page }) => {
    // Po zalogowaniu sprawdź czy dashboard się wyświetla
    await expect(page.getByText("Witaj w Dzienniku!").or(page.getByText("Twoje wyprawy"))).toBeVisible({
      timeout: 10000,
    });

    // Sprawdź czy FAB jest widoczny
    const fabButton = page.getByRole("button", { name: /nowa wyprawa/i });
    await expect(fabButton).toBeVisible();
  });

  test("powinno nawigować do szczegółów istniejącej wyprawy", async ({ page }) => {
    // Najpierw utwórz wyprawę
    const fabButton = page.getByRole("button", { name: /nowa wyprawa/i });
    await fabButton.click();

    await expect(page.getByRole("heading", { name: "Nowa wyprawa" })).toBeVisible({
      timeout: 5000,
    });

    // Odznacz GPS
    const gpsCheckbox = page.getByRole("checkbox", { name: /lokalizacji GPS/i });
    if (await gpsCheckbox.isChecked()) {
      await gpsCheckbox.uncheck();
    }

    await page.getByRole("button", { name: /rozpocznij/i }).click();
    await page.waitForURL(/\/app\/trips\/[a-f0-9-]+/, { timeout: 15000 });

    // Zapisz URL wyprawy
    const tripUrl = page.url();

    // Wróć do dashboardu
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // Znajdź kartę wyprawy i kliknij ją
    // Karty mają klasę geist-card-glow i są linkami
    const tripCards = page.locator("a.geist-card-glow");
    const firstCard = tripCards.first();

    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForURL(/\/app\/trips\/[a-f0-9-]+/, { timeout: 10000 });

      // Sprawdź czy jesteśmy na stronie szczegółów
      await expect(page.getByRole("button", { name: /opcje wyprawy/i })).toBeVisible({
        timeout: 10000,
      });
    }

    // Cleanup - usuń utworzoną wyprawę
    await page.goto(tripUrl);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /opcje wyprawy/i }).click();
    await page.getByRole("menuitem", { name: /usuń/i }).click();
    await page.getByRole("button", { name: /^usuń$/i }).click();
    await page.waitForURL("/app", { timeout: 15000 });
  });
});
