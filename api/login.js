export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { username, password, hwid } = req.body;
  
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  
  // GANTI PAKE TOKEN BARU LO!
  const GITHUB_TOKEN = 'ghp_TOKEN_BARU_LO';
  const REPO_OWNER = 'LynxaOfficial';
  const REPO_NAME = 'MantaxObfuscator';
  
  function hashPassword(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
  
  try {
    // Ambil data users dari GitHub
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
    
    // Cek user
    if (!users[username]) {
      return res.json({ success: false, message: '❌ Username tidak ditemukan!' });
    }
    
    const user = users[username];
    
    // Cek password
    if (user.password !== hashPassword(password)) {
      return res.json({ success: false, message: '❌ Password salah!' });
    }
    
    // Cek HWID
    if (user.hwid && user.hwid !== hwid) {
      return res.json({ success: false, message: '🔒 HWID MISMATCH!' });
    }
    
    // Bind HWID kalo belum
    if (!user.hwid) {
      user.hwid = hwid;
      
      // Update hwids.json juga
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
      
      // Save hwids.json
      const hwidsContentBase64 = Buffer.from(JSON.stringify(hwids, null, 2)).toString('base64');
      let hwidsSha = null;
      const getHwidsRes = await fetch(hwidsUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
      if (getHwidsRes.status === 200) {
        const existing = await getHwidsRes.json();
        hwidsSha = existing.sha;
      }
      
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
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    
    // Save users.json
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
    
    return res.json({ 
      success: true, 
      message: '✅ Login berhasil!',
      isAdmin: user.isAdmin || false
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
    }
