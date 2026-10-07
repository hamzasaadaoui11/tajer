const { createClient } = require('@supabase/supabase-js');
const url = 'https://ebzfioqhbsoiurcpzsnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemZpb3FoYnNvaXVyY3B6c25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODQ1NTAsImV4cCI6MjEwNTc2MDU1MH0.FeyHUdnOlkjBOtjA0972-Q0xKHFX6q0BJaD2AcSjnI4';
const client = createClient(url, key);

async function findBroad() {
  console.log('--- Searching in businesses table ---');
  const { data: b1, error: e1 } = await client.from('businesses').select('*').ilike('email', '%ilyas%');
  console.log('ilike %ilyas% in businesses (email):', b1);

  const { data: b2, error: e2 } = await client.from('businesses').select('*').ilike('id', '%ilyas%');
  console.log('ilike %ilyas% in businesses (id):', b2);

  const { data: b3, error: e3 } = await client.from('businesses').select('*').ilike('name', '%ilyas%');
  console.log('ilike %ilyas% in businesses (name):', b3);

  console.log('\n--- Listing ALL businesses in database ---');
  const { data: allBiz, error: bizErr } = await client.from('businesses').select('id, name, email, created_at');
  if (allBiz) {
    console.log('Total businesses count:', allBiz.length);
    allBiz.forEach(b => {
      console.log('Biz ID:', b.id, '| Name:', b.name, '| Email:', b.email, '| Created:', b.created_at);
    });
  } else {
    console.error('Error fetching all businesses:', bizErr);
  }
}
findBroad();
