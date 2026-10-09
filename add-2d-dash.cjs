const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

const dashInsert = `
        {/* 2D STYLIZED DASHBOARD OVERLAY */}
        {!isSteppedDown && cameraMode === 'FIRST_PERSON' && (
          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20 overflow-hidden">
            {/* Dashboard Arc Background */}
            <div className="absolute bottom-[-50px] left-[-5%] right-[-5%] h-[150px] bg-gradient-to-t from-stone-950 via-stone-900 to-stone-800 rounded-t-[50%] border-t-[6px] border-stone-700 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] opacity-95">
              
              {/* Vents */}
              <div className="absolute top-4 left-[20%] w-16 h-6 border border-stone-600 rounded bg-stone-950 flex gap-1 p-1">
                <div className="flex-1 bg-stone-800"></div>
                <div className="flex-1 bg-stone-800"></div>
                <div className="flex-1 bg-stone-800"></div>
              </div>
              <div className="absolute top-4 right-[20%] w-16 h-6 border border-stone-600 rounded bg-stone-950 flex gap-1 p-1">
                <div className="flex-1 bg-stone-800"></div>
                <div className="flex-1 bg-stone-800"></div>
                <div className="flex-1 bg-stone-800"></div>
              </div>
            </div>
            
            {/* Center Console cluster */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-28 bg-stone-950 rounded-t-[40px] border-t-4 border-l-2 border-r-2 border-stone-700 flex justify-center items-center gap-8 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
               {/* RPM Gauge */}
               <div className="relative w-20 h-20 rounded-full border-[6px] border-stone-600 bg-stone-900 flex items-center justify-center shadow-inner">
                 <div className="text-[9px] text-stone-400 absolute top-3 font-mono">RPM</div>
                 <div className="text-2xl text-white font-black">{Math.round(hudRPM / 1000)}</div>
                 <div className="absolute w-full h-full rounded-full border-4 border-dashed border-rose-500 opacity-20"></div>
               </div>
               
               {/* Center Warning Lights */}
               <div className="flex flex-col gap-3">
                 <div className="w-8 h-8 rounded border border-rose-900 bg-rose-950 flex items-center justify-center shadow-inner">
                   <div className={\`w-5 h-5 rounded-full \${hazardLights ? 'bg-rose-500 animate-ping' : 'bg-rose-900'}\`}></div>
                 </div>
                 <div className="text-xl font-black text-sky-400 font-mono text-center bg-stone-900 px-2 rounded border border-stone-700 shadow-inner">
                   {gear}
                 </div>
               </div>

               {/* Speed Gauge */}
               <div className="relative w-20 h-20 rounded-full border-[6px] border-stone-600 bg-stone-900 flex items-center justify-center shadow-inner">
                 <div className="text-[9px] text-stone-400 absolute top-3 font-mono">KM/H</div>
                 <div className="text-2xl text-sky-400 font-black">{hudSpeed}</div>
                 <div className="absolute w-full h-full rounded-full border-4 border-dashed border-sky-500 opacity-20"></div>
               </div>
            </div>
          </div>
        )}
`;

code = code.replace('{/* ■ ■ ■ ■ ■ ■ ■ BOTTOM-CENTER: Action Feed', dashInsert + '\\n        {/* ■ ■ ■ ■ ■ ■ ■ BOTTOM-CENTER: Action Feed');
// Fallback if the square character isn't matched
code = code.replace('{/*  ? ? ? ? ? ? ? BOTTOM-CENTER: Action Feed', dashInsert + '\\n        {/*  ? ? ? ? ? ? ? BOTTOM-CENTER: Action Feed');

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
console.log('Added 2D dashboard!');
