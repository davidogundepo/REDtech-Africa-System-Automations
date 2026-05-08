import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- helpers ----------
async function downloadFile(url) {
  console.log(`  Downloading from ${url.substring(0, 80)}...`);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getContentType(type) {
  const map = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    image: 'image/jpeg',
    png: 'image/png',
  };
  return map[type] || 'application/octet-stream';
}

async function uploadAndInsert(fileName, fileType, buffer, uploaderName, department) {
  const uniqueName = `${Date.now()}-${fileName}`;
  const { data, error } = await supabase.storage.from('documents').upload(uniqueName, buffer, {
    contentType: getContentType(fileType),
    upsert: false
  });

  if (error) {
    console.error(`  ❌ Upload error for ${fileName}: ${error.message}`);
    return null;
  }

  const { data: publicData } = supabase.storage.from('documents').getPublicUrl(uniqueName);
  const publicUrl = publicData.publicUrl;

  // Calculate real size
  const sizeBytes = buffer.length;
  const sizeStr = sizeBytes > 1048576
    ? `${(sizeBytes / 1048576).toFixed(1)} MB`
    : `${(sizeBytes / 1024).toFixed(0)} KB`;

  const { error: dbError } = await supabase.from('documents').insert([{
    name: fileName,
    type: fileType,
    size: sizeStr,
    url: publicUrl,
    department: department || null,
    created_by: uploaderName
  }]);

  if (dbError) {
    console.error(`  ❌ DB insert error for ${fileName}: ${dbError.message}`);
    return null;
  }

  console.log(`  ✅ ${fileName} (${sizeStr}) -> ${publicUrl.substring(0, 60)}...`);
  return publicUrl;
}

// ---------- main ----------
async function run() {
  try {
    // 1. Get first user profile
    const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
    const users = profiles && profiles.length > 0
      ? profiles.map(p => p.full_name)
      : ['System Admin'];
    const pickUser = () => users[Math.floor(Math.random() * users.length)];

    // 2. DELETE all existing documents from DB
    console.log('\n🗑️  Clearing existing document records...');
    const { error: delError } = await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) console.error('  Warning: could not clear documents table:', delError.message);
    else console.log('  ✅ All old records deleted');

    // 3. Clear storage bucket (list and delete all files)
    console.log('\n🗑️  Clearing storage bucket...');
    const { data: existingFiles } = await supabase.storage.from('documents').list('', { limit: 500 });
    if (existingFiles && existingFiles.length > 0) {
      const paths = existingFiles.map(f => f.name);
      await supabase.storage.from('documents').remove(paths);
      console.log(`  ✅ Removed ${paths.length} files from storage`);
    } else {
      console.log('  (bucket was already empty)');
    }

    // 4. Real files to download and upload
    console.log('\n📥 Downloading and uploading real files...\n');

    const realFiles = [
      // ── PDFs ──
      {
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        name: 'Q3_Operations_Report_2026.pdf',
        type: 'pdf',
        department: 'operations'
      },
      {
        url: 'https://www.africau.edu/images/default/sample.pdf',
        name: 'Q1_Financial_Report_2026.pdf',
        type: 'pdf',
        department: 'finance'
      },
      {
        url: 'https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf',
        name: '2026_Marketing_Strategy.pdf',
        type: 'pdf',
        department: 'marketing'
      },
      // ── DOCX (real .docx binary from calibre project) ──
      {
        url: 'https://calibre-ebook.com/downloads/demos/demo.docx',
        name: 'Employee_Onboarding_Template.docx',
        type: 'docx',
        department: 'hr'
      },
      // ── CSV ──
      {
        url: 'https://raw.githubusercontent.com/jbrownlee/Datasets/master/daily-min-temperatures.csv',
        name: 'Fleet_Telemetry_Data.csv',
        type: 'csv',
        department: 'operations'
      },
      // ── Images ──
      {
        url: 'https://picsum.photos/1200/800',
        name: 'Brand_Guidelines_Hero.jpg',
        type: 'image',
        department: 'marketing'
      },
      {
        url: 'https://picsum.photos/1400/900',
        name: 'Office_Team_Photo_2026.jpg',
        type: 'image',
        department: null
      },
      // ── External links (no download needed) ──
    ];

    for (const file of realFiles) {
      try {
        const buffer = await downloadFile(file.url);
        await uploadAndInsert(file.name, file.type, buffer, pickUser(), file.department);
      } catch (e) {
        console.error(`  ⚠️  Skipping ${file.name}: ${e.message}`);
      }
    }

    // 5. Add external links (no file download needed)
    console.log('\n🔗 Adding external links...');
    const linkEntries = [
      {
        name: 'REDtech GitHub Repository',
        type: 'link',
        size: 'External',
        url: 'https://github.com/davidogundepo/REDtech-Africa-System-Automations',
        department: 'engineering',
        created_by: pickUser()
      },
    ];

    for (const link of linkEntries) {
      const { error } = await supabase.from('documents').insert([link]);
      if (error) console.error(`  ❌ ${link.name}: ${error.message}`);
      else console.log(`  ✅ ${link.name}`);
    }

    console.log('\n🎉 All done! Documents are ready.\n');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

run();
