-- Fix: use correct column name 'points' in profiles table (not 'points_earned')
CREATE OR REPLACE FUNCTION "public"."admin_update_trail_participant"(
    "p_trail_participant_id" "uuid",
    "p_admin_user_id" "uuid",
    "p_completed_at" timestamptz DEFAULT NULL,
    "p_points_earned" integer DEFAULT NULL
) RETURNS void
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
    v_trail_participant_record user_trails_participant%ROWTYPE;
    v_quest_id uuid;
    v_old_points integer;
    v_new_points integer;
    v_points_diff integer;
BEGIN

    SELECT is_admin_user(p_admin_user_id) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can update trail participants';
    END IF;


    SELECT * INTO v_trail_participant_record
    FROM public.user_trails_participant
    WHERE id = p_trail_participant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trail participant record not found';
    END IF;

    v_old_points := COALESCE(v_trail_participant_record.points_earned, 0);
    v_quest_id := v_trail_participant_record.quest_id;

    IF p_points_earned IS NOT NULL THEN
        v_new_points := p_points_earned;
        v_points_diff := v_new_points - v_old_points;
        
        UPDATE public.user_trails_participant
        SET points_earned = v_new_points
        WHERE id = p_trail_participant_id;
    ELSE
        v_new_points := v_old_points;
        v_points_diff := 0;
    END IF;

    IF p_completed_at IS NOT NULL THEN
        UPDATE public.user_trails_participant
        SET 
            completed_at = p_completed_at,
            status = 'completed'
        WHERE id = p_trail_participant_id;
    END IF;

    IF p_completed_at IS NOT NULL AND v_trail_participant_record.status != 'completed' THEN
        UPDATE public.user_quests
        SET 
            trails_completed_count = trails_completed_count + 1,
            points_earned = points_earned + v_new_points
        WHERE user_id = v_trail_participant_record.user_id
          AND quest_id = v_quest_id;
        
        UPDATE public.profiles
        SET points_earned = points_earned + v_new_points
        WHERE id = v_trail_participant_record.user_id;
    ELSIF p_points_earned IS NOT NULL AND v_trail_participant_record.status = 'completed' THEN
        UPDATE public.user_quests
        SET points_earned = points_earned + v_points_diff
        WHERE user_id = v_trail_participant_record.user_id
          AND quest_id = v_quest_id;
        
        IF v_points_diff != 0 THEN
            UPDATE public.profiles
            SET points_earned = points_earned + v_points_diff
            WHERE id = v_trail_participant_record.user_id;
        END IF;
    END IF;
END;
$$;
