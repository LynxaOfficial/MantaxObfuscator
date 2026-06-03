export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { username, password, hwid } = req.body;
  
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  
  // ========== KONFIGURASI ==========
  const GITHUB_TOKEN = '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';
  const REPO_OWNER = 'LynxaOfficial';
  const REPO_NAME = 'MantaxObfuscator';
  const TELEGRAM_TOKEN = '7798368683:AAEwVqJZu4V79ynkqVhdr_yZ1N_s9qDQ_4o';
  const TELEGRAM_CHAT_ID = 'LynxaOfficial';
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
        body: JSON.stringify({ 
          chat_id: TELEGRAM_CHAT_ID, 
          text: text, 
          parse_mode: 'HTML' 
        })
      });
    } catch(e) { console.log('Telegram error:', e.message); }
  }
  
  try {
    const usersUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/users.json`;
    const usersRes = await fetch(usersUrl, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    
    let users = {};
    if (usersRes.status === 200) {
      const data = await usersRes.json();
      const content = Buffer.from(data.content, 'base64').toString();
      users = JSON.parse(content);
    }
    
    if (!users[username]) {
      await sendTelegram(`❌ <b>LOGIN GAGAL</b>\nUser: ${username}\nPesan: Username tidak ditemukan`);
      return res.json({ success: false, message: '❌ Username tidak ditemukan!' });
    }
    
    const user = users[username];
    
    if (user.password !== hashPassword(password)) {
      await sendTelegram(`❌ <b>LOGIN GAGAL</b>\nUser: ${username}\nPesan: Password salah`);
      return res.json({ success: false, message: '❌ Password salah!' });
    }
    
    if (user.isBanned) {
      await sendTelegram(`❌ <b>LOGIN DITOLAK</b>\nUser: ${username}\nPesan: Akun di-BAN`);
      return res.json({ success: false, message: '🚫 Akun telah di-BAN!' });
    }
    
    if (user.hwid && user.hwid !== hwid) {
      await sendTelegram(`❌ <b>LOGIN DITOLAK</b>\nUser: ${username}\nPesan: HWID mismatch\nHWID user: ${user.hwid}\nHWID input: ${hwid}`);
      return res.json({ success: false, message: '🔒 HWID MISMATCH! Akun terikat ke perangkat lain.' });
    }
    
    // Bind HWID kalo belum
    if (!user.hwid) {
      user.hwid = hwid;
      
      const hwidsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/hwids.json`;
      const hwidsRes = await fetch(hwidsUrl, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      
      let hwids = {};
      if (hwidsRes.status === 200) {
        const data = await hwidsRes.json();
        const content = Buffer.from(data.content, 'base64').toString();
        hwids = JSON.parse(content);
      }
      hwids[hwid] = username;
      
      let hwidsSha = null;
      const getHwidsRes = await fetch(hwidsUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
      if (getHwidsRes.status === 200) {
        const existing = await getHwidsRes.json();
        hwidsSha = existing.sha;
      }
      
      const hwidsContentBase64 = Buffer.from(JSON.stringify(hwids, null, 2)).toString('base64');
      await fetch(hwidsUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `HWID bind: ${username}`,
          content: hwidsContentBase64,
          sha: hwidsSha,
          branch: 'main'
        })
      });
    }
    
    user.lastLogin = new Date().toISOString();
    
    const usersContentBase64 = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
    let usersSha = null;
    const getUsersRes = await fetch(usersUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    if (getUsersRes.status === 200) {
      const existing = await getUsersRes.json();
      usersSha = existing.sha;
    }
    
    await fetch(usersUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Login: ${username}`,
        content: usersContentBase64,
        sha: usersSha,
        branch: 'main'
      })
    });
    
    await sendTelegram(`✅ <b>LOGIN BERHASIL</b>\n👤 User: ${username}\n🖥️ HWID: ${hwid.substring(0,20)}...\n📅 Waktu: ${new Date().toLocaleString()}`);
    
    return res.json({ 
      success: true, 
      message: '✅ Login berhasil!',
      isAdmin: user.isAdmin || false
    });
    
  } catch (error) {
    await sendTelegram(`❌ <b>LOGIN ERROR</b>\nUser: ${username}\nError: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
                         }
