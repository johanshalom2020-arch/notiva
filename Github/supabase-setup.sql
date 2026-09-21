-- ─────────────────────────────────────────────────────────────────────────────
-- Notiva database setup — paste this WHOLE file into Supabase → SQL Editor → Run
-- Creates every table the app needs: users, sessions, settings, pages, blocks,
-- subjects and assessments. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  theme jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null default 'Untitled',
  icon text not null default 'file-text',
  cover text,
  sort_order integer not null default 0,
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pages_user_idx on pages(user_id);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  type text not null default 'text',
  content text not null default '',
  checked boolean not null default false,
  color text not null default '',
  bg text not null default '',
  "position" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blocks_page_idx on blocks(page_id);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  color text not null default '#7c3aed',
  target real not null default 90,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subjects_user_idx on subjects(user_id);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null default '',
  kind text not null default 'sac',
  score real not null default 0,
  date text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assessments_subject_idx on assessments(subject_id);
