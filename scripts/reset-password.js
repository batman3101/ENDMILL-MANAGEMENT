const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword(email, newPassword) {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id,
      { password: newPassword }
    )

    if (error) throw error
    console.log(`Password reset successful for ${email}`)
    return data
  } catch (error) {
    console.error('Error resetting password:', error.message)
    throw error
  }
}

// Reset password for zetooo1972@gmail.com
resetPassword('zetooo1972@gmail.com', 'Akfmrkdns19!')
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
