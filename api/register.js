export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { username, password, hwid } = req.body;
  
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  if (username.length < 3) {
    return res.json({ success: false, message: '❌ Username minimal 3 karakter!' });
  }
  if (password.length < 4) {
    return res.json({ success: false, message: '❌ Password minimal 4 karakter!' });
  }
  
  // ========== HARDCODE TOKEN DI SINI ==========
  const GITHUB_TOKEN = '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';
  const REPO_OWNER = 'LynxaOfficial';
  const REPO_NAME = 'MantaxObfuscator';
  // ============================================
  
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
      if (response.status === 404) return null;
      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    } catch (err) {
      return null;
    }
  }
  
  async function pushToGitHub(filePath, data, message) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    
    let sha = null;
    try {
      const getResponse = await fetch(url, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
      });
      if (getResponse.status === 200) {
        const existing = await getResponse.json();
        sha = existing.sha;
      }
    } catch (e) {}
    
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
    let usersDb = await fetchFromGitHub('database/users.json') || {};
    let hwidDb = await fetchFromGitHub('database/hwids.json') || {};
    
    if (usersDb[username]) {
      return res.json({ success: false, message: '❌ Username sudah terdaftar!' });
    }
    
    if (hwidDb[hwid]) {
      return res.json({ success: false, message: '🔒 HWID ini sudah terikat ke akun lain! 1 perangkat = 1 akun.' });
    }
    
    const isFirstUser = Object.keys(usersDb).length === 0;
    
    usersDb[username] = {
      password: hashPassword(password),
      hwid: hwid,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isBanned: false,
      isAdmin: isFirstUser
    };
    hwidDb[hwid] = username;
    
    await pushToGitHub('database/users.json', usersDb, `Register new user: ${username}`);
    await pushToGitHub('database/hwids.json', hwidDb, `HWID binding for: ${username}`);
    
    return res.json({ 
      success: true, 
      message: isFirstUser ? '✅ Register berhasil! Anda adalah admin pertama!' : '✅ Register berhasil! Silakan login.',
      isFirstUser: isFirstUser
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal error: ' + error.message });
  }
}