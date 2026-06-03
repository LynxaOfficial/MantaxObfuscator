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
  
  if (username.length < 3) {
    return res.json({ success: false, message: '❌ Username minimal 3 karakter!' });
  }
  if (password.length < 4) {
    return res.json({ success: false, message: '❌ Password minimal 4 karakter!' });
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
    
    if (users[username]) {
      await sendTelegram(`❌ REGISTER GAGAL\nUser: ${username}\nPesan: Username sudah ada`);
      return res.json({ success: false, message: '❌ Username sudah terdaftar!' });
    }
    
    if (hwids[hwid]) {
      await sendTelegram(`❌ REGISTER GAGAL\nUser: ${username}\nPesan: HWID sudah terikat`);
      return res.json({ success: false, message: '🔒 HWID sudah terikat ke akun lain!' });
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
    
    async function saveToGitHub(url, data, message) {
      const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      
      let sha = null;
      try {
        const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        if (getRes.status === 200) {
          const existing = await getRes.json();
          sha = existing.sha;
        }
      } catch(e) {}
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          content: contentBase64,
          sha: sha,
          branch: 'main'
        })
      });
      
      return response.status === 200 || response.status === 201;
    }
    
    await saveToGitHub(usersUrl, users, `Register: ${username}`);
    await saveToGitHub(hwidsUrl, hwids, `HWID: ${username}`);
    
    await sendTelegram(`✅ REGISTER BERHASIL\nUser: ${username}\nHWID: ${hwid.substring(0,20)}...\nAdmin: ${isFirstUser ? 'YA (First User)' : 'TIDAK'}\nWaktu: ${new Date().toLocaleString()}`);
    
    return res.json({ 
      success: true, 
      message: isFirstUser ? '✅ Register berhasil! Anda admin pertama!' : '✅ Register berhasil! Silakan login.',
      isFirstUser: isFirstUser
    });
    
  } catch (error) {
    await sendTelegram(`❌ REGISTER ERROR\nUser: ${username}\nError: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
}
