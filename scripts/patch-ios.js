const fs = require('fs');
const path = '/node_modules/expo-constants/scripts/get-app-config-ios.sh';
const full = require('path').join(__dirname, '..', path);
if (!fs.existsSync(full)) process.exit(0);
let content = fs.readFileSync(full, 'utf8');
const fixed = `#!/bin/bash\n\nexport PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:$PATH"\n`;
if (!content.startsWith(fixed)) {
  content = content.replace(/^#!.*\n(\n)?/, fixed);
  fs.writeFileSync(full, content);
  console.log('Patched get-app-config-ios.sh');
}
