// api/register.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, hwid } = req.body;
  if (!username || !password || !hwid) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  if (username.length < 3 || password.length < 4) {
    return res.json({ success: false, message: 'Username minimal 3, password minimal 4 karakter!' });
  }

  // Konfigurasi - GANTI DENGAN DATA ANDA
  const GITHUB_TOKEN = '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';
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

  async function getCurrentFileSha(path) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    if (res.status === 200) {
      const data = await res.json();
      return data.sha;
    }
    return null;
  }

  async function saveToGitHub(path, data, commitMessage) {
    const sha = await getCurrentFileSha(path);
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body = {
      message: commitMessage,
      content: contentBase64,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errorText}`);
    }
    return response.ok;
  }

  try {
    // 1. Ambil data terbaru dari GitHub
    const usersUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/users.json`;
    let users = {};
    let usersRes = await fetch(usersUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    if (usersRes.status === 200) {
      const data = await usersRes.json();
      users = JSON.parse(Buffer.from(data.content, 'base64').toString());
    }

    const hwidsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/database/hwids.json`;
    let hwids = {};
    let hwidsRes = await fetch(hwidsUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    if (hwidsRes.status === 200) {
      const data = await hwidsRes.json();
      hwids = JSON.parse(Buffer.from(data.content, 'base64').toString());
    }

    // 2. Validasi data
    if (users[username]) return res.json({ success: false, message: '❌ Username sudah terdaftar!' });
    if (hwids[hwid]) return res.json({ success: false, message: '🔒 HWID sudah terikat akun lain!' });

    // 3. Siapkan data baru
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

    // 4. Simpan ke GitHub (urutan penting: users dulu, baru hwids)
    await saveToGitHub('database/users.json', users, `Register user: ${username}`);
    await saveToGitHub('database/hwids.json', hwids, `Bind HWID for: ${username}`);

    console.log(`✅ Registration successful for ${username}`);
    return res.json({
      success: true,
      message: isFirstUser ? '✅ Register berhasil! Anda adalah admin pertama!' : '✅ Register berhasil! Silakan login.',
      isFirstUser: isFirstUser
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
}