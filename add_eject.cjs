const fs = require('fs');
const path = require('path');

const simPath = path.join(__dirname, 'src/components/ThreeDrivingSimulator.tsx');
let simContent = fs.readFileSync(simPath, 'utf8');

const engineButtonMatch = `          <button
            onClick={toggleEngine}
            className={\`p-2 sm:p-2.5 rounded-xl border font-bold flex flex-col items-center gap-0.5 transition-all shadow-xl \${
              isEngineRunning 
                ? 'bg-rose-950/70 border-rose-500 text-rose-400 hover:bg-rose-900' 
                : 'bg-emerald-950/80 border-emerald-400 text-emerald-300 animate-pulse'
            }\`}
            title="Start or Stop Danfo Diesel Engine"
          >
            <Power className="w-4 h-4" />
            <span className="text-[8px] font-mono font-black uppercase">
              {isEngineRunning ? 'STOP' : 'START'}
            </span>
          </button>`;

const ejectButton = `
          {/* Eject / Step Down Button */}
          <button
            onClick={toggleStepDown}
            className={\`p-2 sm:p-2.5 rounded-xl border font-bold flex flex-col items-center gap-0.5 transition-all shadow-xl \${
              isSteppedDown 
                ? 'bg-amber-400 text-stone-950 border-amber-300 animate-pulse' 
                : 'bg-stone-900/90 border-stone-700 text-stone-200 hover:bg-stone-800'
            }\`}
            title="Eject / Step Down from the driver seat"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="text-[8px] font-mono font-black uppercase">
              {isSteppedDown ? 'BOARD' : 'EJECT'}
            </span>
          </button>`;

if (simContent.includes(engineButtonMatch)) {
  simContent = simContent.replace(engineButtonMatch, engineButtonMatch + ejectButton);
  fs.writeFileSync(simPath, simContent);
  console.log('Eject button added!');
} else {
  console.log('Could not find engine button match!');
}
