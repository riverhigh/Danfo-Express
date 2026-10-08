const fs = require('fs');
const path = require('path');

const savePath = path.join(__dirname, 'src/hooks/useGameSave.ts');
let saveContent = fs.readFileSync(savePath, 'utf8');

saveContent = saveContent.replace(
  'koloBalanceNaira: number;',
  'koloBalanceNaira: number;\n  hasKolo: boolean;'
);

saveContent = saveContent.replace(
  'koloBalanceNaira: 0,',
  'koloBalanceNaira: 0,\n  hasKolo: false,'
);

fs.writeFileSync(savePath, saveContent);
console.log('Added hasKolo to useGameSave');
