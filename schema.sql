-- Christmas Run 2026 — initial Supabase schema
-- Run in Supabase SQL Editor. Keep the run-proofs storage bucket private.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create type public.run_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day int not null check (day between 1 and 24),
  run_date date not null,
  distance_km numeric(5,2),
  proof_path text not null,
  status public.run_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, day),
  check (extract(month from run_date) = 12),
  check (extract(day from run_date) = day)
);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;

-- Profiles: public names are used in the leaderboard; users can only edit their own profile.
create policy "Profiles are visible to authenticated participants"
on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Runs: only the owner can read and submit proofs. Do not expose private image paths publicly.
create policy "Users can read their own runs"
on public.runs for select to authenticated using (auth.uid() = user_id);
create policy "Users can submit their own runs"
on public.runs for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own pending runs"
on public.runs for update to authenticated using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

-- Automatically create a profile from signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), 'Teilnehmer'),
    coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'), ''), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Create a PRIVATE Storage bucket named run-proofs in Supabase Storage.
-- Storage policies: authenticated users may upload/read only under their own uid folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('run-proofs', 'run-proofs', false, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "Participants upload their own proof"
on storage.objects for insert to authenticated
with check (bucket_id = 'run-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Participants read their own proof"
on storage.objects for select to authenticated
using (bucket_id = 'run-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- IMPORTANT BEFORE LAUNCH:
-- 1. Add an admin-only review workflow for approving/rejecting runs.
-- 2. Implement server-side enforcement of day/time, upload size and MIME type.
-- 3. Build leaderboard queries that expose only display names and approved run counts.
-- 4. Apply anti-duplicate/account-abuse protections for the prize draw.
