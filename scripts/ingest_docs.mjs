import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadAndInsert(fileName, fileType, buffer, uploaderData, simulatedSize) {
  console.log(`Uploading ${fileName}...`);
  const uniqueName = `${Date.now()}-${fileName}`;
  const { data, error } = await supabase.storage.from('documents').upload(uniqueName, buffer, {
    contentType: 'application/octet-stream',
    upsert: false
  });

  if (error) {
    console.error(`Error uploading ${fileName}:`, error.message);
    return;
  }

  const { data: publicData } = supabase.storage.from('documents').getPublicUrl(uniqueName);
  const publicUrl = publicData.publicUrl;

  const { error: dbError } = await supabase.from('documents').insert([{
    name: fileName,
    type: fileType,
    size: simulatedSize,
    url: publicUrl,
    department: null,
    created_by: uploaderData.name
  }]);

  if (dbError) {
    console.error(`Error inserting into DB: ${fileName}`, dbError.message);
  } else {
    console.log(`Success: ${fileName} -> ${publicUrl}`);
  }
}

async function run() {
  try {
    // 1. Get User Profile (David Ogundepo)
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
    const userRole = profiles && profiles.length > 0 ? { id: profiles[0].id, name: profiles[0].full_name } : { id: '0000', name: 'System Admin' };

    // 2. Mock Real Data References
    const filesToUpload = [
      {
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        name: 'Q3_Operations_Report_2026.pdf',
        type: 'pdf',
        size: '1.4 MB'
      },
      {
        url: 'https://picsum.photos/1200/800',
        name: 'Brand_Guidelines_Hero.jpg',
        type: 'image',
        size: '2.8 MB'
      },
      {
        // Actually a text file standing in for CSV
        url: 'https://raw.githubusercontent.com/jbrownlee/Datasets/master/daily-min-temperatures.csv',
        name: 'Fleet_Telemetry_Data.csv',
        type: 'csv',
        size: '480 KB'
      }
    ];

    for (const file of filesToUpload) {
      try {
        const buffer = await downloadFile(file.url);
        await uploadAndInsert(file.name, file.type, buffer, userRole, file.size);
      } catch (e) {
        console.error(`Skipping ${file.name} due to fetch error:`, e.message);
      }
    }

    // 3. Add an external link (SharePoint/OneDrive simulation)
    await supabase.from('documents').insert([{
      name: 'Executive Strategy Deck 2026',
      type: 'link',
      size: 'External',
      url: 'https://docs.google.com/presentation/d/e/2PACX-1vS-qOimfXfUj0P9A8D6Mv2T70RBy54C7iS-zD-nQ/embed?start=false&loop=false&delayms=3000', // Example previewable deck
      department: 'executive',
      created_by: userRole.name
    }]);
    console.log("Success: Added external presentation link");

    console.log("All done!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
