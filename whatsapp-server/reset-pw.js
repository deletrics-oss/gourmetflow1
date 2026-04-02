const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://npxhdsodvboqxrauwuwy.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weGhkc29kdmJvcXhyYXV3dXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njg5MzA5NCwiZXhwIjoyMDgyNDY5MDk0fQ.aFFVwoZSAr7LYmBzaOe9-_624ptrlO_kuCTxUAuFk6c');

async function run() {
  const users = [
    { email: "joel@gmail.com", id: "ba18f0e2-e164-46f9-bf59-efd6ea82c847" },
    { email: "joao1@gmail.com", id: "f2e08a4c-2cbf-4671-8a48-30eaa27dc067" }
  ];
  
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.updateUserById(u.id, { password: 'password123' });
    if (error) {
      console.log(`ERROR ${u.email}:`, error);
    } else {
      console.log(`SUCCESS ${u.email}: Password reset to "password123"`);
    }
  }
}
run();
