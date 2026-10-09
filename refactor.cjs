const fs = require('fs');

const path = 'src/components/ThreeDrivingSimulator.tsx';
let code = fs.readFileSync(path, 'utf8');

const returnIdx = code.indexOf('return (\n    <div className="relative w-[100vw] h-[100vh]');
if (returnIdx === -1) {
  console.log('Not found');
  process.exit(1);
}

const newReturn = `return (
    <div className="relative w-[100vw] h-[100vh] bg-stone-950 overflow-hidden select-none pointer-events-none" style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* 3D WebGL Canvas Viewport (Handles dragging for camera) */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* ========================================================== */}
      {/* ZUUKS-STYLE HUD OVERLAYS (TRANSPARENT, CORNER-ANCHORED) */}
      {/* ========================================================== */}

      {/* TOP-LEFT: Mini GPS Radar */}
      <div className="absolute top-3 left-3 w-[110px] h-[110px] pointer-events-auto origin-top-left" style={{ transform: 'scale(0.8)' }}>
        <MiniMap
          currentDistanceMeters={currentDist}
          totalDistanceMeters={gameState.targetDistanceMeters}
          laneOffset={simRef.current.laneOffset}
          junctions={gameState.junctions}
          activeJunctionIndex={activeJuncIndex}
          speedKmH={hudSpeed}
        />
      </div>

      {/* TOP-CENTER: Minimalist Status Ribbon */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-4 bg-stone-950/60 backdrop-blur-sm border border-stone-700/50 rounded-full px-4 py-1.5 shadow-xl">
        {/* Speed */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase text-stone-300">Spd</span>
          <div className="text-xs font-mono font-black text-white">{hudSpeed}</div>
        </div>
        <div className="h-4 w-px bg-stone-700" />
        {/* Fuel */}
        <div className="flex items-center gap-1.5">
          <Fuel className="w-3 h-3 text-amber-400" />
          <div className="w-12 h-1.5 bg-stone-800 rounded-full overflow-hidden relative">
            <div className={\`absolute left-0 top-0 h-full transition-all \${hudFuel < 20 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}\`} style={{ width: \`\${hudFuel}%\` }} />
          </div>
        </div>
        <div className="h-4 w-px bg-stone-700" />
        {/* Heat */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase text-stone-300">Tmp</span>
          <div className={\`text-xs font-mono font-bold \${hudHeat > 80 ? 'text-rose-400' : 'text-stone-200'}\`}>{hudHeat}</div>
        </div>
        <div className="h-4 w-px bg-stone-700" />
        {/* Cash */}
        <div className="flex items-center gap-1.5">
          <Coins className="w-3 h-3 text-emerald-400" />
          <div className="text-xs font-mono font-black text-emerald-400 tabular-nums">₦{gameState.conductor.collectedCash}</div>
        </div>
      </div>

      {/* TOP-RIGHT: Rearview Mirrors & System Toggles */}
      <div className="absolute top-3 right-3 pointer-events-auto flex gap-2">
        <div className="w-24 h-10 bg-stone-950/80 backdrop-blur border border-stone-600 rounded-lg p-0.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-[6px] font-mono font-bold text-stone-400 px-1">
            <span>L-MIRROR</span><span>REAR</span>
          </div>
          <div className="flex-1 bg-stone-900 border border-stone-800 rounded flex items-center justify-center relative">
            <div className="w-3 h-2 bg-red-600 rounded-sm animate-pulse opacity-80" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={toggleDoor} className={\`p-1.5 rounded-lg border font-bold flex flex-col items-center gap-0.5 shadow-xl transition-colors \${doorState === 'OPEN' ? 'bg-amber-400 border-amber-300 text-stone-950' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>
            {doorState === 'OPEN' ? <DoorOpen className="w-3 h-3" /> : <DoorClosed className="w-3 h-3" />}
          </button>
          <button onClick={toggleEngine} className={\`p-1.5 rounded-lg border font-bold flex flex-col items-center gap-0.5 shadow-xl transition-colors \${isEngineRunning ? 'bg-rose-900/80 border-rose-500 text-rose-300' : 'bg-emerald-900/80 border-emerald-400 text-emerald-300 animate-pulse'}\`}>
            <Power className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* DYNAMIC BANNERS (Gas, Shop, Bus Stop) - absolute centered, pointer-events-auto */}
      {activeGasStation && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Fuel className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-black text-emerald-400">⛽ DRIVE-IN: {activeGasStation.name}</div>
            <div className="text-xs font-bold text-white">Rate: ₦{activeGasStation.fuelPricePerLiter}/L • Fuel: {hudFuel}%</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleFillGas(false)} className="px-3 py-2 bg-stone-800 text-stone-200 font-bold text-xs rounded-xl font-mono">15L (₦14,250)</button>
            <button onClick={() => handleFillGas(true)} className="px-4 py-2 bg-emerald-400 text-stone-950 font-black text-xs font-['Bungee'] rounded-xl">FULL TANK</button>
          </div>
        </div>
      )}

      {activeShop && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center gap-4 pointer-events-auto max-w-xl w-full">
          <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
            <Store className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-mono uppercase font-black text-amber-400">🛒 SHOP: {activeShop.name}</div>
            <div className="text-xs font-bold text-white">Wallet: ₦{gameState.walletNaira.toLocaleString()}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {activeShop.items.map((item) => (
                <button key={item.id} onClick={() => handleBuyShopItem(item)} className="px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-xl flex items-center gap-1.5 text-xs text-white font-mono active:scale-95">
                  <span>{item.icon}</span><span className="font-bold">{item.name}</span><span className="text-amber-400 font-black">₦{item.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAtCurrentJunction && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl p-3 shadow-2xl flex items-center gap-4 animate-bounce pointer-events-auto">
          <MapPin className="w-6 h-6 text-amber-400 animate-pulse" />
          <div>
            <div className="text-[10px] font-mono uppercase font-black text-amber-400">📍 AT BUS STOP: {currentJunction?.name}</div>
            <div className="text-xs font-bold text-white">{currentJunction?.waitingPassengersCount} waiting!</div>
          </div>
          <button onClick={toggleDoor} className={\`px-4 py-2 font-black text-xs font-['Bungee'] rounded-xl shadow-lg \${doorState === 'CLOSED' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-200'}\`}>
            {doorState === 'CLOSED' ? 'OPEN DOOR' : 'CLOSE DOOR'}
          </button>
        </div>
      )}

      {/* BOTTOM-LEFT: Steering Wheel & Micro-Toolbar */}
      <div className="absolute bottom-4 left-4 flex items-end gap-3 pointer-events-auto">
        {/* Micro-Toolbar */}
        <div className="flex flex-col gap-1.5 origin-bottom-left" style={{ transform: 'scale(0.85)' }}>
          <button onClick={() => triggerTurnSignal('LEFT')} className={\`p-2 rounded border text-[10px] font-bold \${turnSignal === 'LEFT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>⬅️ L</button>
          <button onClick={() => triggerTurnSignal('RIGHT')} className={\`p-2 rounded border text-[10px] font-bold \${turnSignal === 'RIGHT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>R ➡️</button>
          <button onClick={toggleHazards} className={\`p-2 rounded border text-[10px] font-bold \${hazardLights ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>🚨 HZD</button>
          <button onClick={toggleWipers} className={\`p-2 rounded border text-[10px] font-bold \${wipersActive ? 'bg-sky-500 text-stone-950' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>🌧️ WPR</button>
        </div>

        {/* Steering Wheel */}
        <div
          ref={wheelElementRef}
          onPointerDown={handleWheelPointerDown}
          onPointerMove={handleWheelPointerMove}
          onPointerUp={handleWheelPointerUp}
          onPointerCancel={handleWheelPointerUp}
          className="relative w-32 h-32 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center shadow-2xl transition-transform duration-75"
          style={{
            transform: \`rotate(\${wheelVisualAngle}deg)\`,
            background: 'radial-gradient(circle, rgba(41,37,36,0.6) 35%, rgba(12,10,9,0.9) 100%)',
            border: '8px solid rgba(68,64,60,0.85)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.15)',
          }}
        >
          {/* Grip stripes */}
          <div className="absolute top-0 w-3 h-2 bg-amber-400 rounded-sm" />
          <div className="absolute bottom-0 w-3 h-2 bg-amber-400 rounded-sm" />
          <div className="absolute w-full h-2 bg-stone-600/80 pointer-events-none" />
          <div className="absolute h-full w-2 bg-stone-600/80 pointer-events-none" />
          
          {/* Horn */}
          <button
            onClick={(e) => { e.stopPropagation(); handleHorn(); }}
            className="relative w-10 h-10 bg-amber-400/90 active:bg-amber-300 text-stone-950 rounded-full font-black text-[9px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95"
          >
            HORN
          </button>
        </div>
      </div>

      {/* BOTTOM-CENTER: Action Feed */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col gap-1 items-center">
        {actionFeed.slice(0, 2).map((msg, i) => (
          <div key={i} className={\`text-[10px] px-3 py-1 rounded-full bg-stone-950/80 backdrop-blur font-mono \${i === 0 ? 'text-amber-300' : 'text-stone-400 opacity-60'}\`}>
            {msg}
          </div>
        ))}
      </div>

      {/* BOTTOM-RIGHT: Pedals & Gear Shift */}
      <div className="absolute bottom-4 right-4 flex items-end gap-3 pointer-events-auto">
        {/* Gear Shift */}
        <div className="flex flex-col bg-stone-900/80 backdrop-blur border border-stone-700/50 p-1 rounded-xl shadow-lg">
          {(['P', 'R', 'N', 'D', 'L'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGear(g)}
              className={\`w-6 h-6 rounded-lg font-mono font-black text-[10px] transition-all flex items-center justify-center my-0.5 \${
                gear === g ? 'bg-amber-400 text-stone-950 shadow-md ring-1 ring-amber-300 scale-105' : 'text-stone-400 hover:text-white'
              }\`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Pedals */}
        <div className="flex items-end gap-2">
          <button
            onMouseDown={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
            onMouseUp={() => { inputsRef.current.brake = false; }}
            onTouchStart={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
            onTouchEnd={() => { inputsRef.current.brake = false; }}
            className="w-16 h-20 bg-stone-900/90 active:bg-rose-900/90 border border-stone-600 active:border-rose-500 rounded-xl flex items-center justify-center shadow-xl transition-transform active:translate-y-1"
            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)' }}
          >
            <span className="text-[10px] font-mono font-black text-rose-400">BRAKE</span>
          </button>
          
          <button
            onMouseDown={() => { inputsRef.current.gas = true; }}
            onMouseUp={() => { inputsRef.current.gas = false; }}
            onTouchStart={() => { inputsRef.current.gas = true; }}
            onTouchEnd={() => { inputsRef.current.gas = false; }}
            className={\`w-14 h-28 bg-stone-900/90 rounded-xl flex items-center justify-center shadow-xl transition-transform active:translate-y-1 \${isEngineRunning ? 'active:bg-amber-400/90 active:text-stone-950 border border-stone-600 active:border-amber-500' : 'border border-stone-700 opacity-60'}\`}
            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 6px, rgba(251,191,36,0.1) 6px, rgba(251,191,36,0.1) 10px)' }}
          >
            <span className="text-[10px] font-mono font-black text-amber-400">GAS</span>
          </button>
        </div>
      </div>

      {/* NPC Interaction Modal */}
      {activeNpc && (
        <NpcInteractionModal
          npc={activeNpc}
          walletNaira={gameState.walletNaira}
          streetCred={gameState.streetCred}
          onClose={() => setActiveNpc(null)}
          onTransact={(nairaDelta, credDelta, msg) => {
            setGameState((prev) => ({
              ...prev,
              walletNaira: Math.max(0, prev.walletNaira + nairaDelta),
              streetCred: Math.max(0, prev.streetCred + credDelta),
            }));
            addFeedMessage(msg);
            setActiveNpc(null);
          }}
        />
      )}
    </div>
  );
};
`;

code = code.substring(0, returnIdx) + newReturn;
fs.writeFileSync(path, code);
console.log('Done refactoring HUD layout!');
