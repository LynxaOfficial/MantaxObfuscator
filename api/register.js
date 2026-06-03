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
  
  // ========== GANTI PAKE PUNYA LO ==========
  const GITHUB_TOKEN = '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';
  const REPO_OWNER = 'LynxaOfficial';
  const REPO_NAME = 'MantaxObfuscator';
  const TELEGRAM_TOKEN = '7798368683:AAEwVqJZu4V79ynkqVhdr_yZ1N_s9qDQ_4o';
  const TELEGRAM_CHAT_ID = 'XyrooXellz';
  // =========================================
  
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
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'HTML' })
      });
    } catch(e) { console.log('Telegram error:', e.message); }
  }
  
  try {
    // Ambil data users dari GitHub
    const usersUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/users.json`;
    let usersRes = await fetch(usersUrl, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    
    let users = {};
    if (usersRes.status === 200) {
      const data = await usersRes.json();
      const content = Buffer.from(data.content, 'base64').toString();
      users = JSON.parse(content);
    }
    
    // Ambil data hwids dari GitHub
    const hwidsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/hwids.json`;
    let hwidsRes = await fetch(hwidsUrl, {
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    
    let hwids = {};
    if (hwidsRes.status === 200) {
      const data = await hwidsRes.json();
      const content = Buffer.from(data.content, 'base64').toString();
      hwids = JSON.parse(content);
    }
    
    // Cek username sudah dipake
    if (users[username]) {
      return res.json({ success: false, message: '❌ Username sudah terdaftar!' });
    }
    
    // Cek HWID sudah dipake
    if (hwids[hwid]) {
      return res.json({ success: false, message: '🔒 HWID sudah terikat ke akun lain! 1 perangkat = 1 akun.' });
    }
    
    const isFirstUser = Object.keys(users).length === 0;
    
    // Tambah user baru
    users[username] = {
      password: hashPassword(password),
      hwid: hwid,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isBanned: false,
      isAdmin: isFirstUser
    };
    hwids[hwid] = username;
    
    // Get SHA untuk users.json
    let usersSha = null;
    const getUsersRes = await fetch(usersUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    if (getUsersRes.status === 200) {
      const existing = await getUsersRes.json();
      usersSha = existing.sha;
    }
    
    // Save users.json
    const usersContentBase64 = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
    await fetch(usersUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Register: ${username}`,
        content: usersContentBase64,
        sha: usersSha,
        branch: 'main'
      })
    });
    
    // Get SHA untuk hwids.json
    let hwidsSha = null;
    const getHwidsRes = await fetch(hwidsUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    if (getHwidsRes.status === 200) {
      const existing = await getHwidsRes.json();
      hwidsSha = existing.sha;
    }
    
    // Save hwids.json
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
    
    // Kirim notif Telegram
    await sendTelegram(`📝 <b>NEW USER REGISTERED!</b>\n\n👤 Username: ${username}\n🖥️ HWID: ${hwid.substring(0,20)}...\n👑 Admin: ${isFirstUser ? '✅ YES' : '❌ NO'}\n📅 Time: ${new Date().toLocaleString()}`);
    
    return res.json({ 
      success: true, 
      message: isFirstUser ? '✅ Register berhasil! Anda admin pertama!' : '✅ Register berhasil! Silakan login.',
      isFirstUser: isFirstUser
    });
    
  } catch (error) {
    console.error('Register error:', error);
    await sendTelegram(`❌ <b>REGISTER ERROR</b>\n\nUser: ${username}\nError: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
      }
