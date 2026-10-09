const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `{/* MENU STATE */}`;
const replacement = `{gameState.screen === 'MENU' && (<div className="absolute right-4 top-4 z-40 hidden lg:block"><NeedsPanel needs={gameState.needs} /></div>)}\n        {/* MENU STATE */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
