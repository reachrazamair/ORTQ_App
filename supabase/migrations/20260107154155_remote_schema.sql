drop policy "Authorized users can create invitations" on "public"."community_group_invitations";

drop policy "Users can view invitations to their email" on "public"."community_group_invitations";

drop policy "Users can accept invitations" on "public"."community_group_invitations";

drop policy "Users can view own profile" on "public"."profiles";


  create policy "Enable insert for authenticated users only"
  on "public"."community_group_invitations"
  as permissive
  for insert
  to public
with check (true);



  create policy "Enable read access for all users"
  on "public"."community_group_invitations"
  as permissive
  for select
  to public
using (true);



  create policy "Policy with table joins"
  on "public"."community_group_join_requests"
  as permissive
  for update
  to public
using (true);



  create policy "Users can accept invitations"
  on "public"."community_group_invitations"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);


drop policy "Authenticated users can delete community post media" on "storage"."objects";

drop policy "Authenticated users can update community post media" on "storage"."objects";

drop policy "Authenticated users can upload community post media" on "storage"."objects";

drop policy "Authenticated users can upload group header images" on "storage"."objects";

drop policy "Community post media are readable" on "storage"."objects";

drop policy "Group admins can delete group header images" on "storage"."objects";

drop policy "Group admins can update group header images" on "storage"."objects";

drop policy "Group header images are readable" on "storage"."objects";


  create policy "community_group gi02ju_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'community_groups'::text));



  create policy "community_group gi02ju_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'community_groups'::text));



  create policy "community_group gi02ju_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'community_groups'::text));



  create policy "publick 59181p_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'community_posts'::text));



  create policy "publick 59181p_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'community_posts'::text));



