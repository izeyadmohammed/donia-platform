import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Prevent serving server/config/sql source files directly
app.use((req, res, next) => {
  const blocked = ['/server.js', '/package.json', '/package-lock.json', '/.env', '/.env.example'];
  if (blocked.includes(req.path) || req.path.endsWith('.sql') || req.path.endsWith('.bak')) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(__dirname, { dotfiles: 'ignore' }));

app.use((req, res) => {
  if (req.method === 'GET') {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.status(404).send('Not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
