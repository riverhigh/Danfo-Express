const fs = require('fs');

// Fix config.ts
let config = fs.readFileSync('src/game/config.ts', 'utf8');
// Replace DEFAULT_UPGRADES with an inline default object
const defaultUpgradesStr = `{
      loudHorn: false,
      musicalHorn: false,
      ledLights: false,
      leatherSeats: false,
      soundSystem: false,
      engineTuning: false,
      tintedWindows: false,
      alloys: false
    }`;

config = config.replace(/\{ \.\.\.DEFAULT_UPGRADES \}/g, defaultUpgradesStr);

// Fix the missing Bus properties by copying a base object structure instead of doing it manually,
// or just adding the missing fields:
const missingFields = `speed: 0,
    maxSpeed: 100,
    acceleration: 5,
    handling: 5,
    durability: 100,
    capacity: 14,
    condition: 100,
    mileage: 0,
    color: '#ffcc00',`;

config = config.replace(/id: 'KEKE_NAPEP',/g, missingFields + '\n    id: \'KEKE_NAPEP\',');
config = config.replace(/id: 'HONDA_CIVIC',/g, missingFields + '\n    id: \'HONDA_CIVIC\',');
config = config.replace(/id: 'POLICE_CAR',/g, missingFields + '\n    id: \'POLICE_CAR\',');
config = config.replace(/id: 'ARMY_JEEP',/g, missingFields + '\n    id: \'ARMY_JEEP\',');
config = config.replace(/id: 'TOYOTA_TOWNACE',/g, missingFields + '\n    id: \'TOYOTA_TOWNACE\',');

fs.writeFileSync('src/game/config.ts', config);
console.log('Config fixed');

// Fix Dealership.tsx
let dealer = fs.readFileSync('src/components/Dealership.tsx', 'utf8');
dealer = dealer.replace(/priceNaira:/g, 'price:');
fs.writeFileSync('src/components/Dealership.tsx', dealer);
console.log('Dealership fixed');
