-- =========================================================
-- Portfolio database setup — run in Supabase → SQL Editor.
-- Safe to run again, even if you ran the old version before.
-- CHANGE the email below if you log in with a different one.
-- =========================================================

-- 1. Projects table
create table if not exists public.projects (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  title       text not null,
  year        text,
  category    text not null default 'Other',
  featured    boolean not null default false,
  summary     text,
  details     text[] not null default '{}',
  tags        text[] not null default '{}',
  image       text,
  code_url    text,
  demo_url    text,
  sort_order  int not null default 100
);
-- New column: drafts (false) are visible only to you
alter table public.projects add column if not exists published boolean not null default true;

alter table public.projects enable row level security;

-- Remove policies from the older setup
drop policy if exists "public can read projects"  on public.projects;
drop policy if exists "owner can insert projects" on public.projects;
drop policy if exists "owner can update projects" on public.projects;
drop policy if exists "owner can delete projects" on public.projects;

-- 2. Visitors see published projects; you also see your drafts
create policy "public can read projects" on public.projects
  for select to anon, authenticated
  using (published or (auth.jwt() ->> 'email') = 'saqibali1729@gmail.com');

-- 3. Only your account can add, edit or delete
create policy "owner can insert projects" on public.projects
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'saqibali1729@gmail.com');

create policy "owner can update projects" on public.projects
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'saqibali1729@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'saqibali1729@gmail.com');

create policy "owner can delete projects" on public.projects
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'saqibali1729@gmail.com');

-- 4. Public image bucket; only you can upload or delete
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "owner can upload images" on storage.objects;
drop policy if exists "owner can delete images" on storage.objects;

create policy "owner can upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and (auth.jwt() ->> 'email') = 'saqibali1729@gmail.com');

create policy "owner can delete images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and (auth.jwt() ->> 'email') = 'saqibali1729@gmail.com');
