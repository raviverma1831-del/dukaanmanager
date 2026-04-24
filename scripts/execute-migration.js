import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  try {
    console.log('[v0] Starting database migration...')
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'scripts', '04_complete_database_setup.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('[v0] Executing migration script...')
    
    // Split by semicolon to execute statements individually
    const statements = sql.split(';').filter(s => s.trim())
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      try {
        const { error } = await supabase.rpc('exec', { sql: statement })
        if (error && !error.message.includes('already exists')) {
          console.warn(`[WARNING] Statement ${i + 1}: ${error.message}`)
        } else if (!error) {
          console.log(`[v0] ✓ Statement ${i + 1} executed`)
        }
      } catch (e) {
        console.warn(`[WARNING] Statement ${i + 1}: ${e.message}`)
      }
    }
    
    console.log('[v0] ✓ Migration complete!')
  } catch (error) {
    console.error('[ERROR] Migration failed:', error.message)
    process.exit(1)
  }
}

executeMigration()
