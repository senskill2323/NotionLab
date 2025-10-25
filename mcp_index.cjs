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
    try { handleMessage(JSON.parse(line)); } catch (err) { console.error('PARSE ERR:', err.message, 'LINE:', line); }
  }
});
child.on('exit', code => console.log('EXIT', code));
function send(msg) {
  child.stdin.write(JSON.stringify(msg) + '\n');
}
function handleMessage(msg) {
  if (msg.id === 1 && msg.result) {
    send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'exec', arguments: { command: 'cat /root/index.md' } } });
  } else if (msg.id === 2 && msg.result) {
    const outputs = msg.result.outputs || [];
    for (const out of outputs) {
      if (out.type === 'text' && out.text) {
        console.log('DOC:', out.text);
      }
    }
    child.stdin.end();
  } else if (msg.error) {
    console.error('ERROR MSG:', JSON.stringify(msg.error));
  }
}
setTimeout(() => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'diag-script', version: '0.1.0' }, capabilities: {} } }), 200);
setTimeout(() => child.stdin.end(), 5000);
