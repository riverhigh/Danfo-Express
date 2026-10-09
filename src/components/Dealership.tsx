import React, { useState } from 'react';
import { Car, Zap, X, Star, ShoppingCart, CheckCircle2, Lock } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface Vehicle {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  type: 'DANFO' | 'SCOOTER' | 'CAR';
  icon: string;
  badge: string;
  maxSpeed: number;
  handling: number;
  fuelEfficiency: number; // 1-5 stars
  description: string;
  color: string;
  isElectric?: boolean;
  unlockCred?: number; // Street cred required
}

const VEHICLES: Vehicle[] = [
  // --- DANFOS ---
  {
    id: 'RUSTIC_VAN',
    name: 'Classic Danfo 504',
    subtitle: 'The Lagos Legend',
    price: 0,
    type: 'DANFO',
    icon: '🚌',
    badge: 'STARTER',
    maxSpeed: 80,
    handling: 3,
    fuelEfficiency: 2,
    description: 'The original yellow beast. Held together by faith, prayer, and juju. Already in your possession.',
    color: 'from-amber-900 to-stone-900',
  },
  {
    id: 'SHARP_DANFO',
    name: 'Super Danfo Hiace',
    subtitle: 'Toyota Power',
    price: 185000,
    type: 'DANFO',
    icon: '🚐',
    badge: 'UPGRADED',
    maxSpeed: 105,
    handling: 4,
    fuelEfficiency: 3,
    description: 'Refurbished 2005 Hiace with full AC, new tyres and turbo engine. Passengers pay premium.',
    color: 'from-amber-700 to-amber-900',
    unlockCred: 500,
  },
  {
    id: 'OSHODI_BEAST',
    name: 'Oshodi Beast (Coaster)',
    subtitle: 'The Route King',
    price: 450000,
    type: 'DANFO',
    icon: '🚍',
    badge: 'ELITE',
    maxSpeed: 95,
    handling: 3,
    fuelEfficiency: 2,
    description: 'Full-size 30-seater bus. More passengers, bigger fares, bigger bribes. Chairman level.',
    color: 'from-yellow-700 to-amber-900',
    unlockCred: 1000,
  },

  // --- ELECTRIC SCOOTERS ---
  {
    id: 'KEKE_EV',
    name: 'Keke EV 3-Wheeler',
    subtitle: 'Silent Napep',
    price: 95000,
    type: 'SCOOTER',
    icon: '🛺',
    badge: 'ECO',
    maxSpeed: 60,
    handling: 5,
    fuelEfficiency: 5,
    description: 'Electric Keke Napep. Zero fuel cost, zero emissions. Perfect for inner city runs. Charge at home.',
    color: 'from-emerald-800 to-teal-900',
    isElectric: true,
  },
  {
    id: 'BOLT_RIDE',
    name: 'Honda EV Scooter',
    subtitle: 'Lagos Rider',
    price: 65000,
    type: 'SCOOTER',
    icon: '🛵',
    badge: 'DAILY',
    maxSpeed: 75,
    handling: 5,
    fuelEfficiency: 5,
    description: 'Fast electric delivery scooter. Navigate traffic, do Bolt Food deliveries between shifts.',
    color: 'from-sky-800 to-blue-900',
    isElectric: true,
  },

  // --- PRIVATE CARS (Personal vehicles - off duty life) ---
  {
    id: 'TOKUNBO_CRV',
    name: 'Honda CRV Tokunbo',
    subtitle: '2012 Foreign Used',
    price: 3200000,
    type: 'CAR',
    icon: '🚙',
    badge: 'ASPIRE',
    maxSpeed: 160,
    handling: 4,
    fuelEfficiency: 3,
    description: 'The Lagos dream car. Take wife to Lekki wedding in style. LASTMA won\'t harass you.',
    color: 'from-slate-700 to-stone-900',
    unlockCred: 2000,
  },
  {
    id: 'BENZ_E',
    name: 'Mercedes E-Class',
    subtitle: 'Eko Millionaire',
    price: 12000000,
    type: 'CAR',
    icon: '🚘',
    badge: 'MOGUL',
    maxSpeed: 220,
    handling: 5,
    fuelEfficiency: 3,
    description: 'You made it. Drive past Oshodi and your old parking spot in full air conditioning.',
    color: 'from-zinc-700 to-black',
    unlockCred: 5000,
  },
  {
    id: 'KEKE_NAPEP',
    name: 'Keke Maruwa',
    subtitle: 'Agile Tricycle',
    price: 450000,
    type: 'SCOOTER' as const,
    icon: '🛺',
    badge: 'AGILE',
    maxSpeed: 70,
    handling: 5,
    fuelEfficiency: 5,
    description: 'Weave through Lagos traffic like water. Low capacity, insane agility.',
    color: 'from-yellow-600 to-amber-700',
  },
  {
    id: 'HONDA_CIVIC',
    name: 'Honda Civic EG6',
    subtitle: 'VTEC Kicked In Yo',
    price: 1200000,
    type: 'CAR' as const,
    icon: '🚗',
    badge: 'SPORT',
    maxSpeed: 140,
    handling: 5,
    fuelEfficiency: 3,
    description: 'Fast, sleek, perfect for dropping VIP commuters across the island.',
    color: 'from-blue-800 to-indigo-900',
  },
  {
    id: 'TOYOTA_TOWNACE',
    name: 'Toyota Townace GL',
    subtitle: 'Mid-Capacity Workhorse',
    price: 2500000,
    type: 'DANFO' as const,
    icon: '🚐',
    badge: 'RELIABLE',
    maxSpeed: 95,
    handling: 3,
    fuelEfficiency: 3,
    description: 'Mid-sized transport. 10-seater. Reliable Lagos money-maker.',
    color: 'from-white to-stone-200',
  },
  {
    id: 'POLICE_CAR',
    name: 'NPF Patrol Vehicle',
    subtitle: 'Na Police Dey Here',
    price: 15000000,
    type: 'CAR' as const,
    icon: '🚔',
    badge: 'AUTHORITY',
    maxSpeed: 160,
    handling: 4,
    fuelEfficiency: 2,
    description: 'Sirens clear the road. Nobody go touch you.',
    color: 'from-slate-900 to-stone-800',
    unlockCred: 3000,
  },
  {
    id: 'ARMY_JEEP',
    name: 'KIA KM420 Jeep',
    subtitle: 'Military Grade',
    price: 25000000,
    type: 'CAR' as const,
    icon: '🪖',
    badge: 'ELITE',
    maxSpeed: 130,
    handling: 4,
    fuelEfficiency: 1,
    description: 'Touts and LASTMA scatter when they see this. Unstoppable.',
    color: 'from-green-900 to-emerald-950',
    unlockCred: 8000,
  },
];

