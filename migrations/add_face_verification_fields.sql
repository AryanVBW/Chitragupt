-- Add face verification fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS face_data JSONB,
ADD COLUMN IF NOT EXISTS requires_face_verification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS face_verification_enabled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_face_verification TIMESTAMP WITH TIME ZONE;

-- Create index for face verification queries
CREATE INDEX IF NOT EXISTS idx_users_face_verification ON public.users(requires_face_verification) WHERE requires_face_verification = true;

-- Add RLS policy for face data access
CREATE POLICY "Users can manage their own face data" ON public.users
FOR ALL USING (auth.uid() = id);

-- Create function to log face verification attempts
CREATE OR REPLACE FUNCTION log_face_verification_attempt(
  p_user_id UUID,
  p_success BOOLEAN,
  p_confidence FLOAT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.chat_messages (
    user_id,
    content,
    message_type,
    metadata
  ) VALUES (
    p_user_id,
    CASE 
      WHEN p_success THEN 'Face verification successful'
      ELSE 'Face verification failed'
    END,
    'system',
    jsonb_build_object(
      'type', 'face_verification',
      'success', p_success,
      'confidence', p_confidence,
      'timestamp', NOW()
    )
  );
  
  -- Update last verification timestamp on success
  IF p_success THEN
    UPDATE public.users 
    SET last_face_verification = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_face_verification_attempt(UUID, BOOLEAN, FLOAT) TO authenticated;

-- Create function to enable face verification for a user
CREATE OR REPLACE FUNCTION enable_face_verification(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET 
    requires_face_verification = true,
    face_verification_enabled_at = NOW()
  WHERE id = p_user_id AND auth.uid() = id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION enable_face_verification(UUID) TO authenticated;

-- Create function to disable face verification for a user
CREATE OR REPLACE FUNCTION disable_face_verification(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET 
    requires_face_verification = false,
    face_data = NULL,
    face_verification_enabled_at = NULL,
    last_face_verification = NULL
  WHERE id = p_user_id AND auth.uid() = id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION disable_face_verification(UUID) TO authenticated;