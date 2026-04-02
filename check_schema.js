const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/var/www/gourmetflow/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  // Query a single row from whatsapp_logic_configs to see columns
  const { data, error } = await supabase.from('whatsapp_logic_configs').select('*').limit(1);
  if (error) {
    if (error.code === 'PGRST204') {
        console.log('Verification: Column missing error confirmed.');
    } else {
        console.error('Error querying table:', error);
    }
  } else {
    console.log('Columns found:', Object.keys(data[0] || {}));
  }

  // Also check whatsapp_devices
  const { data: devices } = await supabase.from('whatsapp_devices').select('*').limit(1);
  console.log('Columns in whatsapp_devices:', Object.keys(devices?.[0] || {}));
}

checkSchema();
