const { spawn } = require('child_process');
const fs = require('fs');
fs.writeFileSync('keys.txt', '');
const child = spawn('npx.cmd', ['tauri', 'signer', 'generate', '--force'], { 
  env: { ...process.env, TAURI_KEY_PASSWORD: "" }, 
  shell: true 
});
child.stdout.on('data', Buffer => fs.appendFileSync('keys.txt', Buffer.toString()));
child.stderr.on('data', Buffer => fs.appendFileSync('keys.txt', Buffer.toString()));
child.on('exit', () => console.log('Done'));
