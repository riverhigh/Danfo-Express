const fs = require('fs');

let config = fs.readFileSync('src/game/config.ts', 'utf8');

const newVehicles = `
  KEKE_NAPEP: {
    id: 'KEKE_NAPEP',
    name: 'Keke Maruwa',
    slogan: 'God Dey',
    heat: 30,
    fuelPercent: 100,
    doorState: 'CLOSED',
    passengers: [],
    upgrades: { ...DEFAULT_UPGRADES }
  },
  HONDA_CIVIC: {
    id: 'HONDA_CIVIC',
    name: 'Honda Civic EG6',
    slogan: 'VTEC Kicked In',
    heat: 15,
    fuelPercent: 100,
    doorState: 'CLOSED',
    passengers: [],
    upgrades: { ...DEFAULT_UPGRADES }
  },
  POLICE_CAR: {
    id: 'POLICE_CAR',
    name: 'NPF Patrol Vehicle',
    slogan: 'To Serve And Protect',
    heat: 5,
    fuelPercent: 100,
    doorState: 'CLOSED',
    passengers: [],
    upgrades: { ...DEFAULT_UPGRADES }
  },
  ARMY_JEEP: {
    id: 'ARMY_JEEP',
    name: 'KIA KM420 Jeep',
    slogan: 'Clear Road',
    heat: 5,
    fuelPercent: 100,
    doorState: 'CLOSED',
    passengers: [],
    upgrades: { ...DEFAULT_UPGRADES }
  },
  TOYOTA_TOWNACE: {
    id: 'TOYOTA_TOWNACE',
    name: 'Toyota Townace',
    slogan: 'Hustle Hard',
    heat: 20,
    fuelPercent: 100,
    doorState: 'CLOSED',
    passengers: [],
    upgrades: { ...DEFAULT_UPGRADES }
  }
};`;

config = config.replace('};', newVehicles);
fs.writeFileSync('src/game/config.ts', config);
console.log('Config updated');

