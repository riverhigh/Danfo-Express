const fs = require('fs');
let code = fs.readFileSync('src/components/MainMap.tsx', 'utf8');

// The replacement script must clean up the escaped template literals
code = code.replace(/\\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/MainMap.tsx', code);
