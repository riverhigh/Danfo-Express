const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add gameTime state
const stateHook = `const [showCharacterCreation, setShowCharacterCreation] = useState<boolean>(!saveData.playerName || saveData.playerName === 'Driver');`;
const timeHook = `const [gameTime, setGameTime] = useState(new Date('2026-10-09T08:00:00'));`;
code = code.replace(stateHook, stateHook + '\n  ' + timeHook);

// Update useEffect to advance time
code = code.replace('return {', 'setGameTime(d => new Date(d.getTime() + 15 * 60000)); // 15 mins per tick\n        return {');

// Render time in header
const oldHeader = `DANFO EXPRESS
              </h1>`;
const newHeader = `DANFO EXPRESS
              </h1>
              <div className="text-[10px] font-mono font-bold text-amber-200 mt-0.5 bg-stone-900/50 px-1.5 py-0.5 rounded border border-stone-700 w-max">
                {gameTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })} • {gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>`;
code = code.replace(oldHeader, newHeader);

fs.writeFileSync('src/App.tsx', code);
