const fs = require('fs');

let dealer = fs.readFileSync('src/components/Dealership.tsx', 'utf8');
dealer = dealer.replace(
  '// End of standard vehicles',
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
    id: 'POLICE_CAR',
    name: 'NPF Patrol Vehicle',
    description: 'They cant arrest you if you are them. Sirens clear the road.',
    priceNaira: 15000000,
    baseStats: { speed: 95, durability: 100, comfort: 50 },
    maxPassengers: 4,
    colorHex: '#0f172a'
  },
  {
    id: 'ARMY_JEEP',
    name: 'KIA KM420 Jeep',
    description: 'Military Grade. Touts run away from this.',
    priceNaira: 25000000,
    baseStats: { speed: 95, durability: 100, comfort: 100 },
    maxPassengers: 4,
    colorHex: '#064e3b'
  },
  // End of standard vehicles`
);

fs.writeFileSync('src/components/Dealership.tsx', dealer);
console.log('Dealership components updated');
