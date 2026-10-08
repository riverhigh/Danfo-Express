import re
import sys

app_file = 'src/App.tsx'
with open(app_file, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_content = app_content.replace(
    '<header className="h-12 bg-stone-900/90 border-b border-stone-800 px-4 flex items-center justify-between z-20 shrink-0">',
    '<header className={`h-12 bg-stone-900/90 border-b border-stone-800 px-4 flex items-center justify-between z-50 shrink-0 ${gameState.screen === \'SHIFT_ACTIVE\' ? \'absolute top-0 w-full pointer-events-auto bg-transparent border-none\' : \'\'}`}>'
)

app_content = app_content.replace(
    '<main className="flex-1 relative overflow-hidden flex flex-col">',
    '<main className={`relative overflow-hidden flex flex-col ${gameState.screen === \'SHIFT_ACTIVE\' ? \'absolute inset-0 w-full h-full\' : \'flex-1\'}`}>'
)

# Also force landscape globally on body or root. Wait, CSS might be better for that.

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_content)

sim_file = 'src/components/ThreeDrivingSimulator.tsx'
with open(sim_file, 'r', encoding='utf-8') as f:
    sim_content = f.read()

# Replace the wrapper to absolute HUD
sim_content = sim_content.replace(
    '<div className="relative w-full h-full flex flex-col bg-stone-950 overflow-hidden select-none">',
    '<div className="relative w-[100vw] h-[100vh] bg-stone-950 overflow-hidden select-none">\n      <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">\n'
)

# Close the new HUD wrapper at the very end
sim_content = sim_content.replace(
    '    </div>\n  );\n};',
    '      </div>\n    </div>\n  );\n};'
)

# MiniMap radar repositioning
sim_content = sim_content.replace(
    '<div className="relative z-30 p-2 sm:p-3 flex items-start justify-between pointer-events-none">',
    '<div className="absolute top-[60px] left-[16px] w-[180px] h-[180px] z-30 pointer-events-auto">'
)
# We need to restructure the Top-Left and Top-Right specifically.
# The Top Bar Overlays contains MiniMap, Gauges, Quick Access (Phone/Bag/Door/Engine).
# MiniMap -> absolute top-60 left-16
# Quick Access -> we need to remove duplicate Phone/Bag from Top-Right because they are already in the Header. But the user prompt says:
# "Top-Right Vehicle Status: `position: absolute; top: 60px; right: 16px;` (Contains Fuel %, Temp, Fares). Remove duplicate Phone/Bag buttons here."

with open(sim_file, 'w', encoding='utf-8') as f:
    f.write(sim_content)

print("Modifications done.")
