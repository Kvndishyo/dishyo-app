
create type public.app_role as enum ('admin', 'user');
create type public.post_visibility as enum ('public', 'friends');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  restaurateur boolean not null default false,
  restaurateur_plan text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "View own or admin roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create policy "Follows viewable by everyone" on public.follows for select using (true);
create policy "Users manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  title text not null,
  restaurant text,
  category text,
  recipe text,
  visibility public.post_visibility not null default 'public',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
alter table public.posts enable row level security;
create index posts_user_idx on public.posts(user_id);
create index posts_expires_idx on public.posts(expires_at);
create policy "View visible posts" on public.posts for select
  using (expires_at > now() and (visibility = 'public' or auth.uid() = user_id or exists (
    select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = posts.user_id
  )));
create policy "Users insert own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users delete own posts" on public.posts for delete using (auth.uid() = user_id);
create policy "Users update own posts" on public.posts for update using (auth.uid() = user_id);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
alter table public.likes enable row level security;
create policy "Likes viewable by everyone" on public.likes for select using (true);
create policy "Users manage own likes" on public.likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create index comments_post_idx on public.comments(post_id);
create policy "Comments viewable by everyone" on public.comments for select using (true);
create policy "Users insert own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments" on public.comments for delete using (auth.uid() = user_id);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  body text not null,
  ai_reply text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.support_messages enable row level security;
create policy "Users see own support" on public.support_messages for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Anyone can send support" on public.support_messages for insert with check (true);
create policy "Admins update support" on public.support_messages for update using (public.has_role(auth.uid(), 'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base_handle text; final_handle text; i int := 0;
begin
  base_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  if base_handle is null or length(base_handle) < 2 then base_handle := 'user' || substr(new.id::text, 1, 6); end if;
  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    i := i + 1; final_handle := base_handle || i::text;
  end loop;
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (new.id, final_handle, coalesce(new.raw_user_meta_data->>'display_name', final_handle), new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public) values ('dish-photos', 'dish-photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

create policy "Dish photos public read" on storage.objects for select using (bucket_id = 'dish-photos');
create policy "Users upload own dish photos" on storage.objects for insert with check (bucket_id = 'dish-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own dish photos" on storage.objects for delete using (bucket_id = 'dish-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own avatar" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create extension if not exists pg_cron;
select cron.schedule('dishyo-expire-posts', '*/15 * * * *', $$delete from public.posts where expires_at < now();$$);
