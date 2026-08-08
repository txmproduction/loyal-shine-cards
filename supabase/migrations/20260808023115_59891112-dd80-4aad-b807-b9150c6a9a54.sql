
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  nom_commerce text not null,
  email text unique not null,
  telephone text,
  adresse text,
  logo_url text,
  couleur_marque text default '#7C3AED',
  created_at timestamptz not null default now()
);

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  nom text not null,
  adresse text,
  latitude float,
  longitude float,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  nom text not null,
  pin_code text not null,
  role text not null default 'employe',
  created_at timestamptz not null default now()
);

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  nb_points_pour_recompense int not null default 10,
  valeur_recompense text not null default 'Récompense offerte',
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  nom text,
  email text,
  telephone text,
  apple_wallet_pass_id text,
  google_wallet_pass_id text,
  created_at timestamptz not null default now()
);

create table public.points_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  establishment_id uuid references public.establishments(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  points_ajoutes int not null default 1,
  type text not null default 'passage',
  date timestamptz not null default now()
);

create table public.rewards_redeemed (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  date timestamptz not null default now(),
  valeur text
);

create index on public.establishments(merchant_id);
create index on public.employees(merchant_id);
create index on public.customers(merchant_id);
create index on public.points_history(customer_id);
create index on public.rewards_redeemed(customer_id);

grant select, insert, update, delete on public.merchants to authenticated;
grant select, insert, update, delete on public.establishments to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.loyalty_cards to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.points_history to authenticated;
grant select, insert, update, delete on public.rewards_redeemed to authenticated;
grant all on public.merchants, public.establishments, public.employees, public.loyalty_cards, public.customers, public.points_history, public.rewards_redeemed to service_role;

create or replace function public.owns_merchant(_merchant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.merchants m where m.id = _merchant_id and m.user_id = auth.uid())
$$;

create or replace function public.owns_customer(_customer_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.customers c join public.merchants m on m.id = c.merchant_id
    where c.id = _customer_id and m.user_id = auth.uid()
  )
$$;

alter table public.merchants enable row level security;
alter table public.establishments enable row level security;
alter table public.employees enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.customers enable row level security;
alter table public.points_history enable row level security;
alter table public.rewards_redeemed enable row level security;

create policy "merchant owner all" on public.merchants for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "establishments owner all" on public.establishments for all to authenticated
  using (public.owns_merchant(merchant_id)) with check (public.owns_merchant(merchant_id));
create policy "employees owner all" on public.employees for all to authenticated
  using (public.owns_merchant(merchant_id)) with check (public.owns_merchant(merchant_id));
create policy "loyalty owner all" on public.loyalty_cards for all to authenticated
  using (public.owns_merchant(merchant_id)) with check (public.owns_merchant(merchant_id));
create policy "customers owner all" on public.customers for all to authenticated
  using (public.owns_merchant(merchant_id)) with check (public.owns_merchant(merchant_id));
create policy "points owner all" on public.points_history for all to authenticated
  using (public.owns_customer(customer_id)) with check (public.owns_customer(customer_id));
create policy "rewards owner all" on public.rewards_redeemed for all to authenticated
  using (public.owns_customer(customer_id)) with check (public.owns_customer(customer_id));

create or replace function public.handle_new_merchant_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m_id uuid;
  v_nom text;
begin
  v_nom := coalesce(new.raw_user_meta_data ->> 'nom_commerce', split_part(new.email, '@', 1));
  insert into public.merchants (user_id, nom_commerce, email)
  values (new.id, v_nom, new.email)
  on conflict (email) do nothing
  returning id into m_id;

  if m_id is not null then
    insert into public.establishments (merchant_id, nom) values (m_id, v_nom || ' — Principal');
    insert into public.loyalty_cards (merchant_id, nb_points_pour_recompense, valeur_recompense)
    values (m_id, 10, 'Récompense offerte');
    insert into public.employees (merchant_id, nom, pin_code, role) values (m_id, 'Gérant', '1234', 'manager');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_merchant
  after insert on auth.users
  for each row execute function public.handle_new_merchant_user();

-- Demo merchant (unclaimed)
insert into public.merchants (id, user_id, nom_commerce, email, telephone, adresse, couleur_marque)
values ('11111111-1111-1111-1111-111111111111', null, 'La Maison Du 50', 'contact@lamaisondu50.fr', '02 33 00 00 50', '50 rue du Centre, Saint-Lô', '#7C3AED');

insert into public.establishments (id, merchant_id, nom, adresse, latitude, longitude) values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'La Maison Du 50 — Saint-Lô', '50 rue du Centre, Saint-Lô', 49.1157, -1.0889),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'La Maison Du 50 — Coutances', '12 avenue de la Gare, Coutances', 49.0453, -1.4448);

insert into public.employees (id, merchant_id, nom, pin_code, role) values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Julien Martin', '1234', 'manager'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Sarah Lemoine', '2345', 'employe'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Kevin Dubois', '3456', 'employe');

insert into public.loyalty_cards (merchant_id, nb_points_pour_recompense, valeur_recompense, design)
values ('11111111-1111-1111-1111-111111111111', 6, 'Vidange offerte', '{"couleur":"#7C3AED","texte":"#FFFFFF","regle":"1 point = 1 passage"}'::jsonb);

insert into public.customers (merchant_id, nom, email, telephone, created_at)
select '11111111-1111-1111-1111-111111111111',
       (array['Camille Robert','Antoine Girard','Léa Moreau','Nicolas Petit','Emma Fontaine','Hugo Bernard','Chloé Marchand','Lucas Renard','Manon Leroy','Théo Blanchard','Sarah Colin','Maxime Perrot','Julie Dumas','Alexandre Roy','Inès Faure','Paul Mercier','Clara Barbier','Yanis Chevalier','Océane Guerin','Mathis Rolland','Nina Lambert','Enzo Caron','Alice Bonnet','Rayan Masson'])[i],
       'client' || i || '@exemple.fr',
       '06' || lpad((10000000 + i * 137)::text, 8, '0'),
       now() - ((i * 3 + 1) || ' days')::interval
from generate_series(1, 24) as i;

insert into public.points_history (customer_id, establishment_id, employee_id, points_ajoutes, type, date)
select c.id,
       (array['22222222-2222-2222-2222-222222222221','22222222-2222-2222-2222-222222222222']::uuid[])[1 + (random() * 1)::int],
       (array['33333333-3333-3333-3333-333333333331','33333333-3333-3333-3333-333333333332','33333333-3333-3333-3333-333333333333']::uuid[])[1 + (random() * 2)::int],
       1, 'passage',
       now() - ((random() * 55)::int || ' days')::interval - ((8 + (random() * 11)::int) || ' hours')::interval
from public.customers c
cross join generate_series(1, 7) g
where c.merchant_id = '11111111-1111-1111-1111-111111111111'
  and random() < 0.72;

insert into public.rewards_redeemed (customer_id, valeur, date)
select c.id, 'Vidange offerte', now() - ((random() * 40)::int || ' days')::interval
from public.customers c
where c.merchant_id = '11111111-1111-1111-1111-111111111111' and random() < 0.35;

create or replace function public.claim_demo_merchant()
returns uuid language plpgsql security definer set search_path = public as $$
declare demo_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.merchants where id = demo_id and user_id is null) then
    delete from public.merchants where user_id = auth.uid();
    update public.merchants set user_id = auth.uid() where id = demo_id;
  end if;
  return demo_id;
end;
$$;

revoke all on function public.claim_demo_merchant() from public;
grant execute on function public.claim_demo_merchant() to authenticated;
