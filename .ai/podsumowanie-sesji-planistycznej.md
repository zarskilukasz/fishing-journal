<conversation_summary> <decisions>

Platforma i Technologia: Aplikacja typu Web App (PWA) z RWD. Backend oparty o Supabase, frontend wykorzystujący Tailwind CSS oraz komponenty Shadcn UI.

Zakres projektu (Scope): MVP przeznaczone wyłącznie do użytku prywatnego/testowego autora. Brak wymogów RODO, zaawansowanego onboardingu i panelu administracyjnego na tym etapie. Język wyłącznie polski, system miar metryczny.

Integracje API: Wykorzystanie AccuWeather (pogoda) oraz Google Maps API (lokalizacja, w ramach darmowego limitu).

Logika pogodowa: Pobieranie danych automatycznie tylko do 24h wstecz. Dane zapisywane są jako "snapshot" (nieodświeżalny JSON w bazie). Powyżej 24h wymagane ręczne wprowadzanie danych (opcjonalne pola).

Prezentacja pogody: Oś czasu (godzinowa) wyświetlana w kontenerze z przewijaniem (overflow: hidden/scroll). Na liście głównej widoczny tylko skrót.

Struktura Wyprawy: Jedna lokalizacja na jedną wyprawę. Możliwość edycji czasu trwania (start/koniec).

Sprzęt: Konieczność uwzględnienia wędek, przynęt i zanęt. System ma zapamiętywać ostatnio użyty zestaw (domyślny wybór przy nowej wyprawie).

Zdjęcia: Limitowana waga i rozmiar (skalowanie do dłuższego boku 2000px + kompresja klienta).

Logowanie: Uproszczone (jeden użytkownik lub prosta autoryzacja bez odzyskiwania hasła), dostosowane do testów własnych.

</decisions>

<matched_recommendations>

Tryb Offline-first: Aplikacja pozwoli na zapis danych bez dostępu do sieci (synchronizacja później). W trybie offline mapa będzie ukryta/zastąpiona komunikatem, a współrzędne pobrane z urządzenia.

Struktura danych sprzętu: Zastosowanie archiwizacji/snapshotów nazw sprzętu w historii wypraw (zmiana nazwy wędki w bazie nie zmienia jej nazwy w starych wyprawach).

Słowniki: Zastosowanie predefiniowanej listy gatunków ryb (dropdown) zamiast ręcznego wpisywania, aby zapewnić spójność statystyk.

UX Głównego ekranu: Zastosowanie przycisku FAB ("Dodaj wyprawę") i listy ostatnich wpisów zamiast widoku kalendarza.

Automatyzacja podsumowań: Ilość ryb i lista gatunków w podsumowaniu wyprawy generowana automatycznie na podstawie dodanych trofeów.

Ostrzeżenia przy edycji daty: System ostrzeże o utracie danych pogodowych przy zmianie daty wyprawy na starszą niż 24h.

Szczegółowość czasu połowu: Możliwość przypisania konkretnej godziny do złowionej ryby (domyślnie "teraz"), co powiąże ją z warunkami pogodowymi z osi czasu. </matched_recommendations>

<prd_planning_summary>

a. Główne wymagania funkcjonalne produktu
Zarządzanie Wyprawami: Tworzenie (CRUD) wpisów z datą, godzinami (od-do), lokalizacją (Google Maps) i automatyczną pogodą (AccuWeather).

Rejestr Połowów (Trofea): Dodawanie złowionych ryb w ramach wyprawy (Gatunek ze słownika, Waga, Długość, Zdjęcie, Godzina połowu, użyta Przynęta).

Zarządzanie Sprzętem: Baza własna użytkownika z podziałem na: Wędki, Przynęty, Zanęty. Możliwość wyboru zestawu ("multiselect") przy wyprawie.

Analityka Pogodowa: Wyświetlanie warunków (Temp, Ciśnienie, Wiatr, Zachmurzenie) w interwałach godzinowych dla czasu trwania wyprawy.

Dashboard: Lista chronologiczna wypraw z szybkim podglądem wyników i pogody.

b. Kluczowe historie użytkownika i ścieżki korzystania
Ścieżka "Szybki start nad wodą": Użytkownik otwiera aplikację -> Klika "Nowa Wyprawa" -> Lokalizacja i czas ustawiają się same -> Sprzęt podstawia się z ostatniej wyprawy -> Użytkownik zapisuje szkielet wyprawy w < 30 sekund.

Ścieżka "Złowienie ryby": W trakcie trwania wyprawy Użytkownik klika "Dodaj rybę" -> Wybiera gatunek, wpisuje wagę, robi zdjęcie -> Godzina i pogoda przypisują się automatycznie -> Zapisz.

Ścieżka "Analiza po powrocie": Użytkownik przegląda listę wypraw, widzi, że na łowisku X przy wietrze zachodnim miał najlepsze wyniki na konkretną przynętę.

c. Ważne kryteria sukcesu i sposoby ich mierzenia
Czas zapisu: Możliwość utworzenia kompletnego wpisu (wyprawa + 1 ryba + zdjęcie) w czasie poniżej 2 minut w warunkach polowych.

Niezawodność danych: 100% poprawnie wyświetlonych danych historycznych (pogoda i nazwy sprzętu) po upływie 7 dni od zapisu (weryfikacja mechanizmu snapshotów).

Użyteczność offline: Skuteczne zapisanie wpisu przy braku zasięgu i automatyczna synchronizacja po odzyskaniu połączenia (brak utraty danych).

d. Nierozwiązane kwestie lub obszary wymagające wyjaśnienia
Brak istotnych nierozwiązanych kwestii blokujących powstanie PRD. </prd_planning_summary>

<unresolved_issues> Brak. Wszystkie kluczowe decyzje dla etapu MVP (Scope, Tech Stack, Funkcjonalności) zostały podjęte przez użytkownika. Projekt jest gotowy do fazy specyfikacji technicznej. </unresolved_issues> </conversation_summary>