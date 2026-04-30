create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 2000),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

create index if not exists community_posts_user_id_idx
  on public.community_posts (user_id);

alter table public.community_posts enable row level security;

create policy "Anyone can view community posts"
  on public.community_posts
  for select
  using (true);

create policy "Authenticated users can create community posts"
  on public.community_posts
  for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update their community posts"
  on public.community_posts
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their community posts"
  on public.community_posts
  for delete
  using (auth.uid() = user_id);

create trigger update_community_posts_updated_at
  before update on public.community_posts
  for each row
  execute function public.update_updated_at_column();


create policy "Community post media are readable"
  on storage.objects
  for select
  using (bucket_id = 'community_posts');

create policy "Authenticated users can upload community post media"
  on storage.objects
  for insert
  with check (bucket_id = 'community_posts' and auth.role() = 'authenticated');

create policy "Authenticated users can update community post media"
  on storage.objects
  for update
  using (bucket_id = 'community_posts' and auth.role() = 'authenticated');

create policy "Authenticated users can delete community post media"
  on storage.objects
  for delete
  using (bucket_id = 'community_posts' and auth.role() = 'authenticated');

