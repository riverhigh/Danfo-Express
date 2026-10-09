const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDrivingSimulator.tsx', 'utf8');

code = code.replace("cameraMode: 'CABIN_1ST',", "cameraMode: cameraMode as any,");
code = code.replace(
  "const [isBoarding, setIsBoarding] = useState<boolean>(false);", 
  "const [isBoarding, setIsBoarding] = useState<boolean>(false);\n  const [cameraMode, setCameraMode] = React.useState('FIRST_PERSON');"
);

const buttonStr = `            <button onClick={() => setCameraMode(m => m === 'FIRST_PERSON' ? 'THIRD_PERSON' : 'FIRST_PERSON')} title="Change Camera"
              className="p-1.5 rounded border border-sky-500/50 bg-sky-950/70 text-sky-300 font-black text-[9px] font-mono">
              CAM
            </button>
            <button onClick={toggleDoor} title="Toggle Door"`;
            
code = code.replace('            <button onClick={toggleDoor} title="Toggle Door"', buttonStr);

fs.writeFileSync('src/components/ThreeDrivingSimulator.tsx', code);
console.log('Added UI button');
