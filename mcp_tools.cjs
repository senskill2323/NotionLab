const { spawn } = require('child_process');
const args = ['-NoLogo','-Command','npx -y ssh-mcp -- --host=145.223.96.17 --port=22 --user=root --key=C:\\Users\\yvallott\\.ssh\\id_ed25519 --timeout=60000 --maxChars=4000'];
const child = spawn('pwsh', args, { stdio: ['pipe','pipe','pipe'] });
child.stderr.on('data', data => console.error('ERR:', data.toString()));
let buffer = '';
child.stdout.on('data', data => {
  buffer += data.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    console.log('OUT:', line);
    try { handleMessage(JSON.parse(line)); } catch (err) { console.error('PARSE ERR:', err.message); }
  }
});
child.on('exit', code => console.log('EXIT', code));
function send(msg) {
  const json = JSON.stringify(msg);
  console.log('SEND:', json);
  child.stdin.write(json + '\n');
}
function handleMessage(msg) {
  if (msg.id === 1 && msg.result) {
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  } else if (msg.id === 2 && msg.result) {
    console.log('TOOLS:', JSON.stringify(msg.result, null, 2));
    child.stdin.end();
  }
}
setTimeout(() => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'diag-script', version: '0.1.0' }, capabilities: {} } }), 200);
setTimeout(() => child.stdin.end(), 4000);
