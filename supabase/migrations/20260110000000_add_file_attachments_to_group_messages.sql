-- Add file_url column to community_group_messages table
alter table public.community_group_messages
  add column if not exists file_url text;

-- Create index for file_url queries
create index if not exists community_group_messages_file_url_idx
  on public.community_group_messages (file_url)
  where file_url is not null;

-- Update content constraint to allow empty content if file_url is provided
alter table public.community_group_messages
  drop constraint if exists community_group_messages_content_check;

alter table public.community_group_messages
  add constraint community_group_messages_content_check
  check (
    (char_length(content) > 0 and char_length(content) <= 2000)
    or (file_url is not null and char_length(content) <= 2000)
  );

-- Update storage policies for group message file attachments
-- Files will be stored in community_groups bucket under messages/{group_id}/ path
-- Note: These policies are more specific than the general community_groups policies
-- and will take precedence for files in the messages/ folder

create policy "Group members can view message attachments"
  on storage.objects
  for select
  using (
    bucket_id = 'community_groups'
    and name like 'messages/%'
    and exists (
      select 1
      from public.community_group_members
      where community_group_members.user_id = auth.uid()
        and name like ('messages/' || community_group_members.group_id::text || '/%')
    )
  );

create policy "Group members can upload message attachments"
  on storage.objects
  for insert
  with check (
    bucket_id = 'community_groups'
    and name like 'messages/%'
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.community_group_members
      where community_group_members.user_id = auth.uid()
        and name like ('messages/' || community_group_members.group_id::text || '/%')
    )
  );

create policy "Users can delete their own message attachments"
  on storage.objects
  for delete
  using (
    bucket_id = 'community_groups'
    and name like 'messages/%'
    and auth.role() = 'authenticated'
    and exists (
      select 1
      from public.community_group_messages
      where community_group_messages.file_url = name
        and community_group_messages.user_id = auth.uid()
    )
  );
