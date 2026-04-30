

CREATE OR REPLACE FUNCTION "public"."recalc_user_quests_rank"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN

  WITH ranked AS (
    SELECT 
      uq.id,
      DENSE_RANK() OVER (
        PARTITION BY uq.quest_id
        ORDER BY uq.points_earned DESC, uq.created_at ASC, uq.user_id ASC
      ) AS new_rank
    FROM user_quests uq
    JOIN quests q ON q.id = uq.quest_id
    JOIN profiles p ON p.id = uq.user_id
    WHERE uq.quest_id = NEW.quest_id
      AND uq.status = 'active'
      AND q.status = 'active'
      AND p.status = 'active'
  )
  UPDATE user_quests uq
  SET leaderboard_rank = ranked.new_rank
  FROM ranked
  WHERE uq.id = ranked.id
    AND uq.leaderboard_rank IS DISTINCT FROM ranked.new_rank;


  UPDATE user_quests uq
  SET leaderboard_rank = NULL
  FROM quests q
  WHERE uq.quest_id = NEW.quest_id
    AND uq.quest_id = q.id
    AND (
      uq.status <> 'active'
      OR q.status <> 'active'
    )
    AND uq.leaderboard_rank IS NOT NULL;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."recalc_user_quests_rank_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status <> 'active' THEN

    WITH ranked AS (
      SELECT 
        uq.id,
        DENSE_RANK() OVER (
          PARTITION BY uq.quest_id
          ORDER BY uq.points_earned DESC, uq.created_at ASC, uq.user_id ASC
        ) AS new_rank
      FROM user_quests uq
      JOIN quests q ON q.id = uq.quest_id
      JOIN profiles p ON p.id = uq.user_id
      WHERE uq.status = 'active'
        AND q.status = 'active'
        AND p.status = 'active'
    )
    UPDATE user_quests uq
    SET leaderboard_rank = ranked.new_rank
    FROM ranked
    WHERE uq.id = ranked.id
      AND uq.leaderboard_rank IS DISTINCT FROM ranked.new_rank;
  END IF;

  IF OLD.status = 'active' AND NEW.status <> 'active' THEN

    UPDATE user_quests uq
    SET leaderboard_rank = NULL
    WHERE uq.user_id = NEW.id
      AND uq.leaderboard_rank IS NOT NULL;


    WITH ranked AS (
      SELECT 
        uq.id,
        DENSE_RANK() OVER (
          PARTITION BY uq.quest_id
          ORDER BY uq.points_earned DESC, uq.created_at ASC, uq.user_id ASC
        ) AS new_rank
      FROM user_quests uq
      JOIN quests q ON q.id = uq.quest_id
      JOIN profiles p ON p.id = uq.user_id
      WHERE uq.status = 'active'
        AND q.status = 'active'
        AND p.status = 'active'
    )
    UPDATE user_quests uq
    SET leaderboard_rank = ranked.new_rank
    FROM ranked
    WHERE uq.id = ranked.id
      AND uq.leaderboard_rank IS DISTINCT FROM ranked.new_rank;
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."get_top_quests_by_region"("input_region_id" "uuid") 
RETURNS TABLE(
  "user_id" "uuid", 
  "full_name" "text", 
  "alias" "text", 
  "city" "text", 
  "state_abbreviation" character varying, 
  "region_name" character varying, 
  "leaderboard_rank" integer, 
  "points_earned" integer, 
  "trails_completed_count" integer, 
  "vehicle_type" "text", 
  "make" "text", 
  "model" "text", 
  "year" "text", 
  "rig_description" "text", 
  "about_me" "text", 
  "profile_image_url" "text"
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uq.user_id,
        p.full_name,
        p.alias,
        c.name AS city,
        s.abbreviation AS state_abbreviation,
        r.name AS region_name,
        uq.leaderboard_rank,
        uq.points_earned,
        uq.trails_completed_count,
        p.vehicle_type,
        p.make,
        p.model,
        p.year,
        p.rig_description,
        p.about_me,
        p.profile_image_url
    FROM user_quests uq
    JOIN quests q ON q.id = uq.quest_id
    JOIN profiles p ON p.id = uq.user_id
    LEFT JOIN cities c ON c.id = p.city_id 
    LEFT JOIN states s ON s.id = p.state
    LEFT JOIN regions r ON r.id = s.region_id
    WHERE 
        (input_region_id IS NULL OR r.id = input_region_id)
        AND uq.leaderboard_rank IS NOT NULL
        AND uq.status = 'active'
        AND q.status = 'active'
        AND p.status = 'active'
    ORDER BY uq.leaderboard_rank ASC, uq.points_earned DESC
    LIMIT 10;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."recalc_all_leaderboard_ranks"() 
RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN

  WITH ranked AS (
    SELECT 
      uq.id,
      DENSE_RANK() OVER (
        PARTITION BY uq.quest_id
        ORDER BY uq.points_earned DESC, uq.created_at ASC, uq.user_id ASC
      ) AS new_rank
    FROM user_quests uq
    JOIN quests q ON q.id = uq.quest_id
    JOIN profiles p ON p.id = uq.user_id
    WHERE uq.status = 'active'
      AND q.status = 'active'
      AND p.status = 'active'
  )
  UPDATE user_quests uq
  SET leaderboard_rank = ranked.new_rank
  FROM ranked
  WHERE uq.id = ranked.id
    AND uq.leaderboard_rank IS DISTINCT FROM ranked.new_rank;

  UPDATE user_quests uq
  SET leaderboard_rank = NULL
  FROM quests q
  JOIN profiles p ON p.id = uq.user_id
  WHERE uq.quest_id = q.id
    AND (
      uq.status <> 'active'
      OR q.status <> 'active'
      OR p.status <> 'active'
    )
    AND uq.leaderboard_rank IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."recalc_all_leaderboard_ranks"() TO "service_role";
