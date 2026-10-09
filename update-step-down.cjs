const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

const target = `<Power className="w-3 h-3" />\n            </button>`;
const replacement = `<Power className="w-3 h-3" />
            </button>
            <button onClick={toggleStepDown} className={\`p-1.5 rounded-lg border font-bold flex flex-col items-center gap-0.5 shadow-xl transition-colors \${isSteppedDown ? 'bg-amber-400 border-amber-300 text-stone-950' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>
              <Footprints className="w-3 h-3" />
            </button>`;

code = code.replace(/<Power className="w-3 h-3" \/>[\r\n\s]*<\/button>/g, replacement);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
