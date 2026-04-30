-- Fix missing FK on user_trails_participant.user_id so rows are deleted when a user is deleted
ALTER TABLE public.user_trails_participant
  ADD CONSTRAINT user_trails_participant_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
