-- =========================================================
-- Portfolio database setup (run once in Supabase SQL Editor)
-- =========================================================

-- 1. The table that stores every project
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

-- 2. Row Level Security: anyone can READ, only you (logged in) can WRITE
alter table public.projects enable row level security;

drop policy if exists "public can read projects" on public.projects;
create policy "public can read projects"
  on public.projects for select
  to anon, authenticated
  using (true);

drop policy if exists "owner can insert projects" on public.projects;
create policy "owner can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "owner can update projects" on public.projects;
create policy "owner can update projects"
  on public.projects for update
  to authenticated
  using (true) with check (true);

drop policy if exists "owner can delete projects" on public.projects;
create policy "owner can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- 3. Public image bucket for project photos
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "owner can upload images" on storage.objects;
create policy "owner can upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');

drop policy if exists "owner can delete images" on storage.objects;
create policy "owner can delete images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');
