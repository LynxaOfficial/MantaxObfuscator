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
  
  if (!users[username]) {
    await sendTelegram(`❌ LOGIN GAGAL - User: ${username} tidak ditemukan`);
    return res.json({ success: false, message: 'Username tidak ditemukan!' });
  }
  
  const user = users[username];
  
  if (user.password !== hashPassword(password)) {
    await sendTelegram(`❌ LOGIN GAGAL - User: ${username} salah password`);
    return res.json({ success: false, message: 'Password salah!' });
  }
  
  if (user.isBanned) {
    await sendTelegram(`❌ LOGIN DITOLAK - User: ${username} di-BAN`);
    return res.json({ success: false, message: 'Akun telah di-BAN!' });
  }
  
  if (user.hwid && user.hwid !== hwid) {
    await sendTelegram(`❌ LOGIN DITOLAK - User: ${username} HWID mismatch`);
    return res.json({ success: false, message: 'HWID MISMATCH! Akun terikat ke perangkat lain.' });
  }
  
  if (!user.hwid) {
    user.hwid = hwid;
    hwids[hwid] = username;
    await sendTelegram(`🔗 HWID BIND - User: ${username} terikat ke HWID: ${hwid.substring(0,20)}...`);
  }
  
  user.lastLogin = new Date().toISOString();
  
  await sendTelegram(`✅ LOGIN BERHASIL - User: ${username} | HWID: ${hwid.substring(0,20)}...`);
  
  return res.json({ success: true, message: 'Login berhasil!', isAdmin: user.isAdmin || false });
}
