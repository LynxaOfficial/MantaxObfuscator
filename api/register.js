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
  
  // Log ke Vercel (bisa diliat di Functions log)
  console.log('Register called:', { username, password: '***', hwid });
  
  // Validasi sederhana
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  
  if (username.length < 3) {
    return res.json({ success: false, message: 'Username minimal 3 karakter' });
  }
  
  if (password.length < 4) {
    return res.json({ success: false, message: 'Password minimal 4 karakter' });
  }
  
  // TEST: Langsung balik response sukses (BELUM SIMPAN KE GITHUB DULU)
  return res.json({
    success: true,
    message: `✅ Register berhasil (TEST MODE)! Username: ${username}`,
    isFirstUser: true
  });
}