const StarRating = ({ count }: { count: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`w-3 h-3 ${i <= count ? 'text-amber-400 fill-amber-400' : 'text-stone-700'}`} />
    ))}
  </div>
);

interface DealershipProps {
  isOpen: boolean;
  onClose: () => void;
  walletNaira: number;
  streetCred: number;
  ownedVehicles: string[];
  onPurchase: (vehicle: Vehicle) => void;
}

export const Dealership: React.FC<DealershipProps> = ({
  isOpen, onClose, walletNaira, streetCred, ownedVehicles, onPurchase
}) => {
  const [activeTab, setActiveTab] = useState<'DANFO' | 'SCOOTER' | 'CAR'>('DANFO');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showPurchaseAnim, setShowPurchaseAnim] = useState(false);

  if (!isOpen) return null;

  const handleBuy = (vehicle: Vehicle) => {
    if (walletNaira < vehicle.price) return;
    if (vehicle.unlockCred && streetCred < vehicle.unlockCred) return;
    soundEngine.playUpgradeChime();
    onPurchase(vehicle);
    setShowPurchaseAnim(true);
    setTimeout(() => {
      setShowPurchaseAnim(false);
      setSelectedVehicle(null);
    }, 1800);
  };

  const displayVehicles = VEHICLES.filter(v => v.type === activeTab);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Dealership Header - "You've driven into the lot" */}
      <div className="relative h-28 bg-gradient-to-b from-stone-900 to-stone-950 border-b border-stone-700 flex flex-col items-center justify-center overflow-hidden">
        {/* Showroom lights */}
        <div className="absolute inset-0 flex justify-around items-start pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-0.5 h-full bg-gradient-to-b from-amber-300/20 to-transparent mt-2" />
          ))}
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-400 hover:text-white z-10">
          <X className="w-5 h-5" />
        </button>
        <span className="text-3xl mb-1">🏪</span>
        <h1 className="font-black text-lg text-amber-400 font-['Bungee']">LADIPO AUTO SALES</h1>
        <p className="text-[10px] text-stone-400 font-mono">Tokunbo • New • Electric — Best Prices in Lagos</p>
      </div>

      {/* Tab selector */}
      <div className="flex items-center gap-1 px-3 py-2 bg-stone-950 border-b border-stone-800">
        {(['DANFO', 'SCOOTER', 'CAR'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedVehicle(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-amber-400 text-stone-950' : 'bg-stone-900 text-stone-400'}`}
          >
            {tab === 'DANFO' ? '🚌 Danfo' : tab === 'SCOOTER' ? '🛵 Scooter' : '🚗 Car'}
          </button>
        ))}
      </div>

      {/* Vehicle Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {displayVehicles.map(vehicle => {
          const isOwned = ownedVehicles.includes(vehicle.id);
          const canAfford = walletNaira >= vehicle.price;
          const hasCredReq = !vehicle.unlockCred || streetCred >= vehicle.unlockCred;
          const isLocked = !hasCredReq;
          const isSelected = selectedVehicle?.id === vehicle.id;

          return (
            <div
              key={vehicle.id}
              onClick={() => !isOwned && setSelectedVehicle(isSelected ? null : vehicle)}
              className={`rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
                isOwned ? 'border-emerald-500/60 opacity-75' :
                isSelected ? 'border-amber-400 shadow-lg shadow-amber-400/10' :
                isLocked ? 'border-stone-800 opacity-60' :
                'border-stone-700 hover:border-stone-500'
              }`}
            >
              <div className={`bg-gradient-to-r ${vehicle.color} p-4 flex items-center gap-4`}>
                <span className="text-5xl shrink-0">{vehicle.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-white text-sm font-['Bungee']">{vehicle.name}</h3>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      vehicle.badge === 'STARTER' ? 'bg-stone-700 text-stone-300' :
                      vehicle.badge === 'ECO' ? 'bg-emerald-600 text-white' :
                      vehicle.badge === 'ELITE' || vehicle.badge === 'MOGUL' ? 'bg-purple-600 text-white' :
                      'bg-amber-600 text-white'
                    }`}>{vehicle.badge}</span>
                    {vehicle.isElectric && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-600 text-white rounded">⚡ EV</span>}
                  </div>
                  <p className="text-stone-300 text-[11px]">{vehicle.subtitle}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono font-black text-sm text-amber-400">
                      {vehicle.price === 0 ? 'FREE' : `₦${vehicle.price.toLocaleString()}`}
                    </span>
                    {vehicle.unlockCred && (
                      <span className="text-[9px] text-purple-300 font-mono">{vehicle.unlockCred} Cred req.</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right space-y-1">
                  {isOwned && <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold"><CheckCircle2 className="w-3 h-3" />OWNED</div>}
                  {isLocked && !isOwned && <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold"><Lock className="w-3 h-3" />LOCKED</div>}
                </div>
              </div>

              {/* Expanded detail panel */}
              {isSelected && !isOwned && (
                <div className="bg-stone-950 p-4 space-y-3 border-t border-stone-800 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-stone-300 leading-relaxed">{vehicle.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-stone-900 rounded-lg p-2 text-center">
                      <div className="text-stone-400 mb-1">Top Speed</div>
                      <div className="font-bold text-white">{vehicle.maxSpeed} km/h</div>
                    </div>
                    <div className="bg-stone-900 rounded-lg p-2 text-center">
                      <div className="text-stone-400 mb-1">Handling</div>
                      <StarRating count={vehicle.handling} />
                    </div>
                    <div className="bg-stone-900 rounded-lg p-2 text-center">
                      <div className="text-stone-400 mb-1">Fuel Effic.</div>
                      <StarRating count={vehicle.fuelEfficiency} />
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBuy(vehicle); }}
                    disabled={!canAfford || isLocked}
                    className={`w-full py-3 rounded-xl font-black text-sm font-['Bungee'] flex items-center justify-center gap-2 transition-all ${
                      !canAfford ? 'bg-stone-800 text-stone-500 cursor-not-allowed' :
                      isLocked ? 'bg-stone-800 text-stone-500 cursor-not-allowed' :
                      'bg-amber-400 hover:bg-amber-300 text-stone-950 active:scale-95'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {!canAfford ? `Need ₦${(vehicle.price - walletNaira).toLocaleString()} more` :
                     isLocked ? `Need ${vehicle.unlockCred} Street Cred` :
                     `BUY NOW — ₦${vehicle.price.toLocaleString()}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Purchase animation overlay */}
      {showPurchaseAnim && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in">
          <div className="text-center space-y-3">
            <div className="text-7xl animate-bounce">{selectedVehicle?.icon}</div>
            <h2 className="text-2xl font-black text-amber-400 font-['Bungee']">KEYS IN HAND!</h2>
            <p className="text-stone-300 text-sm">{selectedVehicle?.name} added to your garage!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export { VEHICLES };
