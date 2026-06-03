export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Cek method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  // Ambil data dari request
  const { username, password, hwid } = req.body;
  
  // Log ke Vercel
  console.log('Login called:', { username, password: '***', hwid });
  
  // Validasi sederhana
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  
  // TEST: Langsung balik response sukses
  return res.json({
    success: true,
    message: `✅ Login berhasil (TEST MODE)! Selamat datang, ${username}`,
    isAdmin: false
  });
      }
