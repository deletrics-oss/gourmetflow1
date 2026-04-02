const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://npxhdsodvboqxrauwuwy.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weGhkc29kdmJvcXhyYXV3dXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5MzA5NCwiZXhwIjoyMDgyNDY5MDk0fQ.aFFVwoZSAr7LYmBzaOe9-_624ptrlO_kuCTxUAuFk6c');
const { v4: uuidv4 } = require('uuid');

async function run() {
  console.log("Attempting to insert device for Restaurant ID: b1f457f3-3079-427d-9a55-92fd616e1ff8");
  const { data, error } = await supabase.from('whatsapp_devices').insert({
      id: uuidv4(),
      name: "diag-device-01",
      connection_status: "connecting",
      restaurant_id: "b1f457f3-3079-427d-9a55-92fd616e1ff8"
  });
  
  if (error) {
    console.error("FATAL POSTGRES ERROR:", error);
  } else {
    console.log("INSERTION SUCCESSFUL! Data:", data);
  }
}
run();
