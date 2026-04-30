-- Fix: filter trails by completed_at instead of status
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
          AND utp.completed_at IS NULL;

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
          AND utp.completed_at IS NOT NULL;

        RETURN QUERY SELECT row_to_json(v_quest_record)::jsonb, v_unlocked_not_achieved, v_unlocked_and_achieved;
    END LOOP;

    RETURN;
END;
$$;
