const { spawn } = require('child_process');
const command = 'pwsh';
const args = ['-NoLogo','-Command','npx -y ssh-mcp -- --host=145.223.96.17 --port=22 --user=root --key=C:\\Users\\yvallott\\.ssh\\id_ed25519 --timeout=60000 --maxChars=4000'];
const child = spawn(command, args, { stdio: ['pipe','pipe','pipe'] });
child.on('error', err => console.error('SPAWN ERR:', err));
child.stderr.on('data', data => console.error('ERR:', data.toString()));
let buffer = '';
child.stdout.on('data', data => {
  buffer += data.toString();
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    console.log('OUT:', line);
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (err) {
      console.error('PARSE ERR:', err.message);
    }
  }
});
child.on('exit', code => console.log('EXIT', code));
function send(msg) {
  const json = JSON.stringify(msg);
  console.log('SEND:', json);
  child.stdin.write(json + '\n');
}
function handleMessage(msg) {
  if (msg.result && msg.id === 2) {
    const items = msg.result.resources || [];
    const indexRes = items.find(r => (r.uri || '').includes('index.md'));
    if (indexRes) {
      send({ jsonrpc: '2.0', id: 3, method: 'resources/read', params: { uri: indexRes.uri } });
    }
  }
  if (msg.result && msg.id === 3) {
    console.log('INDEX_CONTENT:', msg.result.contents?.[0]?.text || '(no text)');
    child.stdin.end();
  }
}
setTimeout(() => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1.0', clientInfo: { name: 'diag-script', version: '0.1.0' }, capabilities: {} } }), 300);
setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'resources/list', params: { cursor: null } }), 800);
setTimeout(() => child.stdin.end(), 6000);
