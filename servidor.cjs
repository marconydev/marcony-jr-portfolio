// Servidor local sem dependencias; requer Node.js 18+.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Requisicao invalida'); return; }
  const filename = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (filename !== root && !filename.startsWith(root + path.sep)) {
    res.writeHead(403).end('Acesso negado'); return;
  }
  fs.stat(filename, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end('Arquivo nao encontrado'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store, max-age=0', 'Pragma': 'no-cache' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filename).pipe(res);
  });
});
server.on('error', err => { console.error('ERRO ao iniciar servidor:', err.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`MARCONY JR disponivel em http://127.0.0.1:${port}\nPressione Ctrl+C para parar.`));
