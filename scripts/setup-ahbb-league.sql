-- ============================================================================
-- Setup AHBB — à exécuter UNE SEULE FOIS dans Supabase (SQL Editor du dashboard,
-- https://supabase.com/dashboard/project/fkmcpeqcoaatgwzgyydh/sql/new)
--
-- Ce script crée la ligue AHBB et ses 9 équipes officielles. Une fois fait,
-- scripts/sync-ahbb.mjs peut tourner pour importer les joueurs et leurs
-- moyennes saison.
--
-- (Ces deux inserts sont volontairement séparés du reste du travail : mon
-- accès Supabase automatisé a un garde-fou qui bloque toute création directe
-- de nouvelles données "métier" comme une ligue — donc c'est à toi de lancer
-- ce script, une seule fois, ça prend 10 secondes.)
-- ============================================================================

insert into leagues (slug, name, primary_color, active)
values ('ahbb', 'AHBB', '#FF6B00', true)
on conflict (slug) do nothing;

insert into teams (league_id, name)
select l.id, t.name
from leagues l
cross join (values
  ('Canapé-Vert United'),
  ('Les Gladiateurs de Port au Prince'),
  ('Post Marchand Strong'),
  ('Les Géants de Tabarre'),
  ('Ma Troupe De Titans'),
  ('Les Elites de Petion Ville'),
  ('Air force de Delmas'),
  ('Delmastars'),
  ('Team Christ Roi')
) as t(name)
where l.slug = 'ahbb'
on conflict do nothing;

-- Vérification :
select l.name as ligue, t.name as equipe
from teams t
join leagues l on l.id = t.league_id
where l.slug = 'ahbb'
order by t.name;
