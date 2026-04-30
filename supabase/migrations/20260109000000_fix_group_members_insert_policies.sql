
drop policy if exists "Authenticated users can join public groups" on public.community_group_members;
drop policy if exists "Group admins can add members to private groups" on public.community_group_members;


create policy "Authenticated users can join any group"
  on public.community_group_members
  for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
  );
