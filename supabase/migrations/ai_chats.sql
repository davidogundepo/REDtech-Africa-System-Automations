CREATE TABLE IF NOT EXISTS public.ai_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own chats
CREATE POLICY "Users can view their own AI chats."
    ON public.ai_chats FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own chats
CREATE POLICY "Users can insert their own AI chats."
    ON public.ai_chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats
CREATE POLICY "Users can update their own AI chats."
    ON public.ai_chats FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own chats
CREATE POLICY "Users can delete their own AI chats."
    ON public.ai_chats FOR DELETE
    USING (auth.uid() = user_id);
