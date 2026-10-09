const fs = require('fs');

// 1. Update Game Types
let types = fs.readFileSync('src/types/game.ts', 'utf8');
types = types.replace(
  "export type BusModelId = 'RUSTIC_VAN' | 'TURBO_SPRINTER' | 'HIGH_RISER_COASTER';",
  "export type BusModelId = 'RUSTIC_VAN' | 'TURBO_SPRINTER' | 'HIGH_RISER_COASTER' | 'KEKE_NAPEP' | 'HONDA_CIVIC' | 'TOYOTA_TOWNACE' | 'KIA_CARNIVAL' | 'TOYOTA_FORTUNER' | 'POLICE_CAR' | 'ARMY_JEEP';"
);
fs.writeFileSync('src/types/game.ts', types);
console.log('Types updated');

// 2. Update Dealership data
let dealer = fs.readFileSync('src/game/dealership.ts', 'utf8');
dealer = dealer.replace(
  '];',
  `
  {
    id: 'KEKE_NAPEP',
    name: 'Keke Maruwa (Tricycle)',
    description: 'Weave through Lagos traffic like water. Low capacity, but insane agility.',
    priceNaira: 450000,
    baseStats: { speed: 40, durability: 30, comfort: 20 },
    maxPassengers: 3,
    colorHex: '#facc15'
  },
  {
    id: 'HONDA_CIVIC',
    name: 'Honda Civic EG6',
    description: 'Fast, sleek, perfect for dropping VIP commuters.',
    priceNaira: 1200000,
    baseStats: { speed: 85, durability: 50, comfort: 75 },
    maxPassengers: 4,
    colorHex: '#1e3a8a'
  },
  {
    id: 'TOYOTA_TOWNACE',
    name: 'Toyota Townace',
    description: 'Mid-sized transport. Reliable money-maker.',
    priceNaira: 2500000,
    baseStats: { speed: 65, durability: 70, comfort: 60 },
    maxPassengers: 10,
    colorHex: '#ffffff'
  },
  {
    id: 'TOYOTA_FORTUNER',
    name: 'Toyota Fortuner VIP',
    description: 'Lagos Big Boy status. Premium fares only.',
    priceNaira: 8500000,
    baseStats: { speed: 90, durability: 95, comfort: 100 },
    maxPassengers: 6,
    colorHex: '#000000'
  },
  {
    id: 'POLICE_CAR',
    name: 'NPF Patrol Vehicle',
    description: 'They cant arrest you if you are them. Sirens clear the road.',
    priceNaira: 15000000,
    baseStats: { speed: 95, durability: 100, comfort: 50 },
    maxPassengers: 4,
    colorHex: '#0f172a'
  }
];`
);
fs.writeFileSync('src/game/dealership.ts', dealer);
console.log('Dealership updated');
