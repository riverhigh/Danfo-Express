const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// Find the exact return block
const endIdx = code.indexOf('  return (\r\n    <div className="relative w-[100vw]');
if (endIdx === -1) {
  console.log('ERROR: return block not found');
  process.exit(1);
}

const newReturn = `
  // ── Retractable panel states ──────────────────────────────────────
  const [showTopHUD, setShowTopHUD] = React.useState(true);
  const [showLeftPanel, setShowLeftPanel] = React.useState(true);
  const [showRightPanel, setShowRightPanel] = React.useState(true);

  return (
    <div className="relative w-[100vw] h-[100vh] bg-stone-950 overflow-hidden select-none pointer-events-none" style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* ═══════ TOP BAR ═══════ */}
      <div className={\`absolute top-0 left-0 right-0 z-40 pointer-events-auto transition-transform duration-300 \${showTopHUD ? 'translate-y-0' : '-translate-y-full'}\`}>
        <div className="flex items-stretch h-9 bg-stone-950/85 backdrop-blur-md border-b border-stone-700/60 shadow-xl">
          {/* MiniMap pinned top-left */}
          <div className="w-[88px] h-[88px] shrink-0 absolute top-0 left-0 pointer-events-auto z-10 origin-top-left" style={{ transform: 'scale(0.75)' }}>
            <MiniMap
              currentDistanceMeters={currentDist}
              totalDistanceMeters={gameState.targetDistanceMeters}
              laneOffset={simRef.current.laneOffset}
              junctions={gameState.junctions}
              activeJunctionIndex={activeJuncIndex}
              speedKmH={hudSpeed}
            />
          </div>
          {/* Centre strip */}
          <div className="ml-[66px] flex-1 flex items-center justify-center gap-2.5 px-2 text-[10px] font-mono">
            <span className="text-stone-400">SPD</span><span className="font-black text-white tabular-nums">{hudSpeed}</span><span className="text-stone-500 text-[8px]">km/h</span>
            <div className="w-px h-4 bg-stone-700" />
            <Fuel className="w-2.5 h-2.5 text-amber-400" />
            <div className="w-10 h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className={\`h-full transition-all \${hudFuel < 20 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}\`} style={{ width: \`\${hudFuel}%\` }} /></div>
            <span className={hudFuel < 20 ? 'text-rose-400' : 'text-stone-400'}>{hudFuel}%</span>
            <div className="w-px h-4 bg-stone-700" />
            <span className={hudHeat > 80 ? 'text-rose-400 font-bold' : 'text-stone-300'}>🌡️{hudHeat}°</span>
            <div className="w-px h-4 bg-stone-700" />
            <Coins className="w-2.5 h-2.5 text-emerald-400" /><span className="text-emerald-400 font-black tabular-nums">₦{gameState.conductor.collectedCash.toLocaleString()}</span>
            <div className="w-px h-4 bg-stone-700" />
            <span className={\`font-black text-sm \${gear === 'D' ? 'text-amber-400' : gear === 'R' ? 'text-rose-400' : gear === 'P' ? 'text-sky-400' : 'text-stone-300'}\`}>{gear}</span>
          </div>
          {/* Right buttons */}
          <div className="flex items-center gap-1 px-1.5 shrink-0">
            <button onClick={toggleDoor} className={\`p-1.5 rounded border font-bold transition-colors \${doorState === 'OPEN' ? 'bg-amber-400 border-amber-300 text-stone-950' : 'bg-stone-800/80 border-stone-600 text-stone-300'}\`}>
              {doorState === 'OPEN' ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleEngine} className={\`p-1.5 rounded border font-bold transition-colors \${isEngineRunning ? 'bg-rose-900/80 border-rose-600 text-rose-300' : 'bg-emerald-900/80 border-emerald-400 text-emerald-300 animate-pulse'}\`}>
              <Power className="w-3.5 h-3.5" />
            </button>
            <button onClick={toggleStepDown} title={isSteppedDown ? 'Get Back In' : 'Exit Bus'}
              className={\`p-1.5 rounded border font-bold transition-colors \${isSteppedDown ? 'bg-amber-400 border-amber-300 text-stone-950' : 'bg-stone-800/80 border-stone-600 text-stone-300'}\`}>
              <Footprints className="w-3.5 h-3.5" />
            </button>
            <button onClick={onOpenPhone} className="p-1.5 rounded border border-indigo-500/50 bg-indigo-950/70 text-indigo-300">
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onFinishShift(false)} className="p-1.5 rounded border border-stone-600 bg-stone-800/80 text-stone-400 hover:text-rose-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {/* Top toggle tab */}
      <div className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300" style={{ top: showTopHUD ? 36 : 0 }}>
        <button onClick={() => setShowTopHUD(v => !v)}
          className="w-10 h-4 bg-stone-900/90 border border-stone-700/60 rounded-b-lg flex items-center justify-center text-stone-400 hover:text-white text-[8px]">
          {showTopHUD ? '▲' : '▼'}
        </button>
      </div>

      {/* ═══════ DYNAMIC BANNERS ═══════ */}
      {activeGasStation && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-emerald-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
          <Fuel className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[9px] font-mono font-black text-emerald-400">⛽ {activeGasStation.name}</div>
            <div className="text-[10px] text-white">₦{activeGasStation.fuelPricePerLiter}/L · Fuel: {hudFuel}%</div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => handleFillGas(false)} className="px-2 py-1 bg-stone-800 text-stone-200 font-bold text-[9px] rounded-xl">15L</button>
            <button onClick={() => handleFillGas(true)} className="px-2.5 py-1 bg-emerald-400 text-stone-950 font-black text-[9px] font-['Bungee'] rounded-xl">FULL</button>
          </div>
        </div>
      )}
      {activeShop && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto max-w-xs w-full">
          <Store className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-mono font-black text-amber-400 truncate">{activeShop.name}</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {activeShop.items.map((item) => (
                <button key={item.id} onClick={() => handleBuyShopItem(item)} className="px-1.5 py-0.5 bg-stone-900 border border-stone-700 rounded-lg text-[9px] text-white active:scale-95">
                  {item.icon} <span className="text-amber-400">₦{item.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {isAtCurrentJunction && !activeGasStation && !activeShop && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-stone-950/95 border-2 border-amber-400 rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto">
          <MapPin className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
          <div>
            <div className="text-[9px] font-mono font-black text-amber-400">📍 {currentJunction?.name}</div>
            <div className="text-[10px] text-white">{currentJunction?.waitingPassengersCount} waiting</div>
          </div>
          <button onClick={toggleDoor} className={\`px-2.5 py-1 font-black text-[9px] font-['Bungee'] rounded-xl \${doorState === 'CLOSED' ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-200'}\`}>
            {doorState === 'CLOSED' ? 'OPEN' : 'CLOSE'}
          </button>
        </div>
      )}

      {/* ═══════ BOTTOM-LEFT: Wheel / Joystick ═══════ */}
      <div className="absolute bottom-4 left-2 z-30 pointer-events-auto flex flex-col items-start">
        <button onClick={() => setShowLeftPanel(v => !v)}
          className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center">
          {showLeftPanel ? '◀' : '▶'}
        </button>
        <div className={\`flex items-end gap-2 transition-opacity duration-300 origin-bottom-left \${showLeftPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
          {!isSteppedDown ? (
            <>
              <div className="flex flex-col gap-1" style={{ transform: 'scale(0.85)', transformOrigin: 'bottom left' }}>
                <button onClick={() => triggerTurnSignal('LEFT')} className={\`w-10 p-1.5 rounded border text-[9px] font-bold text-center \${turnSignal === 'LEFT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>⬅️</button>
                <button onClick={() => triggerTurnSignal('RIGHT')} className={\`w-10 p-1.5 rounded border text-[9px] font-bold text-center \${turnSignal === 'RIGHT' ? 'bg-amber-400 text-stone-950 border-amber-300' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>➡️</button>
                <button onClick={toggleHazards} className={\`w-10 p-1.5 rounded border text-[9px] font-bold text-center \${hazardLights ? 'bg-amber-500 text-stone-950 animate-pulse' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>🚨</button>
                <button onClick={toggleWipers} className={\`w-10 p-1.5 rounded border text-[9px] font-bold text-center \${wipersActive ? 'bg-sky-500 text-stone-950' : 'bg-stone-900/80 border-stone-700 text-stone-300'}\`}>🌧️</button>
              </div>
              <div
                ref={wheelElementRef}
                onPointerDown={handleWheelPointerDown}
                onPointerMove={handleWheelPointerMove}
                onPointerUp={handleWheelPointerUp}
                onPointerCancel={handleWheelPointerUp}
                className="relative w-28 h-28 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center shadow-2xl"
                style={{
                  transform: \`rotate(\${wheelVisualAngle}deg)\`,
                  background: 'radial-gradient(circle, rgba(41,37,36,0.65) 35%, rgba(12,10,9,0.92) 100%)',
                  border: '7px solid rgba(68,64,60,0.85)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.15)',
                }}>
                <div className="absolute top-0 w-3 h-2 bg-amber-400 rounded-sm" />
                <div className="absolute bottom-0 w-3 h-2 bg-amber-400 rounded-sm" />
                <div className="absolute w-full h-1.5 bg-stone-600/80 pointer-events-none" />
                <div className="absolute h-full w-1.5 bg-stone-600/80 pointer-events-none" />
                <button onClick={(e) => { e.stopPropagation(); handleHorn(); }}
                  className="relative w-9 h-9 bg-amber-400/90 active:bg-amber-300 text-stone-950 rounded-full font-black text-[8px] font-['Bungee'] flex items-center justify-center shadow-lg border border-stone-900 transition-transform active:scale-95">
                  HORN
                </button>
              </div>
            </>
          ) : (
            <div className="w-28 h-28 rounded-full bg-stone-900/70 backdrop-blur border-2 border-amber-500/60 flex flex-col items-center justify-between p-2 shadow-xl">
              <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400"
                onPointerDown={() => { inputsRef.current.gas = true; }} onPointerUp={() => { inputsRef.current.gas = false; }}>▲</button>
              <div className="flex w-full justify-between px-1">
                <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400">◀</button>
                <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400">▶</button>
              </div>
              <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white text-lg active:bg-amber-400"
                onPointerDown={() => { inputsRef.current.brake = true; }} onPointerUp={() => { inputsRef.current.brake = false; }}>▼</button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ BOTTOM-CENTER: Action Feed ═══════ */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col gap-0.5 items-center" style={{ maxWidth: '50vw' }}>
        {actionFeed.slice(0, 2).map((msg, i) => (
          <div key={i} className={\`text-[9px] px-2 py-0.5 rounded-full bg-stone-950/80 backdrop-blur font-mono truncate max-w-full \${i === 0 ? 'text-amber-300' : 'text-stone-500 opacity-60'}\`}>
            {msg}
          </div>
        ))}
      </div>

      {/* ═══════ BOTTOM-RIGHT: Pedals & Gear ═══════ */}
      <div className="absolute bottom-4 right-2 z-30 pointer-events-auto flex flex-col items-end">
        <button onClick={() => setShowRightPanel(v => !v)}
          className="mb-1 w-8 h-5 bg-stone-900/80 border border-stone-700/50 rounded text-stone-400 text-[8px] flex items-center justify-center">
          {showRightPanel ? '▶' : '◀'}
        </button>
        <div className={\`flex items-end gap-2 transition-opacity duration-300 origin-bottom-right \${showRightPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
          {!isSteppedDown && (
            <>
              <div className="flex flex-col bg-stone-900/85 backdrop-blur border border-stone-700/50 p-1 rounded-xl shadow-lg">
                {(['P', 'R', 'N', 'D', 'L'] as const).map((g) => (
                  <button key={g} onClick={() => setGear(g)}
                    className={\`w-6 h-6 rounded-lg font-mono font-black text-[10px] transition-all flex items-center justify-center my-0.5 \${
                      gear === g ? 'bg-amber-400 text-stone-950 shadow-md ring-1 ring-amber-300 scale-105' : 'text-stone-400 hover:text-white'
                    }\`}>
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-1.5">
                <button
                  onMouseDown={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
                  onMouseUp={() => { inputsRef.current.brake = false; }}
                  onTouchStart={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
                  onTouchEnd={() => { inputsRef.current.brake = false; }}
                  className="w-14 h-16 bg-stone-900/90 active:bg-rose-900/90 border border-stone-600 active:border-rose-500 rounded-xl flex items-center justify-center shadow-xl transition-transform active:translate-y-1"
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)' }}>
                  <span className="text-[9px] font-mono font-black text-rose-400">BRAKE</span>
                </button>
                <button
                  onMouseDown={() => { inputsRef.current.gas = true; }}
                  onMouseUp={() => { inputsRef.current.gas = false; }}
                  onTouchStart={() => { inputsRef.current.gas = true; }}
                  onTouchEnd={() => { inputsRef.current.gas = false; }}
                  className={\`w-12 h-24 bg-stone-900/90 rounded-xl flex items-center justify-center shadow-xl transition-transform active:translate-y-1 \${isEngineRunning ? 'active:bg-amber-400/90 active:text-stone-950 border border-stone-600 active:border-amber-500' : 'border border-stone-700 opacity-60'}\`}
                  style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 6px, rgba(251,191,36,0.1) 6px, rgba(251,191,36,0.1) 10px)' }}>
                  <span className="text-[9px] font-mono font-black text-amber-400">GAS</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* NPC Modal */}
      {activeNpc && (
        <NpcInteractionModal
          npc={activeNpc}
          isOpen={true}
          walletNaira={gameState.walletNaira}
          onClose={() => setActiveNpc(null)}
          onSettleOrBuy={(cost, reward, msg) => {
            setGameState((prev) => ({
              ...prev,
              walletNaira: Math.max(0, prev.walletNaira - cost + (reward?.cashNaira || 0)),
              streetCred: Math.max(0, prev.streetCred + (reward?.streetCred || 0)),
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

code = code.substring(0, endIdx) + newReturn;
fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
console.log('Done. Lines: ' + code.split('\n').length);
