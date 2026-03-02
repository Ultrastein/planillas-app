-- SQL Script to set up EduPlan Pro Database Structure

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('admin', 'titular', 'colaborador')),
  auth_provider text not null default 'local',
  last_access timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies for users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.users;
create policy "Public profiles are viewable by everyone."
  on users for select
  to authenticated
  using ( true );

-- Function to safely get user role bypassing RLS (prevents infinite recursion)
create or replace function public.get_user_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  -- By being security definer, this bypasses RLS on public.users
  select role into user_role from public.users where id = auth.uid();
  return user_role;
end;
$$;

-- Trigger to automatically create a public.user on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'colaborador', -- default role
    case when new.raw_app_meta_data->>'provider' = 'google' then 'google' else 'local' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Admins can insert and update profiles." ON public.users;

create policy "Users can insert their own profile."
  on users for insert
  to authenticated
  with check ( auth.uid() = id );

create policy "Admins can insert and update profiles."
  on users for all
  to authenticated
  using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );

-- 2. Create Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author_id uuid references public.users(id) not null,
  author_name text not null,
  author_role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  file_type text not null check (file_type in ('pdf', 'word', 'gdoc', 'editor')),
  file_url text,
  content text,
  status text not null default 'active' check (status in ('active', 'deleted')),
  delete_reason text,
  curso text,
  grado text,
  anio text,
  carga_horaria text,
  tematica text, -- Kategorías: manualidades, proyecto institucional, programacion y robotica, ciudadania digital, cuidado digital, alfabetizacion
  num_clase text,
  recursos text
);

-- Ensure columns exist if table was already created
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS curso text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS grado text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS anio text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS carga_horaria text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tematica text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS num_clase text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS recursos text;

alter table public.documents enable row level security;

-- Policies for documents
DROP POLICY IF EXISTS "Active documents viewable by all authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Admins and Titulares can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authors can update their own documents (soft delete)" ON public.documents;

create policy "Active documents viewable by all authenticated users"
  on documents for select
  to authenticated
  using ( status = 'active' OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );

create policy "Admins and Titulares can insert documents"
  on documents for insert
  to authenticated
  with check ( coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) in ('admin', 'titular') );

create policy "Authors can update their own documents (soft delete)"
  on documents for update
  to authenticated
  using ( author_id = auth.uid() OR coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );

DROP POLICY IF EXISTS "Admins can hard delete documents" ON public.documents;
create policy "Admins can hard delete documents"
  on documents for delete
  to authenticated
  using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );

-- 3. Create Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  author_id uuid references public.users(id) not null,
  author_name text not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;

DROP POLICY IF EXISTS "Everyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Everyone can insert comments" ON public.comments;

create policy "Everyone can view comments"
  on comments for select
  to authenticated
  using ( true );

create policy "Everyone can insert comments"
  on comments for insert
  to authenticated
  with check ( author_id = auth.uid() );

-- 4. Admin RPC to change other users passwords
-- NOTE: Requires setup through Supabase Dashboard -> Database -> Functions
create or replace function admin_reset_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql security definer
as $$
begin
  -- Check if caller is admin (assuming role is in app_metadata)
  if coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) != 'admin' then
    raise exception 'Unauthorized: Only admins can perform this action';
  end if;

  -- Update auth.users password
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_user_id;
end;
$$;

-- 5. Create Document Versions Table
CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  author_id uuid references public.users(id) not null,
  author_name text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.document_versions enable row level security;

DROP POLICY IF EXISTS "Versions viewable by all authenticated users" ON document_versions;
DROP POLICY IF EXISTS "Titulares and Admins can insert versions" ON document_versions;

create policy "Versions viewable by all authenticated users"
  on document_versions for select to authenticated using ( true );

create policy "Titulares and Admins can insert versions"
  on document_versions for insert to authenticated with check ( coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) IN ('admin', 'titular') );

-- 6. Create Navigation Tabs Table (Dynamic Sidebar Menu)
CREATE TABLE IF NOT EXISTS public.navigation_tabs (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  path text not null default '/editor',
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.navigation_tabs enable row level security;

DROP POLICY IF EXISTS "Navigation tabs viewable by all authenticated users" ON public.navigation_tabs;
DROP POLICY IF EXISTS "Admins can manage navigation tabs" ON public.navigation_tabs;

create policy "Navigation tabs viewable by all authenticated users"
  on navigation_tabs for select to authenticated using ( true );

create policy "Admins can manage navigation tabs"
  on navigation_tabs for all to authenticated using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) = 'admin' );

-- 7. Create Thematic Categories Table (Dynamic Mini-Folders)
CREATE TABLE IF NOT EXISTS public.thematic_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default categories if table is empty
INSERT INTO public.thematic_categories (name)
VALUES
  ('Manualidades'),
  ('Proyecto Institucional'),
  ('Programación y Robótica'),
  ('Ciudadanía Digital'),
  ('Cuidado Digital'),
  ('Alfabetización')
ON CONFLICT (name) DO NOTHING;

alter table public.thematic_categories enable row level security;

DROP POLICY IF EXISTS "Categories viewable by all authenticated users" ON public.thematic_categories;
DROP POLICY IF EXISTS "Admins and Titulares can manage categories" ON public.thematic_categories;

create policy "Categories viewable by all authenticated users"
  on thematic_categories for select to authenticated using ( true );

create policy "Admins and Titulares can manage categories"
  on thematic_categories for all to authenticated using ( coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), public.get_user_role()) IN ('admin', 'titular') );
