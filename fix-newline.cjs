const fs = require('fs');
let code = fs.readFileSync('src/components/MainMap.tsx', 'utf8');
code = code.replace(/\\n/g, '\n');
fs.writeFileSync('src/components/MainMap.tsx', code);
