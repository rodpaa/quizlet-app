create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 240),
  subject text not null default 'Other' check (char_length(subject) between 1 and 50),
  emoji text not null default '📚' check (char_length(emoji) between 1 and 8),
  color text not null default '#4257b2' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  cards jsonb not null default '[]'::jsonb check (jsonb_typeof(cards) = 'array'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flashcard_sets_owner_id_idx on public.flashcard_sets(owner_id);
create index if not exists flashcard_sets_public_created_idx
  on public.flashcard_sets(created_at desc)
  where is_public = true;

alter table public.profiles enable row level security;
alter table public.flashcard_sets enable row level security;

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select on public.flashcard_sets to anon;
grant select, insert, update, delete on public.flashcard_sets to authenticated;

create policy "Profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Public sets and owned sets are readable"
  on public.flashcard_sets for select
  to anon, authenticated
  using (is_public or (select auth.uid()) = owner_id);

create policy "Users can create their own sets"
  on public.flashcard_sets for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update their sets"
  on public.flashcard_sets for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their sets"
  on public.flashcard_sets for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists flashcard_sets_set_updated_at on public.flashcard_sets;
create trigger flashcard_sets_set_updated_at
  before update on public.flashcard_sets
  for each row execute procedure public.set_updated_at();
