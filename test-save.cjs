const fs = require('fs');

const saveData = {
  walletNaira: 5000,
  streetCred: 10,
  inventory: [],
  selectedBusId: 'DANFO_504',
  selectedShiftId: 'MORNING_RUSH',
  selectedSlogan: 'Omo Iya',
  ownedVehicles: ['DANFO_504'],
  activeMissionId: null,
};

console.log(JSON.stringify(saveData));
