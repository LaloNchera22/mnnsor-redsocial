-- Users (Extending Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  anon_id text unique not null,
  has_paid_setup boolean default false,
  is_subscribed boolean default false,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id text not null references public.profiles(anon_id),
  title text not null,
  content text not null,
  type text check (type in ('document', 'audio')),
  tag text not null default 'GENERAL',
  flags integer default 0,
  search_vector tsvector generated always as (setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', content), 'B')) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
CREATE INDEX IF NOT EXISTS posts_search_idx ON public.posts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id text references public.profiles(anon_id) on delete cascade,
  following_id text references public.profiles(anon_id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- Saves
CREATE TABLE IF NOT EXISTS public.saves (
  user_id text references public.profiles(anon_id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

-- Messages (E2E Encrypted context, we store encrypted string)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text references public.profiles(anon_id),
  receiver_id text references public.profiles(anon_id),
  encrypted_content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  author_id text references public.profiles(anon_id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  user_id text references public.profiles(anon_id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.profiles(anon_id) on delete cascade,
  type text not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id text references public.profiles(anon_id),
  action text not null,
  target_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Storage bucket setup (requires SQL to enable storage extension, usually done via Supabase dashboard, assuming it's available)
-- RLS Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to get anon_id
CREATE OR REPLACE FUNCTION auth.anon_id() RETURNS text AS $$
  SELECT anon_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS boolean AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Posts
CREATE POLICY "Posts are viewable by everyone." ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert posts." ON public.posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own posts." ON public.posts FOR UPDATE USING (auth.anon_id() = author_id);
CREATE POLICY "Admins can update any post (flags)." ON public.posts FOR UPDATE USING (auth.is_admin());

-- Follows
CREATE POLICY "Follows are viewable by everyone." ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their follows." ON public.follows FOR ALL USING (auth.anon_id() = follower_id);

-- Saves
CREATE POLICY "Users can view their own saves." ON public.saves FOR SELECT USING (auth.anon_id() = user_id);
CREATE POLICY "Users can manage their saves." ON public.saves FOR ALL USING (auth.anon_id() = user_id);

-- Messages
CREATE POLICY "Users can view messages sent to or from them." ON public.messages FOR SELECT USING (auth.anon_id() = sender_id OR auth.anon_id() = receiver_id);
CREATE POLICY "Users can insert messages." ON public.messages FOR INSERT WITH CHECK (auth.anon_id() = sender_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone." ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments." ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Likes
CREATE POLICY "Likes are viewable by everyone." ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their likes." ON public.likes FOR ALL USING (auth.anon_id() = user_id);

-- Notifications
CREATE POLICY "Users can view and manage their own notifications." ON public.notifications FOR ALL USING (auth.anon_id() = user_id);

-- Audit Logs
CREATE POLICY "Only admins can view audit logs." ON public.audit_logs FOR SELECT USING (auth.is_admin());
CREATE POLICY "Only admins can insert audit logs." ON public.audit_logs FOR INSERT WITH CHECK (auth.is_admin());


-- Fix: Move helper functions to public schema
DROP FUNCTION IF EXISTS auth.anon_id();
DROP FUNCTION IF EXISTS auth.is_admin();

CREATE OR REPLACE FUNCTION public.anon_id() RETURNS text AS $$
  SELECT anon_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Update Policies to use public functions
DROP POLICY IF EXISTS "Users can update own posts." ON public.posts;
CREATE POLICY "Users can update own posts." ON public.posts FOR UPDATE USING (public.anon_id() = author_id);

DROP POLICY IF EXISTS "Admins can update any post (flags)." ON public.posts;
CREATE POLICY "Admins can update any post (flags)." ON public.posts FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Users can manage their follows." ON public.follows;
CREATE POLICY "Users can manage their follows." ON public.follows FOR ALL USING (public.anon_id() = follower_id);

DROP POLICY IF EXISTS "Users can view their own saves." ON public.saves;
CREATE POLICY "Users can view their own saves." ON public.saves FOR SELECT USING (public.anon_id() = user_id);

DROP POLICY IF EXISTS "Users can manage their saves." ON public.saves;
CREATE POLICY "Users can manage their saves." ON public.saves FOR ALL USING (public.anon_id() = user_id);

DROP POLICY IF EXISTS "Users can view messages sent to or from them." ON public.messages;
CREATE POLICY "Users can view messages sent to or from them." ON public.messages FOR SELECT USING (public.anon_id() = sender_id OR public.anon_id() = receiver_id);

DROP POLICY IF EXISTS "Users can insert messages." ON public.messages;
CREATE POLICY "Users can insert messages." ON public.messages FOR INSERT WITH CHECK (public.anon_id() = sender_id);

DROP POLICY IF EXISTS "Users can manage their likes." ON public.likes;
CREATE POLICY "Users can manage their likes." ON public.likes FOR ALL USING (public.anon_id() = user_id);

DROP POLICY IF EXISTS "Users can view and manage their own notifications." ON public.notifications;
CREATE POLICY "Users can view and manage their own notifications." ON public.notifications FOR ALL USING (public.anon_id() = user_id);

DROP POLICY IF EXISTS "Only admins can view audit logs." ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs." ON public.audit_logs FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can insert audit logs." ON public.audit_logs;
CREATE POLICY "Only admins can insert audit logs." ON public.audit_logs FOR INSERT WITH CHECK (public.is_admin());

-- Fix: Trigger to auto-create profile and generate anon_id on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_anon_id text;
BEGIN
  -- Generate a random 6-character alphanumeric ID
  new_anon_id := upper(substr(md5(random()::text), 1, 6));

  -- Ensure uniqueness (very low collision probability, but good practice)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE anon_id = new_anon_id) LOOP
    new_anon_id := upper(substr(md5(random()::text), 1, 6));
  END LOOP;

  INSERT INTO public.profiles (id, anon_id, role)
  VALUES (new.id, new_anon_id, 'user');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Added Policies and Tables

-- Delete policy for posts
CREATE POLICY "Admins can delete any post." ON public.posts FOR DELETE USING (public.is_admin());

-- Comments update and delete
CREATE POLICY "Users can update own comments." ON public.comments FOR UPDATE USING (public.anon_id() = author_id);
CREATE POLICY "Users can delete own comments." ON public.comments FOR DELETE USING (public.anon_id() = author_id);
CREATE POLICY "Admins can delete any comment." ON public.comments FOR DELETE USING (public.is_admin());

-- Messages update and delete
CREATE POLICY "Users can update own messages." ON public.messages FOR UPDATE USING (public.anon_id() = sender_id);
CREATE POLICY "Users can delete messages." ON public.messages FOR DELETE USING (public.anon_id() = sender_id OR public.anon_id() = receiver_id);

-- Post Flags
CREATE TABLE IF NOT EXISTS public.post_flags (
  user_id text references public.profiles(anon_id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);
ALTER TABLE public.post_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own flags." ON public.post_flags FOR INSERT WITH CHECK (public.anon_id() = user_id);
CREATE POLICY "Users can view their own flags." ON public.post_flags FOR SELECT USING (public.anon_id() = user_id);
CREATE POLICY "Admins can view all flags." ON public.post_flags FOR SELECT USING (public.is_admin());

-- Storage Bucket Setup (audio_uploads)
-- Assuming storage extension is active, we insert into storage.buckets and setup policies
INSERT INTO storage.buckets (id, name, public) VALUES ('audio_uploads', 'audio_uploads', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'audio_uploads' );
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'audio_uploads' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'audio_uploads' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'audio_uploads' AND auth.role() = 'authenticated' );
