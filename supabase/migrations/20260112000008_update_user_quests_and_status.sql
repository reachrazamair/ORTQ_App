-- Update function to sync user_quests and update status in user_trails_participant
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
    v_hidden_point_points integer;
    v_was_completed boolean;
    v_is_now_completed boolean;
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
    v_was_completed := (v_trail_participant_record.completed_at IS NOT NULL);
    v_is_now_completed := (p_completed_at IS NOT NULL);

    IF p_completed_at IS NOT NULL THEN
        SELECT COALESCE(points_awarded, 0) INTO v_hidden_point_points
        FROM public.hidden_points
        WHERE trail_id = v_trail_participant_record.trail_id
        LIMIT 1;

        IF v_hidden_point_points IS NULL THEN
            v_hidden_point_points := 0;
        END IF;

        v_new_points := COALESCE(p_points_earned, v_hidden_point_points);
        v_points_diff := v_new_points - v_old_points;

        UPDATE public.user_trails_participant
        SET 
            completed_at = p_completed_at,
            points_earned = v_new_points,
            status = 'completed'
        WHERE id = p_trail_participant_id;
    ELSIF p_points_earned IS NOT NULL THEN
        v_new_points := p_points_earned;
        v_points_diff := v_new_points - v_old_points;
        
        UPDATE public.user_trails_participant
        SET points_earned = v_new_points
        WHERE id = p_trail_participant_id;
    ELSE
        v_new_points := v_old_points;
        v_points_diff := 0;
    END IF;

    IF v_is_now_completed AND NOT v_was_completed THEN
        UPDATE public.user_quests
        SET 
            trails_completed_count = trails_completed_count + 1,
            points_earned = points_earned + v_new_points
        WHERE user_id = v_trail_participant_record.user_id
          AND quest_id = v_quest_id;
    ELSIF v_was_completed AND v_points_diff != 0 THEN
        UPDATE public.user_quests
        SET points_earned = points_earned + v_points_diff
        WHERE user_id = v_trail_participant_record.user_id
          AND quest_id = v_quest_id;
    END IF;
END;
$$;

-- Update get_all_app_users to use user_quests.points_earned (which is now synced)
CREATE OR REPLACE FUNCTION "public"."get_all_app_users"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'alias', p.alias,
      'email', p.email,
      'created_at', p.created_at,
      'role', jsonb_build_object (
        'id', p.role_id,
        'name', r.name
      ),
      'points', COALESCE(uq.points_earned, 0),
      'keys', p.keys,
      'status', p.status,
      'quest_status', uq.status,
      'phone', p.phone,
      'city', jsonb_build_object(
        'id', c.id,
        'name', c.name
      ),
      'state', jsonb_build_object (
        'id', p.state,
        'name', s.name
      ),
      'address', p.address,
      'zip_code', p.zip_code,
      'vehicle_type', p.vehicle_type,
      'rig_description', p.rig_description,
      'about_me', p.about_me,
      'trails_completed', COALESCE(uq.trails_completed_count, 0),
      'rank', uq.leaderboard_rank  
    ) ORDER BY uq.leaderboard_rank
  )
  INTO result
  FROM profiles p
  LEFT JOIN roles r ON r.id = p.role_id
  LEFT JOIN states s ON s.id = p.state
  LEFT JOIN cities c ON c.id = p.city_id 
  LEFT JOIN LATERAL (
    SELECT uq.status, uq.points_earned, uq.trails_completed_count, uq.leaderboard_rank
    FROM user_quests uq
    JOIN quests q ON q.id = uq.quest_id
    WHERE uq.user_id = p.id
      AND q.status = 'active'
    LIMIT 1
  ) uq ON TRUE
  WHERE p.status <> 'deleted';

  RETURN result;
END;
$$;
