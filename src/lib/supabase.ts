import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types matching the new schema
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  is_admin: boolean
  face_data?: any
  requires_face_verification: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  content: string
  message_type: string
  is_encrypted: boolean
  metadata?: any
  created_at: string
  updated_at: string
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_read: boolean
  created_by?: string
  created_at: string
  read_at?: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category: string
  stock_quantity: number
  is_available: boolean
  rating: number
  created_at: string
  updated_at: string
}

export interface FileUpload {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  bucket_name: string
  is_public: boolean
  metadata?: any
  created_at: string
}

// Auth helper functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const signUp = async (email: string, password: string, fullName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email)
  return { data, error }
}

// Database helper functions
export const getUserProfile = async (userId?: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId || (await getCurrentUser())?.id)
    .single()
  return { data, error }
}

export const updateUserProfile = async (updates: Partial<User>) => {
  const user = await getCurrentUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
  return { data, error }
}

export const isAdmin = async () => {
  const { data } = await supabase.rpc('is_admin')
  return data || false
}

export const getUserStats = async () => {
  const { data, error } = await supabase.rpc('get_user_stats')
  return { data, error }
}