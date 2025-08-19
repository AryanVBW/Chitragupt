import { supabase } from '../lib/supabase';

const migrationSQL = `
-- Add face verification fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS face_data JSONB,
ADD COLUMN IF NOT EXISTS requires_face_verification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS face_verification_enabled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_face_verification TIMESTAMP WITH TIME ZONE;

-- Create index for face verification queries
CREATE INDEX IF NOT EXISTS idx_users_face_verification 
ON public.users (requires_face_verification, last_face_verification);

-- RLS policy for face data
CREATE POLICY IF NOT EXISTS "Users can manage their own face data" 
ON public.users 
FOR ALL 
USING (auth.uid() = id);
`;

export async function runFaceVerificationMigration() {
  try {
    console.log('Running face verification migration...');
    
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Migration error:', error);
      throw error;
    }
    
    console.log('Face verification migration completed successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('Failed to run migration:', error);
    return { success: false, error };
  }
}