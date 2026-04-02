const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://npxhdsodvboqxrauwuwy.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weGhkc29kdmJvcXhyYXV3dXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5MzA5NCwiZXhwIjoyMDgyNDY5MDk0fQ.aFFVwoZSAr7LYmBzaOe9-_624ptrlO_kuCTxUAuFk6c');
const crypto = require('crypto');

async function run() {
  console.log("Attempting to insert device for Restaurant ID: 9272bc67-9f65-4e9c-9739-dc6a1bfa7149");
  const { data, error } = await supabase.from('whatsapp_devices').insert({
      id: crypto.randomUUID(),
      name: "diag-device-01",
      connection_status: "connecting",
      restaurant_id: "9272bc67-9f65-4e9c-9739-dc6a1bfa7149"
  });
  
  if (error) {
    console.error("FATAL POSTGRES ERROR:", error);
  } else {
    console.log("INSERTION SUCCESSFUL! Data:", data);
  }
}
run();
