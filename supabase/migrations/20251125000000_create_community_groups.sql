
create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) > 0 and char_length(name) <= 100),
  description text not null default '' check (char_length(description) <= 1000),
  header_image_url text,
  is_private boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_groups_created_at_idx
  on public.community_groups (created_at desc);

create index if not exists community_groups_created_by_idx
  on public.community_groups (created_by);

create index if not exists community_groups_is_private_idx
  on public.community_groups (is_private);


create index if not exists community_groups_last_activity_at_idx
  on public.community_groups (last_activity_at desc);


create index if not exists community_groups_name_search_idx
  on public.community_groups using gin (to_tsvector('english', name));


alter table public.community_groups enable row level security;


create policy "Authenticated users can view all groups"
  on public.community_groups
  for select
  using (auth.role() = 'authenticated');


create policy "Authenticated users can create groups"
  on public.community_groups
  for insert
  with check (auth.role() = 'authenticated' and auth.uid() = created_by);


create trigger update_community_groups_updated_at
  before update on public.community_groups
  for each row
  execute function public.update_updated_at_column();


create table if not exists public.community_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);


create index if not exists community_group_members_group_id_idx
  on public.community_group_members (group_id);

create index if not exists community_group_members_user_id_idx
  on public.community_group_members (user_id);

create index if not exists community_group_members_role_idx
  on public.community_group_members (role);


alter table public.community_group_members enable row level security;


create policy "Authenticated users can view all group members"
  on public.community_group_members
  for select
  using (auth.role() = 'authenticated');


create policy "Authenticated users can join public groups"
  on public.community_group_members
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and exists (
      select 1
      from public.community_groups
      where community_groups.id = community_group_members.group_id
        and community_groups.is_private = false
    )
  );


create policy "Group admins can add members to private groups"
  on public.community_group_members
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.community_groups
      where community_groups.id = community_group_members.group_id
        and community_groups.is_private = true
        and exists (
          select 1
          from public.community_group_members as cgm
          where cgm.group_id = community_groups.id
            and cgm.user_id = auth.uid()
            and cgm.role = 'admin'
        )
    )
  );


create policy "Users can leave groups"
  on public.community_group_members
  for delete
  using (auth.uid() = user_id);


create policy "Group admins can remove members"
  on public.community_group_members
  for delete
  using (
    exists (
      select 1
      from public.community_group_members as cgm
      where cgm.group_id = community_group_members.group_id
        and cgm.user_id = auth.uid()
        and cgm.role = 'admin'
    )
    and community_group_members.role != 'admin'
  );


create policy "Group admins can update member roles"
  on public.community_group_members
  for update
  using (
    exists (
      select 1
      from public.community_group_members as cgm
      where cgm.group_id = community_group_members.group_id
        and cgm.user_id = auth.uid()
        and cgm.role = 'admin'
    )
  );


create or replace function public.add_group_creator_as_admin()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.community_group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict (group_id, user_id) do nothing;
  return new;
end;
$$;


create trigger add_group_creator_as_admin_trigger
  after insert on public.community_groups
  for each row
  execute function public.add_group_creator_as_admin();


create policy "Group admins can update groups"
  on public.community_groups
  for update
  using (
    exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_groups.id
        and community_group_members.user_id = auth.uid()
        and community_group_members.role = 'admin'
    )
  );


create policy "Group admins can delete groups"
  on public.community_groups
  for delete
  using (
    exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_groups.id
        and community_group_members.user_id = auth.uid()
        and community_group_members.role = 'admin'
    )
  );


create table if not exists public.community_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists community_group_messages_group_id_idx
  on public.community_group_messages (group_id, created_at desc);

create index if not exists community_group_messages_user_id_idx
  on public.community_group_messages (user_id);


alter table public.community_group_messages enable row level security;


create policy "Members can view group messages"
  on public.community_group_messages
  for select
  using (
    exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_group_messages.group_id
        and community_group_members.user_id = auth.uid()
    )
  );


create policy "Members can send group messages"
  on public.community_group_messages
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_group_messages.group_id
        and community_group_members.user_id = auth.uid()
    )
  );


create policy "Users can update their own messages"
  on public.community_group_messages
  for update
  using (auth.uid() = user_id);


create policy "Users can delete their own messages"
  on public.community_group_messages
  for delete
  using (auth.uid() = user_id);


create trigger update_community_group_messages_updated_at
  before update on public.community_group_messages
  for each row
  execute function public.update_updated_at_column();


create or replace function public.update_group_last_activity()
returns trigger
language plpgsql
as $$
begin
  update public.community_groups
  set last_activity_at = now()
  where id = new.group_id;
  return new;
end;
$$;

create trigger update_group_last_activity_trigger
  after insert on public.community_group_messages
  for each row
  execute function public.update_group_last_activity();


create table if not exists public.community_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (group_id, user_id)
);


create index if not exists community_group_join_requests_group_id_idx
  on public.community_group_join_requests (group_id, status);

create index if not exists community_group_join_requests_user_id_idx
  on public.community_group_join_requests (user_id);


alter table public.community_group_join_requests enable row level security;


