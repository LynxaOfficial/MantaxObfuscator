// MEMORY DATABASE (tetap ada selama instance Vercel hidup)
let users = {};
let hwids = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { username, password, hwid } = req.body;
  
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Isi semua field!' });
  }
  if (username.length < 3) {
    return res.json({ success: false, message: 'Username minimal 3 karakter!' });
  }
  if (password.length < 4) {
    return res.json({ success: false, message: 'Password minimal 4 karakter!' });
  }
  
  // ========== TELEGRAM LO ==========
  const TELEGRAM_TOKEN = '8797116664:AAE1OIojNvuVQ4pptgEoqnYbbeMP7XeDCig';
  const TELEGRAM_CHAT_ID = '6849369483';
  // =================================
  
  function hashPassword(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
  
  async function sendTelegram(text) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text })
      });
    } catch(e) { console.log('Telegram error:', e.message); }
  }
  
  if (users[username]) {
    await sendTelegram(`❌ REGISTER GAGAL - Username: ${username} sudah ada`);
    return res.json({ success: false, message: 'Username sudah terdaftar!' });
  }
  
  if (hwids[hwid]) {
    await sendTelegram(`❌ REGISTER GAGAL - HWID sudah terikat ke ${hwids[hwid]}`);
    return res.json({ success: false, message: 'HWID sudah terikat ke akun lain! 1 perangkat = 1 akun.' });
  }
  
  const isFirstUser = Object.keys(users).length === 0;
  
  users[username] = {
    password: hashPassword(password),
    hwid: hwid,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isBanned: false,
    isAdmin: isFirstUser
  };
  hwids[hwid] = username;
  
  await sendTelegram(`✅ REGISTER BERHASIL - User: ${username} | HWID: ${hwid.substring(0,20)}... | Admin: ${isFirstUser ? 'YA' : 'TIDAK'}`);
  
  return res.json({ 
    success: true, 
    message: isFirstUser ? 'Register berhasil! Anda admin pertama!' : 'Register berhasil! Silakan login.',
    isFirstUser: isFirstUser
  });
}
