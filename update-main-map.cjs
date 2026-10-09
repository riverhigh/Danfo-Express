const fs = require('fs');
let code = fs.readFileSync('src/components/MainMap.tsx', 'utf8');

// I will just replace the entire return block of MainMap.tsx to implement the isometric view.
// First, find the return block.
const returnIdx = code.indexOf('return (');
if (returnIdx !== -1) {
  const isometricReturn = `return (
    <div className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Container holding the map UI */}
      <div className="relative w-full max-w-6xl h-[85vh] bg-sky-300 rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-stone-900 flex items-center justify-between px-6 shrink-0 border-b border-stone-800 z-20">
          <div>
            <h2 className="text-xl font-black font-['Bungee'] text-white">Lagos Life Map</h2>
            <div className="text-xs font-mono text-stone-400">Select destination to navigate</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 bg-stone-800 rounded-full font-black text-emerald-400 font-mono shadow-inner border border-stone-700">
              ₦{walletNaira.toLocaleString()}
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3D Isometric Map Area */}
        <div className="flex-1 relative overflow-hidden bg-[#73c2fb] cursor-grab active:cursor-grabbing flex items-center justify-center">
          
          {/* Isometric Wrapper */}
          <div 
            className="w-[1200px] h-[800px] relative transition-transform duration-700 ease-out"
            style={{ 
              transform: 'scale(0.8) perspective(1200px) rotateX(55deg) rotateZ(-35deg)',
              transformStyle: 'preserve-3d',
              boxShadow: '0 40px 100px rgba(0,0,0,0.5)'
            }}
          >
            {/* The Map Ground Surface */}
            <div className="absolute inset-0 bg-[#a1d99b] rounded-lg border-8 border-stone-700 overflow-hidden" style={{ transformStyle: 'preserve-3d' }}>
              {/* Fake Roads Background */}
              <svg className="w-full h-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 0 40 L 100 40 M 0 45 L 100 45 M 0 60 L 100 60" stroke="#333" strokeWidth="2" fill="none" />
                <path d="M 40 0 L 40 100 M 50 0 L 50 100 M 70 0 L 70 100" stroke="#333" strokeWidth="2" fill="none" />
                <rect x="10" y="10" width="20" height="20" fill="#74c476" />
                <rect x="60" y="15" width="30" height="20" fill="#74c476" />
                <rect x="15" y="70" width="20" height="20" fill="#74c476" />
              </svg>

              {LAGOS_LOCATIONS.map((loc) => (
                <div
                  key={loc.id}
                  className="absolute group transition-transform hover:scale-110 z-10"
                  style={{ 
                    left: \`\${loc.x}%\`, 
                    top: \`\${loc.y}%\`,
                    transformStyle: 'preserve-3d',
                  }}
                  onPointerDown={() => setSelectedLoc(loc)}
                >
                  {/* Pin standing up vertically from the isometric plane */}
                  <div 
                    className={\`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-2xl border-2 border-stone-900 cursor-pointer \${loc.color} \${selectedLoc?.id === loc.id ? 'ring-4 ring-white animate-bounce' : ''}\`}
                    style={{
                      transform: 'rotateZ(35deg) rotateX(-55deg) translateZ(20px) translateY(-20px)',
                      boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.3), 0 15px 15px rgba(0,0,0,0.6)'
                    }}
                  >
                    {loc.icon}
                  </div>
                  
                  {/* Floor Shadow */}
                  <div className="absolute top-1/2 left-1/2 w-8 h-3 bg-black/40 rounded-full blur-sm -translate-x-1/2 -translate-y-1/2" />
                </div>
              ))}

              {/* 3D Billboards */}
              {[
                { x: 30, y: 20, brand: "MTN", color: "bg-yellow-400" },
                { x: 65, y: 40, brand: "GLO", color: "bg-green-500" },
                { x: 25, y: 70, brand: "AIRTEL", color: "bg-red-500" },
                { x: 75, y: 75, brand: "DANFO EXPRESS", color: "bg-stone-900" }
              ].map((board, i) => (
                <div key={i} className="absolute" style={{ left: \`\${board.x}%\`, top: \`\${board.y}%\`, transformStyle: 'preserve-3d' }}>
                  <div 
                    className={\`w-24 h-12 \${board.color} border-4 border-stone-800 flex items-center justify-center text-white font-black shadow-2xl\`}
                    style={{
                      transform: 'rotateZ(35deg) rotateX(-55deg) translateZ(15px) translateY(-25px)',
                    }}
                  >
                    {board.brand}
                  </div>
                  {/* Billboard Legs */}
                  <div className="absolute w-1 h-6 bg-stone-800 left-4" style={{ transform: 'rotateZ(35deg) rotateX(-55deg) translateZ(0) translateY(-5px)' }} />
                  <div className="absolute w-1 h-6 bg-stone-800 right-4" style={{ transform: 'rotateZ(35deg) rotateX(-55deg) translateZ(0) translateY(-5px)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Selected Location Details Panel */}
          {selectedLoc && (
            <div className="absolute bottom-6 left-6 right-6 bg-stone-900/95 backdrop-blur-md rounded-2xl border border-stone-700 p-5 shadow-2xl z-30 flex items-center justify-between animate-in slide-in-from-bottom-8">
              <div className="flex items-center gap-4">
                <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-stone-800 \${selectedLoc.color}\`}>
                  {selectedLoc.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{selectedLoc.name}</h3>
                    <span className="px-2 py-0.5 bg-stone-800 rounded-md text-[10px] font-mono font-bold text-stone-400">
                      {selectedLoc.label}
                    </span>
                  </div>
                  <p className="text-stone-400 text-sm mt-1">{selectedLoc.description}</p>
                </div>
              </div>
              
              <button
                onClick={() => onNavigateTo(selectedLoc)}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black font-['Bungee'] rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
              >
                <Navigation className="w-5 h-5" />
                DRIVE HERE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

  code = code.substring(0, returnIdx) + isometricReturn;
  fs.writeFileSync('src/components/MainMap.tsx', code);
  console.log('MainMap updated');
} else {
  console.log('Return block not found in MainMap');
}
