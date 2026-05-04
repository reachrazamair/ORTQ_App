-- Create table for user blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS for user_blocks
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks" ON public.user_blocks
    FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create their own blocks" ON public.user_blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON public.user_blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- Create table for moderation reports
CREATE TABLE IF NOT EXISTS public.moderation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'message')),
    content_id UUID NOT NULL,
    reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for moderation_reports
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.moderation_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- Only admins/service role should be able to view/edit reports in a real scenario,
-- but for simplicity we'll allow service_role to handle it.
-- If the app had an admin dashboard, we'd add policies here.
