require('dotenv').config({ path: 'whatsapp-server/.env' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://npxhdsodvboqxrauwuwy.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function test() {
  console.log("Testing insert...");

  // Fetch a valid restaurant_id first
  const { data: rest } = await supabase.from('restaurants').select('id').limit(1);
  if (!rest || rest.length === 0) {
      console.log("No valid restaurant found!");
      return;
  }
  const restaurant_id = rest[0].id;
  console.log("Using restaurant_id:", restaurant_id);

  // Simulate what POST /api/devices does
  const res = await supabase.from('whatsapp_devices').insert({
      id: uuidv4(),
      name: 'test-insert-script',
      connection_status: 'connecting',
      restaurant_id: restaurant_id
  });
  console.log("Response:", JSON.stringify(res, null, 2));
}
test();
