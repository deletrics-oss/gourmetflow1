const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/var/www/gourmetflow/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
    return;
  }
  const user = users.find(u => u.email === 'joel@gmail.com');
  if (user) {
    console.log('--- USER FOUND IN NEW PROJECT ---');
    console.log('Email:', user.email);
    console.log('ID:', user.id);
  } else {
    console.log('User joel@gmail.com NOT FOUND in new project.');
  }
}

checkUser();
