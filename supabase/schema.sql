-- Run these in your Supabase SQL editor to initialize tables

CREATE TABLE IF NOT EXISTS public.users (
  id uuid default gen_random_uuid() primary key,
  anon_id text unique not null,
  has_paid_setup boolean default false,
  is_subscribed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id text not null references public.users(anon_id),
  title text not null,
  content text not null,
  type text check (type in ('document', 'audio')),
  flags integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: RLS policies should be set up here to protect anonymity
