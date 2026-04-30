
CREATE OR REPLACE FUNCTION "public"."get_user_trails_summary_for_admin"("p_user_id" "uuid") 
RETURNS TABLE("quest" "jsonb", "unlocked_not_achieved" "jsonb", "unlocked_and_achieved" "jsonb")
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_quest_record quests%ROWTYPE;
    v_unlocked_not_achieved jsonb;
    v_unlocked_and_achieved jsonb;
BEGIN
    FOR v_quest_record IN
        SELECT q.*
        FROM public.quests q
        JOIN public.user_quests uq ON uq.quest_id = q.id
        WHERE uq.user_id = p_user_id
        ORDER BY q.start_date DESC
    LOOP
        SELECT jsonb_agg(
                   jsonb_build_object(
                       'id', utp.id,
                       'trail_id', utp.trail_id,
                       'trail_name', t.name,
                       'status', utp.status,
                       'keys_used', utp.keys_used,
                       'points_earned', utp.points_earned,
                       'completed_at', utp.completed_at,
                       'joined_at', utp.joined_at,
                       'quest_id', utp.quest_id
                   )
               ) INTO v_unlocked_not_achieved
        FROM public.user_trails_participant utp
        JOIN public.trails t ON t.id = utp.trail_id
        WHERE utp.user_id = p_user_id
          AND utp.quest_id = v_quest_record.id
          AND utp.status = 'unlocked';


        SELECT jsonb_agg(
                   jsonb_build_object(
                       'id', utp.id,
                       'trail_id', utp.trail_id,
                       'trail_name', t.name,
                       'status', utp.status,
                       'keys_used', utp.keys_used,
                       'points_earned', utp.points_earned,
                       'completed_at', utp.completed_at,
                       'joined_at', utp.joined_at,
                       'quest_id', utp.quest_id
                   )
               ) INTO v_unlocked_and_achieved
        FROM public.user_trails_participant utp
        JOIN public.trails t ON t.id = utp.trail_id
        WHERE utp.user_id = p_user_id
          AND utp.quest_id = v_quest_record.id
          AND utp.status = 'completed';

        RETURN QUERY SELECT row_to_json(v_quest_record)::jsonb, v_unlocked_not_achieved, v_unlocked_and_achieved;
    END LOOP;

    RETURN;
END;
$$;


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
    v_new_points := COALESCE(p_points_earned, v_old_points);
    v_points_diff := v_new_points - v_old_points;
    v_quest_id := v_trail_participant_record.quest_id;


    UPDATE public.user_trails_participant
    SET 
        completed_at = COALESCE(p_completed_at, completed_at),
        points_earned = COALESCE(p_points_earned, points_earned),
        status = CASE 
            WHEN p_completed_at IS NOT NULL THEN 'completed'
            ELSE status
        END
    WHERE id = p_trail_participant_id;


    IF p_completed_at IS NOT NULL AND v_trail_participant_record.status != 'completed' THEN
        UPDATE public.user_quests
        SET 
            trails_completed_count = trails_completed_count + 1,
            points_earned = points_earned + v_new_points
        WHERE user_id = v_trail_participant_record.user_id
          AND quest_id = v_quest_id;
        

        UPDATE public.profiles
        SET points = points + v_new_points
        WHERE id = v_trail_participant_record.user_id;
    ELSIF p_points_earned IS NOT NULL AND v_trail_participant_record.status = 'completed' THEN

        UPDATE public.user_quests
        SET points_earned = points_earned + v_points_diff
        WHERE user_id = v_trail_participant_record.user_id
          AND quest_id = v_quest_id;
        

        IF v_points_diff != 0 THEN
            UPDATE public.profiles
            SET points = points + v_points_diff
            WHERE id = v_trail_participant_record.user_id;
        END IF;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."get_user_trails_summary_for_admin"("uuid") TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."admin_update_trail_participant"("uuid", "uuid", timestamptz, integer) TO authenticated;
