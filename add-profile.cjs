const fs = require('fs');
let code = fs.readFileSync('src/components/PhoneModal.tsx', 'utf8');

const target = `                  {/* 4. Help & Guide */}
                  <button
                    onClick={() => setActiveApp('GUIDE')}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-950/40">
                      <HelpCircle className="w-7 h-7 text-stone-950" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-200">Guide</span>
                  </button>`;

const replacement = target + `

                  {/* 5. Driver Profile & License */}
                  <button
                    onClick={() => setActiveApp('PROFILE')}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-600 to-stone-800 flex items-center justify-center shadow-lg shadow-stone-950/40 border border-stone-500/30">
                      <span className="text-2xl">🪪</span>
                    </div>
                    <span className="text-[11px] font-medium text-stone-200">Docs</span>
                  </button>`;

code = code.replace(target, replacement);

const target2 = `            {/* ======================================================== */}
            {/* APP 8: GUIDE */}
            {/* ======================================================== */}`;

const replacement2 = `            {/* ======================================================== */}
            {/* APP 9: DRIVER LICENSE & CAR PARTICULARS */}
            {/* ======================================================== */}
            {activeApp === 'PROFILE' && (
              <div className="flex-1 bg-stone-950 flex flex-col overflow-hidden">
                <div className="h-12 border-b border-stone-800 px-4 flex items-center gap-3 shrink-0">
                  <button onClick={() => setActiveApp('HOME')}>
                    <ArrowLeft className="w-5 h-5 text-stone-300" />
                  </button>
                  <h2 className="font-bold text-sm text-stone-300 font-mono">Driver & Vehicle Docs</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  {/* Driver's License Card */}
                  <div className="w-full bg-gradient-to-br from-[#1c3f25] to-[#0c1f10] rounded-2xl p-4 shadow-xl border border-[#2e683d] relative overflow-hidden">
                    {/* Faded coat of arms bg */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 text-9xl pointer-events-none">🦅</div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-[8px] uppercase tracking-wider text-green-300 font-bold">Federal Republic of Nigeria</div>
                        <div className="text-[12px] font-black text-white font-serif">NATIONAL DRIVER'S LICENSE</div>
                      </div>
                      <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    <div className="flex gap-3 relative z-10">
                      <div className="w-16 h-20 bg-stone-800 rounded border border-stone-600 shrink-0 flex items-center justify-center overflow-hidden">
                         <div className="w-10 h-10 bg-stone-600 rounded-full flex items-center justify-center"><UserCheck className="w-6 h-6 text-stone-400"/></div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div>
                          <div className="text-[7px] text-green-400 uppercase">Name</div>
                          <div className="text-xs font-bold text-white uppercase">{gameState.driverName}</div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <div className="text-[7px] text-green-400 uppercase">Class</div>
                            <div className="text-xs font-bold text-white">E (Commercial)</div>
                          </div>
                          <div>
                            <div className="text-[7px] text-green-400 uppercase">Exp Date</div>
                            <div className="text-xs font-bold text-white">12-08-2028</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Particulars */}
                  <div className="w-full bg-stone-900 rounded-2xl p-4 shadow-xl border border-stone-700">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-800">
                      <Car className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-bold text-amber-400 font-mono">Vehicle Particulars</h3>
                    </div>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">Road Worthiness</span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">VALID - 6 Months</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">Vehicle Insurance</span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">COMPREHENSIVE</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">Local Govt. Sticker</span>
                        <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded">OSODI-ISOLO LG</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">Plate Number</span>
                        <span className="text-xs font-black text-white font-mono tracking-widest">KJA-821XY</span>
                      </div>
                    </div>

                    <div className="mt-4 p-2.5 bg-stone-950 rounded-lg border border-stone-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0">👮‍♂️</div>
                      <p className="text-[9px] text-stone-300 leading-tight">Keep these documents up to date. VIO and LASTMA officials will check them during roadblocks!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
` + '\n' + target2;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/PhoneModal.tsx', code);
console.log('Docs app added');
