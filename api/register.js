export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { username, password, hwid } = req.body;
  
  console.log('📝 REGISTER CALLED:', { username, hwid });
  
  // LANGSUNG BALIKIN SUKSES
  return res.json({ 
    success: true, 
    message: `✅ TEST: Register berhasil untuk ${username}!`,
    isFirstUser: true
  });
}
