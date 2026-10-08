const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src/App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

// Add import
if (!appContent.includes("useGameSave")) {
  appContent = appContent.replace(
    /import React, { useState, useEffect, useCallback } from 'react';/,
    `import React, { useState, useEffect, useCallback } from 'react';\nimport { useGameSave } from './hooks/useGameSave';`
  );
}

// Replace state
const statePattern = /const \[walletNaira, setWalletNaira\] = useState<number>\(25000\);\s*const \[streetCred, setStreetCred\] = useState<number>\(240\);\s*const \[selectedShiftId, setSelectedShiftId\] = useState<ShiftTimeOfDay>\('MORNING_RUSH'\);\s*const \[selectedBusId, setSelectedBusId\] = useState<BusModelId>\('RUSTIC_VAN'\);\s*const \[selectedSlogan, setSelectedSlogan\] = useState<string>\('No King as God'\);/;

const newHook = `  const { saveData, updateSave } = useGameSave();
  const walletNaira = saveData.walletNaira;
  const streetCred = saveData.streetCred;
  const selectedBusId = saveData.selectedBusId;
  const selectedSlogan = saveData.selectedSlogan;
  const setWalletNaira = (val) => updateSave({ walletNaira: typeof val === 'function' ? val(walletNaira) : val });
  const setStreetCred = (val) => updateSave({ streetCred: typeof val === 'function' ? val(streetCred) : val });
  const setSelectedBusId = (val) => updateSave({ selectedBusId: val });
  const setSelectedSlogan = (val) => updateSave({ selectedSlogan: val });
  const [selectedShiftId, setSelectedShiftId] = useState<ShiftTimeOfDay>('MORNING_RUSH');`;

appContent = appContent.replace(statePattern, newHook);

// Init gameState using save
appContent = appContent.replace(
  /walletNaira: 25000,\n\s*bankBalanceNaira: 50000,\n\s*streetCred: 240,/,
  `walletNaira: saveData.walletNaira,
        bankBalanceNaira: saveData.bankBalanceNaira,
        streetCred: saveData.streetCred,`
);

appContent = appContent.replace(
  /bus\.slogan = 'No King as God';/,
  `bus.slogan = saveData.selectedSlogan || 'No King as God';\n      bus.id = saveData.selectedBusId || 'RUSTIC_VAN';`
);

fs.writeFileSync(appPath, appContent);
console.log('App.tsx integrated with useGameSave');
