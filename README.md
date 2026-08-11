# Fidéo Loyalty Hub

Crée une application web appelée “Fidéo” — plateforme de carte de fidélité digitale pour commerçants (intégration Apple Wallet / Google Wallet).



Stack : React + Supabase (auth, base de données, API).



Charte graphique : violet / noir / blanc, style sobre mais animé (micro-interactions, transitions fluides). Le violet dominant doit rappeler un logo de cartes superposées avec couronne blanche.



1. Schéma de base de données (Supabase)

-- Commerçants

create table merchants (

  id uuid primary key default gen_random_uuid(),

  nom_commerce text not null,

  email text unique not null,

  telephone text,

  adresse text,

  logo_url text,

  couleur_marque text,

  created_at timestamp default now()

);

-- Établissements (multi-sites)

create table establishments (

  id uuid primary key default gen_random_uuid(),

  merchant_id uuid references merchants(id),

  nom text not null,

  adresse text,

  latitude float,

  longitude float

);

-- Employés (accès par PIN)

create table employees (

  id uuid primary key default gen_random_uuid(),

  merchant_id uuid references merchants(id),

  nom text not null,

  pin_code text not null,

  role text default 'employe'

);

-- Configuration de la carte de fidélité

create table loyalty_cards (

  id uuid primary key default gen_random_uuid(),

  merchant_id uuid references merchants(id),

  nb_points_pour_recompense int not null,

  valeur_recompense text not null,

  design jsonb

);

-- Clients finaux

create table customers (

  id uuid primary key default gen_random_uuid(),

  merchant_id uuid references merchants(id),

  nom text,

  email text,

  telephone text,

  apple_wallet_pass_id text,

  google_wallet_pass_id text,

  created_at timestamp default now()

);

-- Historique des points

create table points_history (

  id uuid primary key default gen_random_uuid(),

  customer_id uuid references customers(id),

  establishment_id uuid references establishments(id),

  employee_id uuid references employees(id),

  points_ajoutes int not null,

  type text default 'passage',

  date timestamp default now()

);

-- Récompenses utilisées

create table rewards_redeemed (

  id uuid primary key default gen_random_uuid(),

  customer_id uuid references customers(id),

  date timestamp default now(),

  valeur text

);





	•	Vue d’ensemble : points distribués, nouveaux clients, récompenses échangées (avec % vs semaine précédente)

	•	Graphiques : points par jour, heures de pointe, jours actifs de la semaine, nouveaux clients par semaine

	•	Liste des clients avec historique de points

	•	Interface “ajouter un point” rapide (sélection employé par PIN → recherche client → +1 point)

	•	Gestion des employés

	•	Paramètres de la carte de fidélité (modifiable après création)



5. Premier compte test (données de seed)



	•	Merchant : La Maison Du 50

	•	Loyalty card : nb_points_pour_recompense = 6, valeur_recompense = "Vidange offerte"

	•	Règle : 1 point = 1 passage



6. Wallet (à activer plus tard, prévoir la structure dès maintenant)



	•	Champs apple_wallet_pass_id et google_wallet_pass_id déjà en base pour brancher la génération de pass plus tard

	•	Pas de génération réelle de .pkpass pour l’instant (licence Apple Developer pas encore active)

Logo : https://res.cloudinary.com/dgfdye7cl/image/upload/v1785332228/3F3112CB-3549-42D3-8EE2-5B1F9C118801_ikxoy5.png

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://loyal-shine-cards.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c6f21ce2-8d20-4ec8-aabb-1df98545fcb4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
