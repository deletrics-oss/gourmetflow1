const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://npxhdsodvboqxrauwuwy.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weGhkc29kdmJvcXhyYXV3dXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5MzA5NCwiZXhwIjoyMDgyNDY5MDk0fQ.aFFVwoZSAr7LYmBzaOe9-_624ptrlO_kuCTxUAuFk6c');

async function run() {
  const { data: r } = await supabase.from('restaurants').select('*').limit(1);
  const { data: ur } = await supabase.from('user_restaurants').select('*').limit(1);
  
  console.log("RESTAURANT COLUMNS:", r ? Object.keys(r[0]) : "NULL");
  console.log("USER_RESTAURANT COLUMNS:", ur ? Object.keys(ur[0]) : "NULL");
}
run();
