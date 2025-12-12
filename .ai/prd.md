# Dokument wymagań produktu (PRD) - Dziennik Wędkarski MVP

## 1. Przegląd produktu
Dziennik Wędkarski to aplikacja typu Progressive Web App (PWA), stworzona jako prywatne narzędzie MVP (Minimum Viable Product). Głównym celem aplikacji jest umożliwienie wędkarzowi rejestrowania wypraw, złowionych ryb oraz używanego sprzętu, przy jednoczesnym automatycznym pobieraniu i archiwizowaniu danych pogodowych. System ma służyć jako osobista baza wiedzy. Aplikacja jest w pełni responsywna (RWD), zapewniając poprawne wyświetlanie i użyteczność zarówno na smartfonach, jak i komputerach stacjonarnych, działa w modelu offline-first i wykorzystuje technologie Supabase, Tailwind CSS oraz Shadcn UI.

## 2. Problem użytkownika
Wędkarze często mają trudność z powiązaniem swoich wyników (lub ich braku) z konkretnymi warunkami pogodowymi i użytym sprzętem po upływie czasu. Pamięć jest zawodna, a papierowe notatki są niepraktyczne nad wodą i trudne do analizy.
Główne problemy to:
- Brak możliwości szybkiego sprawdzenia, przy jakiej pogodzie (ciśnienie, wiatr) dany gatunek ryby brał najlepiej.
- Zapominanie, jaki zestaw (wędka, przynęta, zanęta) był skuteczny podczas konkretnej wyprawy.
- Trudność w prowadzeniu dziennika w warunkach polowych.
- Utrata danych pogodowych dla historycznych wypraw.

## 3. Wymagania funkcjonalne

### Strona Powitalna (Mini LP) i Dostęp
- **Mini Landing Page:** Prosty ekran powitalny wyświetlany niezalogowanym użytkownikom. Zawiera logo/nazwę aplikacji, krótkie hasło zachęcające oraz przycisk "Zaloguj się".
- **Logowanie:** Prosty system logowania (email/hasło lub social login) dla jednego użytkownika.
- **Wylogowanie:** Dostępna w panelu użytkownika/menu opcja wylogowania, przekierowująca z powrotem na Mini LP.
- **Responsywność (RWD):** Interfejs skaluje się poprawnie od małych ekranów mobilnych po monitory komputerowe.

### Dashboard (Ekran główny)
- Widok listy ostatnich wypraw posortowanych chronologicznie.
- Przycisk FAB (Floating Action Button) do szybkiego rozpoczęcia nowej wyprawy.
- Skrótowy podgląd najważniejszych danych wyprawy na liście (data, łowisko, ilość ryb, ikona pogody).

### Zarządzanie wyprawami
- Tworzenie nowej wyprawy z automatycznym pobraniem lokalizacji (GPS) i daty/czasu.
- Integracja z Google Maps API do wizualizacji i edycji lokalizacji.
- Możliwość edycji czasu trwania wyprawy (start/stop).
- Obsługa trybu offline: zapis danych lokalnie i synchronizacja z Supabase po odzyskaniu połączenia.

### Moduł pogodowy (Integracja AccuWeather)
- Automatyczne pobieranie danych pogodowych dla wypraw z ostatnich 24h.
- Prezentacja pogody w formie godzinowej osi czasu (timeline) z przewijaniem poziomym.
- Mechanizm snapshotów: pobrane dane są zapisywane trwale w bazie.
- Ręczne (opcjonalne) wprowadzanie danych pogodowych dla wypraw starszych niż 24h.
- Ostrzeganie przy zmianie daty wyprawy o utracie danych pogodowych.

### Rejestr połowów (Trofea)
- Dodawanie ryb do wyprawy z poziomu słownika gatunków (dropdown).
- **Pola obowiązkowe:** Gatunek, Przynęta (z listy), Zanęta (z listy).
- **Pola opcjonalne:** Waga, Długość, Zdjęcie.
- Zdjęcie (opcjonalne): kompresja klienta i skalowanie do 2000px (dłuższy bok).
- Automatyczne generowanie podsumowania wyprawy.

### Zarządzanie sprzętem
- Baza własna sprzętu użytkownika (CRUD): Wędki, Przynęty, Zanęty.
- Możliwość wyboru wielu elementów sprzętu (multiselect) dla danej wyprawy.
- Zapamiętywanie ostatnio użytego zestawu.
- Historyczna niezmienność (snapshot nazwy sprzętu w historii).

## 4. Granice produktu
- Język: Wyłącznie polski.
- Jednostki: Wyłącznie system metryczny (kg, cm, m).
- Rejestracja: Brak otwartej rejestracji w MVP (przycisk na LP to placeholder lub ukryty).
- Historia pogody API: Pobieranie automatyczne tylko do 24h wstecz.
- RODO/GDPR: Brak mechanizmów usuwania konta (projekt prywatny).
- Platforma: Web App (dostępna przez przeglądarkę na Mobile i Desktop).

