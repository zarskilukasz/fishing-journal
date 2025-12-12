<conversation_summary>
<decisions>
Model danych projektujemy jako multi-user od początku (powiązanie z auth.users), mimo że MVP jest “dla jednego użytkownika”.
Relacja wyprawa → połowy: 1:N, połów zawsze należy do jednej wyprawy.
Gatunki ryb: słownik globalny (read-only dla aplikacji).
Sprzęt: trzy osobne tabele (Wędki, Przynęty, Zanęty), a nie jedna tabela z typem.
Historyczna niezmienność sprzętu: snapshot nazw + soft-delete sprzętu.
Wyprawa: started_at, ended_at, status (min. draft/active/closed) + spójność czasowa.
Lokalizacja: współrzędne lat/lng, nazwa łowiska opcjonalna, bez osobnej encji łowisk do ponownego użycia.
Pogoda: snapshoty + dane godzinowe (timeline), bez nadpisywania; dla manualnej pogody osobny snapshot source='manual'.
Brak udostępniania danych między użytkownikami: izolacja per-user (RLS).
Indeksy i podejście wydajnościowe: zgodnie z rekomendacjami (dashboard “ostatnie wyprawy”, filtrowania, joiny).
Zdjęcia: jedno zdjęcie na połów (Storage path w rekordzie połowu).
Miary ryby: integer w najmniejszych jednostkach (weight_g, length_mm) + CHECK.
Walidacja czasów: caught_at powinien mieścić się w zakresie wyprawy (co najmniej walidacja aplikacyjna; DB opcjonalnie trigger).
Powiązanie sprzętu z wyprawą (multiselect): 3 tabele łącznikowe (trip_rods, trip_lures, trip_groundbaits) + unikalność (trip_id, item_id) + snapshot nazwy.
“Ostatni zestaw”: kopiowanie sprzętu z ostatniej wyprawy (bez osobnej funkcji zestawów w MVP).
Usuwanie: soft-delete dla wypraw i sprzętu (dla połowów zależnie od UX, ale przyjęto wg rekomendacji).
Unikalność nazw sprzętu: unique(user_id, lower(name)) w każdej z 3 tabel.
Rozszerzenia: włączamy pgcrypto dla UUID; PostGIS pomijamy w MVP.
Czasy przechowujemy jako timestamptz (UTC).
RLS dla tabel zależnych od wyprawy realizujemy przez warunek po trip_id (i trips.deleted_at is null), a nie przez duplikację user_id wszędzie.
Blokujemy “cross-user FK” (np. cudza przynęta w cudzym połowie) — twardo (trigger/constraint) wg rekomendacji.
Trigger do updated_at w tabelach domenowych.
Dashboard: filtr deleted_at is null, sort started_at desc, limit i indeks częściowy/wspierający.
Podsumowania (np. liczba ryb): w MVP liczone on the fly, bez materializacji.
Schematy DB: tabele w public + RLS (bez rozdzielania na private), słowniki read-only.
Dostęp: projektujemy RLS tak, aby działało z klienta Supabase (bez polegania na service role w MVP).
Reguła wyboru “aktualnej pogody” dla wyprawy: preferuj manualną, inaczej najnowszy snapshot API; dopuszczamy wiele snapshotów.
CHECK constrainty dla pogody (sensowne zakresy) wg rekomendacji.
Spójność statusu wyprawy: jeśli status='closed' to ended_at wymagane.
Zależne dane mają być niewidoczne, jeśli wyprawa jest soft-deleted (RLS po trip_id uwzględnia deleted_at is null).
Rozważamy widoki dla stabilnego “API” (np. dashboard) — opcjonalnie w MVP, ale rekomendowane dla 1–2 kluczowych ekranów.
</decisions>
<matched_recommendations>
Multi-user + RLS: user_id uuid references auth.users(id) w tabelach właścicielskich + polityki using/with check po auth.uid().
Trzy tabele sprzętu + 3 tabele łącznikowe per typ (upraszcza FK i RLS, brak polimorfizmu).
Snapshot nazw sprzętu w rekordach historycznych + soft-delete sprzętu (i docelowo wypraw) zamiast hard delete.
Model wyprawy: started_at/ended_at/status + CHECK-y (ended_at >= started_at, closed ⇒ ended_at not null).
Lokalizacja: lat/lng nullable jako para (CHECK “oba null albo oba nie-null”) + opcjonalna location_label.
Pogoda: weather_snapshots + weather_hours (unikalność (snapshot_id, observed_at)), source (api/manual), brak nadpisywania, reguła wyboru “current”.
Czasy: timestamptz (UTC) dla wszystkich timestampów domenowych.
Zdjęcie połowu: pojedynczy photo_path w catches + RLS/konwencja ścieżek w Storage per user.
Miary: weight_g int, length_mm int + CHECK (>0) zamiast numeric.
RLS dla tabel zależnych: warunki przez trip_id z uwzględnieniem trips.user_id = auth.uid() i trips.deleted_at is null.
Spójność ownera po FK: trigger/constraint blokujący podpinanie rekordów innych użytkowników.
Audyt: created_at/updated_at + trigger set_updated_at() w tabelach domenowych.
Indeksy: trips(user_id, started_at desc) (z filtrem deleted_at is null), catches(trip_id, caught_at), indeksy pod gatunki i listy sprzętu; unikalność nazw sprzętu per user.
Słowniki globalne: fish_species jako read-only dla aplikacji, zarządzane migracjami/seedem.
Ograniczenia jakości danych: CHECK-y dla pogody (zakresy), a caught_at w zakresie wyprawy minimum walidowane w aplikacji (DB trigger opcjonalnie).
Opcjonalne widoki: 1–2 widoki pod dashboard/szczegóły dla stabilnego kontraktu i prostszych zapytań.
</matched_recommendations>
<database_planning_summary>
Główne wymagania dotyczące schematu bazy danych:
Aplikacja prywatna, ale dane projektowane jako multi-user w Supabase.
Rejestrowanie wypraw (czas, opcjonalna lokalizacja), połowów (gatunek + wymagane przynęta/zanęta), sprzętu (3 kategorie), oraz pogody jako niezmiennych snapshotów godzinowych.
Historyczna spójność: zmiany/usunięcia sprzętu nie mogą psuć historii (snapshoty + soft-delete).
Kluczowe encje i ich relacje (proponowany kształt logiczny):
trips (wyprawy): owner user_id, started_at, ended_at, status, location_lat, location_lng, location_label, deleted_at, audyt.
catches (połowy): trip_id (1 wyprawa : N połowów), caught_at, species_id (globalny słownik), lure_id (FK do przynęt), groundbait_id (FK do zanęt), snapshoty nazw (lure_name_snapshot, groundbait_name_snapshot), opcjonalnie weight_g, length_mm, photo_path.
Sprzęt (3 tabele): rods, lures, groundbaits (każda z user_id, name, soft-delete, audyt, unikalność nazwy per user).
Multiselect sprzętu na wyprawie: trip_rods, trip_lures, trip_groundbaits (FK do trips + FK do odpowiedniej tabeli sprzętu + snapshot nazwy + unique(trip_id, item_id)).
Pogoda: weather_snapshots (powiązane z trip_id, source api/manual, fetched_at, okno czasowe) oraz weather_hours (N rekordów godzinowych per snapshot; unikalność po czasie w ramach snapshotu).
fish_species jako słownik globalny (read-only z poziomu aplikacji).
Ważne kwestie dotyczące bezpieczeństwa i skalowalności:
RLS per user; brak udostępniania danych między użytkownikami.
RLS dla tabel zależnych (połowy, pogoda, łączniki) oparty o trip_id + warunek ownera i trips.deleted_at is null.
Twarda spójność ownera po FK (trigger/constraint) aby zablokować “cross-user” podpinanie sprzętu.
Indeksy pod najczęstsze odczyty (dashboard ostatnich wypraw, listy połowów per wyprawa, filtrowania), a podsumowania liczone “on the fly” w MVP.
pgcrypto dla UUID, brak PostGIS w MVP; czasy jako timestamptz (UTC).
Nierozwiązane kwestie / obszary do doprecyzowania przed implementacją:
Konkretny zestaw pól pogodowych w weather_hours (które metryki z API/manual mają być przechowywane w MVP).
Czy walidacja caught_at w zakresie wyprawy ma być twarda w DB (trigger) czy wystarczy aplikacja.
Dokładna konwencja ścieżek i RLS dla Supabase Storage (bucket, struktura np. user_id/catches/<id>.jpg) oraz zasady usuwania plików przy soft-delete.
Czy trips.status ma domyślnie startować jako draft czy active oraz kiedy ustawiamy closed (UX).
Czy dodajemy 1–2 widoki (np. trips_with_summary, trip_weather_current) już w MVP, czy zostawiamy to na później.
</database_planning_summary>
<unresolved_issues>
Finalny zestaw pól pogodowych do przechowywania (minimalny zakres MVP) oraz mapowanie z AccuWeather/manual.
Decyzja o twardym wymuszeniu zakresu caught_at względem started_at/ended_at w DB (trigger) vs tylko w aplikacji.
Szczegóły Supabase Storage: bucket(y), nazewnictwo ścieżek, polityki dostępu i obsługa lifecycle plików przy soft-delete.
Domyślny workflow statusów wyprawy (draft vs active) i moment “zamknięcia” (closed) w logice aplikacji.
Czy wdrażamy od razu dedykowane widoki pod dashboard/szczegóły, czy zostawiamy joiny po stronie frontendu w MVP.
</unresolved_issues>
</conversation_summary>