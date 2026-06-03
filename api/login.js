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
    let users = {};
    
    try {
      const usersRes = await fetch(usersUrl, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (usersRes.status === 200) {
        const data = await usersRes.json();
        const content = Buffer.from(data.content, 'base64').toString();
        users = JSON.parse(content);
      }
    } catch(e) {}
    
    if (!users[username]) {
      await sendTelegram(`❌ LOGIN GAGAL\nUser: ${username}\nPesan: Username tidak ditemukan`);
      return res.json({ success: false, message: '❌ Username tidak ditemukan!' });
    }
    
    const user = users[username];
    
    if (user.password !== hashPassword(password)) {
      await sendTelegram(`❌ LOGIN GAGAL\nUser: ${username}\nPesan: Password salah`);
      return res.json({ success: false, message: '❌ Password salah!' });
    }
    
    if (user.isBanned) {
      await sendTelegram(`❌ LOGIN DITOLAK\nUser: ${username}\nPesan: Akun di-BAN`);
      return res.json({ success: false, message: '🚫 Akun telah di-BAN!' });
    }
    
    if (user.hwid && user.hwid !== hwid) {
      await sendTelegram(`❌ LOGIN DITOLAK\nUser: ${username}\nPesan: HWID mismatch`);
      return res.json({ success: false, message: '🔒 HWID MISMATCH!' });
    }
    
    // Bind HWID kalo belum
    if (!user.hwid) {
      user.hwid = hwid;
      
      const hwidsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/hwids.json`;
      let hwids = {};
      
      try {
        const hwidsRes = await fetch(hwidsUrl, {
          headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (hwidsRes.status === 200) {
          const data = await hwidsRes.json();
          const content = Buffer.from(data.content, 'base64').toString();
          hwids = JSON.parse(content);
        }
      } catch(e) {}
      
      hwids[hwid] = username;
      
      const hwidsContentBase64 = Buffer.from(JSON.stringify(hwids, null, 2)).toString('base64');
      let hwidsSha = null;
      try {
        const getRes = await fetch(hwidsUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        if (getRes.status === 200) {
          const existing = await getRes.json();
          hwidsSha = existing.sha;
        }
      } catch(e) {}
      
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
    try {
      const getRes = await fetch(usersUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
      if (getRes.status === 200) {
        const existing = await getRes.json();
        usersSha = existing.sha;
      }
    } catch(e) {}
    
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
    
    await sendTelegram(`✅ LOGIN BERHASIL\nUser: ${username}\nHWID: ${hwid.substring(0,20)}...\nWaktu: ${new Date().toLocaleString()}`);
    
    return res.json({ 
      success: true, 
      message: '✅ Login berhasil!',
      isAdmin: user.isAdmin || false
    });
    
  } catch (error) {
    await sendTelegram(`❌ LOGIN ERROR\nUser: ${username}\nError: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
}