## 5. Historyjki użytkowników

### Uwierzytelnianie i Dostęp
ID: US-001
Tytuł: Strona powitalna i Logowanie
Opis: Jako użytkownik chcę zobaczyć prosty ekran powitalny i móc się zalogować, aby uzyskać dostęp do dziennika.
Kryteria akceptacji:
1. Niezalogowany użytkownik widzi Mini LP z przyciskiem "Zaloguj się".
2. Kliknięcie "Zaloguj się" otwiera formularz lub wywołuje logowanie social.
3. Po sukcesie użytkownik trafia na Dashboard.

ID: US-009
Tytuł: Wylogowanie z aplikacji
Opis: Jako użytkownik chcę mieć możliwość wylogowania się, aby zamknąć sesję na urządzeniu (np. komputerze).
Kryteria akceptacji:
1. W menu/profilu dostępny jest przycisk "Wyloguj".
2. Kliknięcie wylogowuje użytkownika, czyści sesję i przekierowuje na Mini LP.

### Responsywność
ID: US-010
Tytuł: Obsługa na komputerze i telefonie
Opis: Jako użytkownik chcę wygodnie korzystać z aplikacji zarówno na telefonie nad wodą, jak i na komputerze w domu.
Kryteria akceptacji:
1. Widoki (listy, formularze, mapy) wyświetlają się poprawnie na szerokich ekranach (Desktop) - nie są tylko rozciągniętym widokiem mobilnym.
2. Na urządzeniach mobilnych interfejs jest dotykowy i ergonomiczny.

### Zarządzanie sprzętem
ID: US-002
Tytuł: Zarządzanie bazą sprzętu
Opis: Jako użytkownik chcę zarządzać wędkami, przynętami i zanętami.
Kryteria akceptacji:
1. CRUD dla Wędek, Przynęt i Zanęt.
2. Usunięcie przedmiotu nie usuwa go z historycznych wypraw.

### Tworzenie wyprawy
ID: US-003
Tytuł: Szybkie rozpoczęcie wyprawy
Opis: Jako użytkownik chcę rozpocząć nową wyprawę jednym kliknięciem z domyślnymi ustawieniami.
Kryteria akceptacji:
1. Kliknięcie FAB tworzy szkic wyprawy z datą "teraz" i lokalizacją GPS.
2. Sprzęt podstawia się z ostatniej wyprawy.

ID: US-004
Tytuł: Zapis wyprawy Offline
Opis: Jako użytkownik chcę zapisywać dane bez internetu.
Kryteria akceptacji:
1. Zapis działa bez sieci (LocalStorage).
2. Synchronizacja następuje po powrocie online.

### Pogoda
ID: US-005
Tytuł: Automatyczne pobieranie pogody
Opis: Jako użytkownik chcę automatyczną pogodę dla wypraw <24h.
Kryteria akceptacji:
1. Dla wypraw <24h system pobiera dane z AccuWeather.
2. Dane (temp, wiatr, ciśnienie) zapisują się w bazie i nie są nadpisywane.

ID: US-006
Tytuł: Ręczne uzupełnianie pogody
Opis: Jako użytkownik chcę móc wpisać pogodę ręcznie dla starych wypraw.
Kryteria akceptacji:
1. Dla wypraw >24h pola pogody są edytowalne i opcjonalne.

### Rejestracja połowów
ID: US-007
Tytuł: Dodanie złowionej ryby (Trofeum)
Opis: Jako użytkownik chcę dodać informację o złowionej rybie, wskazując na co została złowiona, ale nie musząc wypełniać wszystkich szczegółów.
Kryteria akceptacji:
1. **Gatunek jest polem wymaganym** (wybór z listy).
2. **Przynęta i Zanęta są polami wymaganymi** (wybór z listy sprzętu).
3. **Waga i Długość są polami opcjonalnymi.**
4. **Zdjęcie jest opcjonalne.**
5. Godzina połowu ustawia się domyślnie na aktualną (edytowalna).

### Przeglądanie i Analiza
ID: US-008
Tytuł: Przegląd historii wypraw
Opis: Jako użytkownik chcę analizować swoje wyprawy.
Kryteria akceptacji:
1. Lista wypraw zawiera podsumowanie wyników.
2. Szczegóły zawierają oś czasu pogody i listę ryb.
3. Dane są spójne historycznie (snapshoty).

## 6. Metryki sukcesu
Dla MVP weryfikacja sukcesu opiera się na użyteczności dla pojedynczego użytkownika:

1. Czas zapisu kompletnego wpisu (Wyprawa + 1 Ryba [tylko wymagane pola]) w warunkach polowych wynosi poniżej 90 sekund.
2. 100% poprawności wyświetlania danych historycznych po upływie 7 dni.
3. Skuteczna synchronizacja danych offline bez utraty informacji.
4. Poprawne renderowanie interfejsu (brak rozjechanych elementów) na testowanych rozdzielczościach: Mobile (360px+) i Desktop (1920px).