import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabaseServiceKey) {
      // If no service role key, use the anon key to get the current user
      // This approach won't list other users, but it won't cause foreign key violations
      return res.status(200).json({
        users: [] // Return empty array to avoid foreign key errors
      })
    }
    
    // Initialize Supabase with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get all users - this requires admin privileges with the service role key
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    // Format user data to return only necessary information
    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name ?? null
    }))

    return res.status(200).json({ users })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
}
