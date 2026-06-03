import fs from 'fs';

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
  
  const usersPath = '/tmp/users.json';
  let users = {};
  try {
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    }
  } catch(e) {}
  
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(16).padStart(32, '0');
  }
  
  const user = users[username];
  if (!user) {
    return res.json({ success: false, message: 'Username tidak ditemukan!' });
  }
  if (user.password !== hash(password)) {
    return res.json({ success: false, message: 'Password salah!' });
  }
  if (user.hwid && user.hwid !== hwid) {
    return res.json({ success: false, message: 'HWID mismatch! Akun terikat perangkat lain.' });
  }
  
  // Bind HWID jika pertama kali
  if (!user.hwid) {
    user.hwid = hwid;
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  }
  
  user.lastLogin = new Date().toISOString();
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
  return res.json({
    success: true,
    message: 'Login berhasil!',
    isAdmin: user.isAdmin || false
  });
}
