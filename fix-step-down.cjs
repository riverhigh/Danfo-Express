const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

// Find the right panel logic
const oldBlock = `                <div className="flex items-end gap-1.5">
                  <button
                    onMouseDown={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
                    onMouseUp={() => { inputsRef.current.brake = false; }}
                    onPointerLeave={() => { inputsRef.current.brake = false; }}
                    className="w-12 h-20 bg-stone-900 border-2 border-rose-900/50 rounded-lg flex flex-col items-center justify-end pb-2 shadow-xl active:translate-y-2 active:bg-rose-950/80 transition-all"
                  >
                    <div className="w-8 h-12 bg-gradient-to-b from-stone-800 to-stone-950 rounded border border-stone-700 shadow-inner flex items-end justify-center pb-1">
                      <span className="text-[9px] font-black font-mono text-rose-500/70">BRK</span>
                    </div>
                  </button>
                  <button
                    onMouseDown={() => { inputsRef.current.gas = true; }}
                    onMouseUp={() => { inputsRef.current.gas = false; }}
                    onPointerLeave={() => { inputsRef.current.gas = false; }}
                    className="w-9 h-28 bg-stone-900 border-2 border-emerald-900/50 rounded-lg flex flex-col items-center justify-end pb-2 shadow-xl active:translate-y-3 active:bg-emerald-950/80 transition-all"
                  >
                    <div className="w-5 h-20 bg-gradient-to-b from-stone-800 to-stone-950 rounded border border-stone-700 shadow-inner flex items-end justify-center pb-2">
                      <span className="text-[9px] font-black font-mono text-emerald-500/70" style={{ writingMode: 'vertical-rl' }}>GAS</span>
                    </div>
                  </button>
                </div>
              </>
            )}`;

const newBlock = `                <div className="flex items-end gap-1.5">
                  <button
                    onMouseDown={() => { inputsRef.current.brake = true; soundEngine.playAirBrakeHiss(); }}
                    onMouseUp={() => { inputsRef.current.brake = false; }}
                    onPointerLeave={() => { inputsRef.current.brake = false; }}
                    className="w-12 h-20 bg-stone-900 border-2 border-rose-900/50 rounded-lg flex flex-col items-center justify-end pb-2 shadow-xl active:translate-y-2 active:bg-rose-950/80 transition-all"
                  >
                    <div className="w-8 h-12 bg-gradient-to-b from-stone-800 to-stone-950 rounded border border-stone-700 shadow-inner flex items-end justify-center pb-1">
                      <span className="text-[9px] font-black font-mono text-rose-500/70">BRK</span>
                    </div>
                  </button>
                  <button
                    onMouseDown={() => { inputsRef.current.gas = true; }}
                    onMouseUp={() => { inputsRef.current.gas = false; }}
                    onPointerLeave={() => { inputsRef.current.gas = false; }}
                    className="w-9 h-28 bg-stone-900 border-2 border-emerald-900/50 rounded-lg flex flex-col items-center justify-end pb-2 shadow-xl active:translate-y-3 active:bg-emerald-950/80 transition-all"
                  >
                    <div className="w-5 h-20 bg-gradient-to-b from-stone-800 to-stone-950 rounded border border-stone-700 shadow-inner flex items-end justify-center pb-2">
                      <span className="text-[9px] font-black font-mono text-emerald-500/70" style={{ writingMode: 'vertical-rl' }}>GAS</span>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <button onClick={toggleStepDown} className="px-6 py-4 bg-amber-400 text-stone-950 font-black rounded-xl shadow-2xl active:scale-95 animate-bounce mb-8">
                GET IN BUS
              </button>
            )}`;

code = code.replace(oldBlock, newBlock);
code = code.replace(oldBlock.replace(/\r\n/g, '\n'), newBlock);

code = code.replace("{!isSteppedDown && (", "{!isSteppedDown ? (");

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
