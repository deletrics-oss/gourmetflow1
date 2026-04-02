const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://npxhdsodvboqxrauwuwy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weGhkc29kdmJvcXhyYXV3dXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5MzA5NCwiZXhwIjoyMDgyNDY5MDk0fQ.aFFVwoZSAr7LYmBzaOe9-_624ptrlO_kuCTxUAuFk6c'
);

async function test() {
  const { data, error } = await supabase.from('whatsapp_devices').select('id, name, active_logic_id').limit(1);
  if (error) {
    console.error("SUPABASE ERROR:", error.message);
  } else {
    console.log("SUCCESS:", data);
  }
}
test();
