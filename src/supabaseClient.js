import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bipepwywpltgleasnfbe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpcGVwd3l3cGx0Z2xlYXNuZmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzEwMjgsImV4cCI6MjA4NjkwNzAyOH0.zBhV5eI4qClLlbXKgv2w2hecJ_EsJDVzWutxOVYkjeI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)