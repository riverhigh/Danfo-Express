const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// Fix Left Panel:
code = code.replace(
  `          <div className={\`flex items-end gap-2 transition-opacity duration-300 origin-bottom-left \${showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
            {!isSteppedDown ? (`,
  `          <div className={\`flex items-end gap-2 transition-opacity duration-300 origin-bottom-left \${showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
            {!isSteppedDown ? (`
);

// Actually, let's just find and replace the exact lines:
// Left panel ends with:
const leftPanelEnd = `                  <button onClick={(e) => { e.stopPropagation(); handleHorn(); }}
                    className="relative w-9 h-9 bg-amber-400/90 active:bg-amber-300 text-stone-950 rounded-full font-black text-[8px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95">
                    HORN
                  </button>
                </div>
              </>
            )}`;

const leftPanelEndFixed = `                  <button onClick={(e) => { e.stopPropagation(); handleHorn(); }}
                    className="relative w-9 h-9 bg-amber-400/90 active:bg-amber-300 text-stone-950 rounded-full font-black text-[8px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95">
                    HORN
                  </button>
                </div>
              </>
            ) : null}`;

code = code.replace(leftPanelEnd, leftPanelEndFixed);
code = code.replace(leftPanelEnd.replace(/\\n/g, '\\r\\n'), leftPanelEndFixed);


// Fix Right Panel:
const rightPanelStart = `          <div className={\`flex items-end gap-2 transition-opacity duration-300 origin-bottom-right \${showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
            {!isSteppedDown && (`;

const rightPanelStartFixed = `          <div className={\`flex items-end gap-2 transition-opacity duration-300 origin-bottom-right \${showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
            {!isSteppedDown ? (`;

code = code.replace(rightPanelStart, rightPanelStartFixed);
code = code.replace(rightPanelStart.replace(/\\n/g, '\\r\\n'), rightPanelStartFixed);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
console.log('Fixed syntax errors');
