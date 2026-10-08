const fs = require('fs');
const path = require('path');

const simPath = path.join(__dirname, 'src/components/ThreeDrivingSimulator.tsx');
let simContent = fs.readFileSync(simPath, 'utf8');

// Replace the main wrapper
simContent = simContent.replace(
  '<div className="relative w-full h-full flex flex-col bg-stone-950 overflow-hidden select-none">',
  '<div className="relative w-[100vw] h-[100vh] bg-stone-950 overflow-hidden select-none" style={{ position: "relative", width: "100vw", height: "100vh" }}>\n      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">'
);

// We need to match the return of the component to add the closing div
const endTagStr = '    </div>\n  );\n};';
simContent = simContent.replace(
  endTagStr,
  '      </div>\n    </div>\n  );\n};'
);

// Top-Left GPS Radar wrapper
simContent = simContent.replace(
  '<div className="relative z-30 p-2 sm:p-3 flex items-start justify-between pointer-events-none">',
  '<div className="absolute top-[60px] left-[16px] w-[180px] h-[180px] pointer-events-auto">'
);

// Top-Right Vehicle Status wrapper
simContent = simContent.replace(
  '{/* Center Dashboard Gauges (Graphic Speedometer, RPM, E/F Fuel, Heat) */}',
  '</div>\n        <div className="absolute top-[60px] right-[16px] pointer-events-auto flex gap-4">\n        {/* Center Dashboard Gauges (Graphic Speedometer, RPM, E/F Fuel, Heat) */}'
);

// Remove duplicate Phone/Bag buttons
simContent = simContent.replace(
  /<button\s+onClick=\{onOpenPhone\}[\s\S]*?<\/button>/,
  '{/* Phone Button Removed */}'
);
simContent = simContent.replace(
  /<button\s+onClick=\{onOpenInventory\}[\s\S]*?<\/button>/,
  '{/* Bag Button Removed */}'
);

// Close Top-Right wrapper before Top-Right Quick Access finishes
simContent = simContent.replace(
  '<div className="flex items-start gap-1.5 sm:gap-2 pointer-events-auto">',
  '<div className="flex flex-col items-start gap-1.5 sm:gap-2 pointer-events-auto">'
);
simContent = simContent.replace(
  '</span>\n          </button>\n        </div>\n      </div>',
  '</span>\n          </button>\n        </div>\n      </div>'
); // Actually wait, we inserted a div earlier, let's just do a blanket string replace.

fs.writeFileSync(simPath, simContent);
console.log('done modifying sim');
