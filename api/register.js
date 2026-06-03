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
  
  // Fungsi untuk baca file dari GitHub
  async function getUsers() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/users.json`;
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (res.status === 404) return {};
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }
  
  async function getHwids() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/hwids.json`;
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (res.status === 404) return {};
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }
  
  // Fungsi untuk simpan ke GitHub
  async function saveUsers(users, sha = null) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/users.json`;
    const contentBase64 = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
    
    let existingSha = sha;
    if (!existingSha) {
      try {
        const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        if (getRes.status === 200) {
          const existing = await getRes.json();
          existingSha = existing.sha;
        }
      } catch(e) {}
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update users.json',
        content: contentBase64,
        sha: existingSha,
        branch: 'main'
      })
    });
    
    return response.status === 200 || response.status === 201;
  }
  
  async function saveHwids(hwids, sha = null) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/hwids.json`;
    const contentBase64 = Buffer.from(JSON.stringify(hwids, null, 2)).toString('base64');
    
    let existingSha = sha;
    if (!existingSha) {
      try {
        const getRes = await fetch(url, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        if (getRes.status === 200) {
          const existing = await getRes.json();
          existingSha = existing.sha;
        }
      } catch(e) {}
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update hwids.json',
        content: contentBase64,
        sha: existingSha,
        branch: 'main'
      })
    });
    
    return response.status === 200 || response.status === 201;
  }
  
  try {
    // Ambil data terbaru
    let users = await getUsers();
    let hwids = await getHwids();
    
    console.log('Current users:', users);
    console.log('Current hwids:', hwids);
    
    // Validasi
    if (users[username]) {
      return res.json({ success: false, message: '❌ Username sudah terdaftar!' });
    }
    
    if (hwids[hwid]) {
      return res.json({ success: false, message: '🔒 HWID sudah terikat ke akun lain!' });
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
    
    // Simpan ke GitHub
    const userSaved = await saveUsers(users);
    console.log('Save users result:', userSaved);
    
    const hwidSaved = await saveHwids(hwids);
    console.log('Save hwids result:', hwidSaved);
    
    if (!userSaved || !hwidSaved) {
      throw new Error('Gagal menyimpan ke GitHub');
    }
    
    return res.json({ 
      success: true, 
      message: isFirstUser ? '✅ Register berhasil! Anda admin pertama!' : '✅ Register berhasil! Silakan login.',
      isFirstUser: isFirstUser
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
                                                    }
