const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

const rightPanelEnd = `                  <span className="text-[9px] font-mono font-black text-amber-400">GAS</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>`;

const rightPanelEndFixed = `                  <span className="text-[9px] font-mono font-black text-amber-400">GAS</span>
                </button>
              </div>
            </>
          ) : (
            <button onClick={toggleStepDown} className="px-6 py-4 bg-amber-400 text-stone-950 font-black rounded-xl shadow-2xl active:scale-95 animate-bounce mb-8">
              GET IN BUS
            </button>
          )}
        </div>
      </div>`;

code = code.replace(rightPanelEnd, rightPanelEndFixed);
code = code.replace(rightPanelEnd.replace(/\n/g, '\r\n'), rightPanelEndFixed);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
console.log('Fixed GET IN BUS button!');
