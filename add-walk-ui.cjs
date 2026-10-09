const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// Replace the Bottom-Left steering wheel block
const steerTarget = `{/* BOTTOM-LEFT: Steering Wheel & Micro-Toolbar */}
      <div className="absolute bottom-4 left-4 flex items-end gap-3 pointer-events-auto">`;

const newSteer = `{/* BOTTOM-LEFT: Steering Wheel or Walking Joystick */}
      <div className="absolute bottom-4 left-4 flex items-end gap-3 pointer-events-auto">
        {!isSteppedDown ? (
          <>
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
          </>
        ) : (
          <div className="w-32 h-32 rounded-full bg-stone-900/60 backdrop-blur border-2 border-amber-500/50 flex flex-col items-center justify-between p-2 shadow-xl pointer-events-auto">
             <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white active:bg-amber-400" onPointerDown={() => { inputsRef.current.gas = true; }} onPointerUp={() => { inputsRef.current.gas = false; }}>W</button>
             <div className="flex w-full justify-between px-1">
                <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white active:bg-amber-400">A</button>
                <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white active:bg-amber-400">D</button>
             </div>
             <button className="w-8 h-8 bg-stone-800 rounded-full flex items-center justify-center text-white active:bg-amber-400" onPointerDown={() => { inputsRef.current.brake = true; }} onPointerUp={() => { inputsRef.current.brake = false; }}>S</button>
          </div>
        )}
      </div>`;

code = code.replace(steerTarget + code.substring(code.indexOf(steerTarget) + steerTarget.length, code.indexOf('{/* BOTTOM-CENTER: Action Feed */}')), newSteer + '\n\n      ');

const pedalTarget = `{/* BOTTOM-RIGHT: Pedals & Gear Shift */}
      <div className="absolute bottom-4 right-4 flex items-end gap-3 pointer-events-auto">`;

const newPedals = `{/* BOTTOM-RIGHT: Pedals & Gear Shift */}
      <div className="absolute bottom-4 right-4 flex items-end gap-3 pointer-events-auto">
        {!isSteppedDown && (
          <>
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
          </>
        )}
      </div>`;

code = code.replace(pedalTarget + code.substring(code.indexOf(pedalTarget) + pedalTarget.length, code.indexOf('{/* NPC Interaction Modal */}')), newPedals + '\n\n      ');

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
console.log('Done walk ui');
