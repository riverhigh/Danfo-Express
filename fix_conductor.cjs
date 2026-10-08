const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(
  /const handleConductorAction = useCallback\(\(action: 'CALLING' \| 'COLLECTING' \| 'SLAPPING_VAN' \| 'SETTLING'\) => \{/,
  `const handleConductorAction = useCallback((action: 'CALLING' | 'COLLECTING' | 'SLAPPING_VAN' | 'SETTLING' | 'GIVE_CHANGE') => {`
);
appContent = appContent.replace(
  `    } else if (action === 'COLLECTING') {\n      soundEngine.playCoin();\n      addFeedMessage('Conductor collected cash fares from onboard passengers!');\n    }`,
  `    } else if (action === 'COLLECTING') {\n      soundEngine.playCoin();\n      addFeedMessage('Conductor collected cash fares from onboard passengers!');\n    } else if (action === 'GIVE_CHANGE') {\n      soundEngine.playCoin();\n      addFeedMessage('🪙 CHANGE BALANCED: Conductor gave passenger crisp change!');\n    }`
);
fs.writeFileSync(appPath, appContent);

const simPath = path.join(__dirname, 'src/components/ThreeDrivingSimulator.tsx');
let simContent = fs.readFileSync(simPath, 'utf8');
simContent = simContent.replace(
  /onConductorAction: \(action: 'CALLING' \| 'COLLECTING' \| 'SLAPPING_VAN' \| 'SETTLING'\) => void;/,
  `onConductorAction: (action: 'CALLING' | 'COLLECTING' | 'SLAPPING_VAN' | 'SETTLING' | 'GIVE_CHANGE') => void;`
);

const conductorButtons = `        {/* CENTER CONTEXT ACTION: CALL COMMUTERS & CONDUCTOR */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => onConductorAction('CALLING')}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 active:bg-amber-400 active:text-stone-950 border border-stone-700 text-amber-400 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg"
          >
            <span>📢 CALL [Q]</span>
          </button>
          <button
            onClick={() => onConductorAction('COLLECTING')}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 active:bg-amber-400 active:text-stone-950 border border-stone-700 text-emerald-400 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg"
          >
            <span>💵 COLLECT FARES [C]</span>
          </button>
          <button
            onClick={() => onConductorAction('GIVE_CHANGE')}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 active:bg-amber-400 active:text-stone-950 border border-stone-700 text-amber-200 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg"
          >
            <span>🪙 GIVE CHANGE [V]</span>
          </button>
          <button
            onClick={() => onConductorAction('SLAPPING_VAN')}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 active:bg-amber-400 active:text-stone-950 border border-stone-700 text-sky-400 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg"
          >
            <span>👋 SLAP VAN</span>
          </button>
        </div>`;

simContent = simContent.replace(
  /<div className="hidden lg:flex items-center gap-2">[\s\S]*?<span>👋 SLAP VAN \(GBAM!\) \[E\]<\/span>[\s\S]*?<\/button>[\s\S]*?<\/div>/,
  conductorButtons
);

fs.writeFileSync(simPath, simContent);
console.log('Fixed conductor buttons');
