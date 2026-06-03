import fs from 'fs';
import path from 'path';

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
  if (username.length < 3) return res.json({ success: false, message: 'Username min 3 karakter' });
  if (password.length < 4) return res.json({ success: false, message: 'Password min 4 karakter' });
  
  // Simpan sementara ke /tmp/users.json (tahan selama instance Vercel hidup)
  const usersPath = '/tmp/users.json';
  let users = {};
  try {
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    }
  } catch(e) {}
  
  if (users[username]) {
    return res.json({ success: false, message: 'Username sudah ada!' });
  }
  
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(16).padStart(32, '0');
  }
  
  const isFirst = Object.keys(users).length === 0;
  users[username] = {
    password: hash(password),
    hwid: hwid,
    isAdmin: isFirst,
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
  return res.json({
    success: true,
    message: isFirst ? 'Register berhasil! Anda admin pertama.' : 'Register berhasil! Silakan login.',
    isFirstUser: isFirst
  });
}
