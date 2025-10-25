#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/ssh_docs_exec.mjs <remote command ...>');
  process.exit(1);
}
const remoteCommand = args.join(' ');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = process.env.SSH_DOCS_HOST ?? '145.223.96.17';
const port = process.env.SSH_DOCS_PORT ?? '22';
const user = process.env.SSH_DOCS_USER ?? 'root';
const keyPath =
  process.env.SSH_DOCS_KEY ??
  path.resolve(
    process.env.HOME ?? process.env.USERPROFILE ?? '',
    '.ssh',
    'id_ed25519',
  );

const sshMcpPath = path.resolve(
  __dirname,
  '../node_modules/ssh-mcp/build/index.js',
);

const transport = new StdioClientTransport({
  command: process.env.SSH_DOCS_NODE ?? 'node',
  args: [
    sshMcpPath,
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    `--key=${keyPath}`,
    '--timeout=120000',
    '--maxChars=none',
  ],
  env: { MAX_BYTES: '200000', SSH_KEEPALIVE_MS: '10000', SSH_READY_TIMEOUT: '20000' },
  stderr: 'pipe',
});

const client = new Client(
  { name: 'codex-cli-helper', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

async function main() {
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: 'exec',
      arguments: { command: remoteCommand },
    });
    const text = (result.content ?? [])
      .map(part => (part.type === 'text' ? part.text : ''))
      .join('');
    if (text) {
      process.stdout.write(text);
    }
    if (result.isError) {
      const errorMessage =
        typeof result.isError === 'string'
          ? result.isError
          : JSON.stringify(result.isError);
      process.stderr.write(`\n${errorMessage}\n`);
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      `ssh_docs_exec failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      process.stderr.write(
        `ssh_docs_exec close error: ${
          closeError instanceof Error ? closeError.message : String(closeError)
        }\n`,
      );
    }
    try {
      await transport.close();
    } catch {
      // ignore
    }
  }
}

await main();
