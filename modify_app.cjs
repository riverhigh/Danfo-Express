const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const regex = /\{\/\* TAB 1: CAREER RUSH SHIFTS \*\/\}[\s\S]*?START 3D SHIFT[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*\)\}/;
code = code.replace(regex, `{/* TAB 1: CAREER RUSH SHIFTS */}
            {menuTab === 'CAREER_SHIFT' && (
              <div className="w-full flex flex-col items-center justify-center space-y-6 py-12 bg-stone-900/50 border border-stone-800 rounded-3xl">
                <div className="text-center space-y-2">
                  <h3 className="text-amber-400 font-bold font-['Bungee'] text-2xl">SAVE SLOT 1/3</h3>
                  <p className="text-stone-300">Level: Lagos Hustler • Balance: ₦{walletNaira.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleStartShift(selectedShiftId)}
                  className="px-10 py-5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-['Bungee'] text-xl rounded-2xl shadow-xl shadow-amber-400/20 flex items-center gap-3 transition-transform active:scale-95"
                >
                  <MapPin className="w-6 h-6" />
                  CONTINUE CAREER
                </button>
              </div>
            )}`);
fs.writeFileSync('src/App.tsx', code);
console.log('done');
