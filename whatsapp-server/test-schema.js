const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://npxhdsodvboqxrauwuwy.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weGhkc29kdmJvcXhyYXV3dXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5MzA5NCwiZXhwIjoyMDgyNDY5MDk0fQ.aFFVwoZSAr7LYmBzaOe9-_624ptrlO_kuCTxUAuFk6c');
async function run() {
  const { data, error } = await supabase.from('whatsapp_devices').insert({
      id: "6b5ee127-bb0e-424f-b79e-afffb5e39e72",
      name: "impossible",
      restaurant_id: "e48a1c97-6cb5-4511-b0db-fc7f300c3b9b"
  }); // Note: without select() to exactly simulate server behavior
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
