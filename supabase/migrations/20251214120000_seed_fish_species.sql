/*
  migration: seed fish species dictionary
  timestamp (utc): 2025-12-14 12:00:00

  purpose:
  - populate the fish_species table with common polish freshwater fish species
  - this is a global dictionary managed by migrations (read-only for app users)

  notes:
  - uses on conflict do nothing to be idempotent
  - names are in polish as this is the app's primary language
*/

insert into public.fish_species (name) values
  -- drapieżne
  ('Szczupak'),
  ('Sandacz'),
  ('Okoń'),
  ('Sum'),
  ('Boleń'),
  ('Pstrąg potokowy'),
  ('Pstrąg tęczowy'),
  ('Troć'),
  ('Łosoś'),
  ('Miętus'),
  
  -- karpiowate
  ('Karp'),
  ('Karp lustrzany'),
  ('Karp królewski'),
  ('Karaś'),
  ('Karaś srebrzysty'),
  ('Lin'),
  ('Leszcz'),
  ('Płoć'),
  ('Jaź'),
  ('Kleń'),
  ('Brzana'),
  ('Certa'),
  ('Jelec'),
  ('Wzdręga'),
  ('Ukleja'),
  ('Krąp'),
  ('Świnka'),
  ('Kiełb'),
  
  -- amury i tołpygi
  ('Amur biały'),
  ('Tołpyga biała'),
  ('Tołpyga pstra'),
  
  -- inne
  ('Węgorz'),
  ('Sapa'),
  ('Rozpiór'),
  ('Różanka'),
  ('Słonecznica'),
  ('Głowacica'),
  ('Lipień'),
  ('Sieja'),
  ('Sielawa'),
  ('Stynka')
on conflict do nothing;

