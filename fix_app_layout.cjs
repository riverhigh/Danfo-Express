const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// Replace header
appContent = appContent.replace(
  '<header className="h-12 bg-stone-900/90 border-b border-stone-800 px-4 flex items-center justify-between z-20 shrink-0">',
  '<header className={`h-12 bg-stone-900/90 border-b border-stone-800 px-4 flex items-center justify-between z-50 shrink-0 ${gameState.screen === \\\'SHIFT_ACTIVE\\\' ? \\\'absolute top-0 w-full pointer-events-auto bg-transparent border-none\\\' : \\\'\\\'}`}>'
);

// Replace main
appContent = appContent.replace(
  '<main className="flex-1 relative overflow-hidden flex flex-col">',
  '<main className={`relative overflow-hidden flex flex-col ${gameState.screen === \\\'SHIFT_ACTIVE\\\' ? \\\'absolute inset-0 w-full h-full\\\' : \\\'flex-1\\\'}`}>'
);

fs.writeFileSync(appPath, appContent);
console.log('done modifying app');
