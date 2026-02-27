-- SQL Script to set up EduPlan Pro Database Structure

-- 1. Create Users Table
CREATE TABLE public.users (
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
create policy "Public profiles are viewable by everyone."
  on users for select
  to authenticated
  using ( true );

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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create policy "Users can insert their own profile."
  on users for insert
  to authenticated
  with check ( auth.uid() = id );

create policy "Admins can insert and update profiles."
  on users for all
  to authenticated
  using ( (select role from users where id = auth.uid()) = 'admin' );

-- 2. Create Documents Table
CREATE TABLE public.documents (
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
  delete_reason text
);

alter table public.documents enable row level security;

-- Policies for documents
create policy "Active documents viewable by all authenticated users"
  on documents for select
  to authenticated
  using ( status = 'active' OR (select role from users where id = auth.uid()) = 'admin' );

create policy "Admins and Titulares can insert documents"
  on documents for insert
  to authenticated
  with check ( (select role from users where id = auth.uid()) in ('admin', 'titular') );

create policy "Authors can update their own documents (soft delete)"
  on documents for update
  to authenticated
  using ( author_id = auth.uid() OR (select role from users where id = auth.uid()) = 'admin' );

-- 3. Create Comments Table
CREATE TABLE public.comments (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) not null,
  author_id uuid references public.users(id) not null,
  author_name text not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;

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
  -- Check if caller is admin
  if (select role from public.users where id = auth.uid()) != 'admin' then
    raise exception 'Unauthorized: Only admins can perform this action';
  end if;

  -- Update auth.users password
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_user_id;
end;
$$;
