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
  
  // ========== TOKEN BARU ==========
  const GITHUB_TOKEN = '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';
  const REPO_OWNER = 'LynxaOfficial';
  const REPO_NAME = 'MantaxObfuscator';
  // =================================
  
  function hashPassword(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
  
  async function fetchFromGitHub(filePath) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.status === 404) return {};
      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    } catch (err) {
      return {};
    }
  }
  
  async function pushToGitHub(filePath, data, message) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
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
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        content: contentBase64,
        sha: sha,
        branch: 'main'
      })
    });
    
    return response.status === 200 || response.status === 201;
  }
  
  try {
    let usersDb = await fetchFromGitHub('database/users.json');
    
    if (!usersDb[username]) {
      return res.json({ success: false, message: '❌ Username tidak ditemukan!' });
    }
    
    const user = usersDb[username];
    
    if (user.password !== hashPassword(password)) {
      return res.json({ success: false, message: '❌ Password salah!' });
    }
    
    if (user.isBanned) {
      return res.json({ success: false, message: '🚫 Akun telah di-BAN!' });
    }
    
    if (user.hwid && user.hwid !== hwid) {
      return res.json({ success: false, message: '🔒 HWID MISMATCH! Akun terikat ke perangkat lain.' });
    }
    
    // Bind HWID kalo belum
    let isNewBind = false;
    if (!user.hwid) {
      user.hwid = hwid;
      isNewBind = true;
    }
    
    user.lastLogin = new Date().toISOString();
    
    if (isNewBind) {
      let hwidDb = await fetchFromGitHub('database/hwids.json');
      hwidDb[hwid] = username;
      await pushToGitHub('database/hwids.json', hwidDb, `HWID bind: ${username}`);
    }
    
    await pushToGitHub('database/users.json', usersDb, `Login: ${username}`);
    
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