create policy "Users can view their own join requests"
  on public.community_group_join_requests
  for select
  using (auth.uid() = user_id);


create policy "Group admins can view join requests"
  on public.community_group_join_requests
  for select
  using (
    exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_group_join_requests.group_id
        and community_group_members.user_id = auth.uid()
        and community_group_members.role = 'admin'
    )
  );


create policy "Users can create join requests for private groups"
  on public.community_group_join_requests
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
    and status = 'pending'
    and exists (
      select 1
      from public.community_groups
      where community_groups.id = community_group_join_requests.group_id
        and community_groups.is_private = true
    )
    and not exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_group_join_requests.group_id
        and community_group_members.user_id = auth.uid()
    )
  );


create policy "Group admins can update join requests"
  on public.community_group_join_requests
  for update
  using (
    exists (
      select 1
      from public.community_group_members
      where community_group_members.group_id = community_group_join_requests.group_id
        and community_group_members.user_id = auth.uid()
        and community_group_members.role = 'admin'
    )
  );


create or replace function public.add_user_to_group_on_approval()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'approved' and old.status = 'pending' then

    insert into public.community_group_members (group_id, user_id, role)
    values (new.group_id, new.user_id, 'member')
    on conflict (group_id, user_id) do nothing;
    

    new.reviewed_at = now();
    new.reviewed_by = auth.uid();
  end if;
  return new;
end;
$$;

create trigger add_user_to_group_on_approval_trigger
  before update on public.community_group_join_requests
  for each row
  execute function public.add_user_to_group_on_approval();


create table if not exists public.community_group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);


create index if not exists community_group_invitations_group_id_idx
  on public.community_group_invitations (group_id, status);

create index if not exists community_group_invitations_email_idx
  on public.community_group_invitations (email);

create index if not exists community_group_invitations_token_idx
  on public.community_group_invitations (token) where status = 'pending';


alter table public.community_group_invitations enable row level security;


create policy "Users can view invitations to their email"
  on public.community_group_invitations
  for select
  using (
    auth.role() = 'authenticated'
    and (

      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.email = community_group_invitations.email
      )

      or exists (
        select 1
        from public.community_group_members
        where community_group_members.group_id = community_group_invitations.group_id
          and community_group_members.user_id = auth.uid()
      )
    )
  );

create policy "Authorized users can create invitations"
  on public.community_group_invitations
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = invited_by
    and (
      -- For private groups, only admins can invite
      (
        exists (
          select 1
          from public.community_groups
          where community_groups.id = community_group_invitations.group_id
            and community_groups.is_private = true
        )
        and exists (
          select 1
          from public.community_group_members
          where community_group_members.group_id = community_group_invitations.group_id
            and community_group_members.user_id = auth.uid()
            and community_group_members.role = 'admin'
        )
      )
  
      or (
        exists (
          select 1
          from public.community_groups
          where community_groups.id = community_group_invitations.group_id
            and community_groups.is_private = false
        )
        and exists (
          select 1
          from public.community_group_members
          where community_group_members.group_id = community_group_invitations.group_id
            and community_group_members.user_id = auth.uid()
        )
      )
    )
  );


create policy "Users can accept invitations"
  on public.community_group_invitations
  for update
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.email = community_group_invitations.email
    )
    and status = 'pending'
  );


create or replace function public.add_user_to_group_on_invitation_acceptance()
returns trigger
language plpgsql
security definer
as $$
declare
  user_uuid uuid;
begin
  if new.status = 'accepted' and old.status = 'pending' then

    select id into user_uuid
    from public.profiles
    where email = new.email;
    
    if user_uuid is not null then
    
      insert into public.community_group_members (group_id, user_id, role)
      values (new.group_id, user_uuid, 'member')
      on conflict (group_id, user_id) do nothing;
      

      new.accepted_at = now();
    end if;
  end if;
  return new;
end;
$$;


create trigger add_user_to_group_on_invitation_acceptance_trigger
  before update on public.community_group_invitations
  for each row
  execute function public.add_user_to_group_on_invitation_acceptance();


insert into storage.buckets (id, name, public)
values ('community_groups', 'community_groups', true)
on conflict (id) do nothing;


create policy "Group header images are readable"
  on storage.objects
  for select
  using (bucket_id = 'community_groups');

create policy "Authenticated users can upload group header images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'community_groups'
    and auth.role() = 'authenticated'
  );

create policy "Group admins can update group header images"
  on storage.objects
  for update
  using (
    bucket_id = 'community_groups'
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.community_groups
      join public.community_group_members on community_group_members.group_id = community_groups.id
      where community_group_members.user_id = auth.uid()
        and community_group_members.role = 'admin'
        and (storage.foldername(name))[1] = community_groups.id::text
    )
  );

create policy "Group admins can delete group header images"
  on storage.objects
  for delete
  using (
    bucket_id = 'community_groups'
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.community_groups
      join public.community_group_members on community_group_members.group_id = community_groups.id
      where community_group_members.user_id = auth.uid()
        and community_group_members.role = 'admin'
        and (storage.foldername(name))[1] = community_groups.id::text
    )
  );
