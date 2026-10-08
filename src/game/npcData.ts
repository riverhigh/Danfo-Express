export type NpcCategory = 'MARKET_WOMAN' | 'AREA_BOY' | 'MECHANIC' | 'POLICE_LASTMA' | 'COMMUTER' | 'STREET_HAWKER';

export interface LagosNpc {
  id: string;
  name: string;
  profession: string;
  category: NpcCategory;
  avatar: string;
  locationHint: string;
  greeting: string;
  description: string;
  dialogueLines: string[];
  settleCostNaira?: number;
  haggleMinNaira?: number;
  haggleType: 'PAY_SETTLEMENT' | 'BUY_GOODS' | 'REPAIR_BUS' | 'FARE_NEGOTIATION' | 'BRIBE_CHECKPOINT';
  reward: {
    streetCred?: number;
    stamina?: number;
    cashNaira?: number;
    durability?: number;
  };
}

export const LAGOS_NPCS: LagosNpc[] = [
  // --- 1. MARKET WOMEN (10 NPCs) ---
  {
    id: 'npc-mama-ngozi',
    name: 'Mama Ngozi',
    profession: 'Abuja Yam Wholesaler',
    category: 'MARKET_WOMAN',
    avatar: '👩🏾‍🌾',
    locationHint: 'Oshodi Market Underbridge',
    greeting: 'Driver! Park well make I load 4 heavy tubers of Abuja yam for boot!',
    description: 'Energetic trader with heavy yam tubers tied in raffia sacks.',
    dialogueLines: [
      'Bamidele my customer! Abuja yam sweet today. ₦2,500 each!',
      'Haba driver, you want pay ₦1,800 for export quality yam? Oya bring ₦2,000 last!',
      'God bless your steering wheel as you carry my load.'
    ],
    settleCostNaira: 2500,
    haggleMinNaira: 1900,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 50, streetCred: 10 }
  },
  {
    id: 'npc-iya-basira',
    name: 'Iya Basira',
    profession: 'Smoked Catfish Trader',
    category: 'MARKET_WOMAN',
    avatar: '👩🏾‍🍳',
    locationHint: 'Ojuelegba Market',
    greeting: 'Driver, don\'t crush my fish tray o! Oya help me carry 2 baskets to CMS.',
    description: 'Renowned fish merchant with aromatic smoked dried catfish.',
    dialogueLines: [
      'My fish is fresh from Epe water! Normal fare na ₦1,200 plus luggage.',
      'You say ₦800? Even agbero dey respect my fish price o! Oya pay ₦1,000.',
      'Take two pieces of fish for your journey!'
    ],
    settleCostNaira: 1200,
    haggleMinNaira: 900,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 1100, streetCred: 12 }
  },
  {
    id: 'npc-alhaja-kudirat',
    name: 'Alhaja Kudirat',
    profession: 'Lace & Gele Fabric Merchant',
    category: 'MARKET_WOMAN',
    avatar: '🧕🏾',
    locationHint: 'Idumota / CMS Terminal',
    greeting: 'Salam alaikum driver! Careful with my gold embroidery lace bags!',
    description: 'Wealthy textile businesswoman travelling in immaculate white damask lace.',
    dialogueLines: [
      'I\'m going to high society wedding on Victoria Island! Don\'t stain my lace!',
      'I will pay double fare ₦2,000 if your Danfo seat doesn\'t have torn springs!',
      'Oya conductor, take this extra ₦500 tip for handling my luggage with care.'
    ],
    settleCostNaira: 2000,
    haggleMinNaira: 1500,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 2000, streetCred: 25 }
  },
  {
    id: 'npc-mama-chioma',
    name: 'Mama Chioma',
    profession: 'Provision & Beverage Merchant',
    category: 'MARKET_WOMAN',
    avatar: '👩🏾',
    locationHint: 'Maryland Junction',
    greeting: 'Driver! Carton of Peak milk and Milo for your children dey here!',
    description: 'Runs wholesale provision depot near Maryland roundabout.',
    dialogueLines: [
      'Wholesale tin milk carton na ₦4,500. Fuel is high, food is high!',
      'Because you be regular driver on this route, take am for ₦3,800!',
      'Make sure you drink tea with milk so stamina go high for Third Mainland!'
    ],
    settleCostNaira: 4500,
    haggleMinNaira: 3700,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 65, streetCred: 15 }
  },
  {
    id: 'npc-iya-risi',
    name: 'Iya Risi',
    profession: 'Ripe Plantain (Dodo) Seller',
    category: 'MARKET_WOMAN',
    avatar: '👵🏾',
    locationHint: 'Anthony Village Bus Stop',
    greeting: 'E kaasan o! Sweet ripe bunch of plantain fresh from farm!',
    description: 'Warm elderly woman selling bunches of yellow sweet plantains.',
    dialogueLines: [
      'This dodo will fry sweet with eggs tonight! ₦2,200 for the full bunch!',
      'Oya bring ₦1,700 driver, make market move fast fast.',
      'A dupe o! May your Danfo never hit pothole!'
    ],
    settleCostNaira: 2200,
    haggleMinNaira: 1600,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 45, streetCred: 8 }
  },
  {
    id: 'npc-mama-titi',
    name: 'Mama Titi',
    profession: 'Pepper & Tomato Basket Dealer',
    category: 'MARKET_WOMAN',
    avatar: '👩🏾',
    locationHint: 'Mile 12 Express Depot',
    greeting: 'Driver! 3 big raffia baskets of Rodo and Tatase for your boot!',
    description: 'Shrewd pepper distributor commanding the Mile 12 loading bay.',
    dialogueLines: [
      'Fresh Scotch bonnet pepper from the North! ₦3,000 carriage fee.',
      'Driver, no tear my basket o! Pay ₦2,400 and we deal.',
      'Safe trip to Island, make traffic no catch you.'
    ],
    settleCostNaira: 3000,
    haggleMinNaira: 2300,
    haggleType: 'BUY_GOODS',
    reward: { cashNaira: 2600, streetCred: 15 }
  },
  {
    id: 'npc-sister-folake',
    name: 'Sister Folake',
    profession: 'Frozen Foods & Chicken Merchant',
    category: 'MARKET_WOMAN',
    avatar: '👩🏾‍🦱',
    locationHint: 'Ikeja Along Stop',
    greeting: 'Driver hurry! My ice in the cooler is melting in this afternoon sun!',
    description: 'Fast-talking trader transporting crates of frozen poultry.',
    dialogueLines: [
      'Drop me at Oshodi fast before the ice block finish! I pay ₦1,500.',
      'Speed pass the traffic, I add ₦500 bonus for conductor.',
      'Sharp driver! Your engine sound well.'
    ],
    settleCostNaira: 1500,
    haggleMinNaira: 1200,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 1800, streetCred: 14 }
  },
  {
    id: 'npc-iya-ibeji',
    name: 'Iya Ibeji',
    profession: 'Palm Oil Drum Retailer',
    category: 'MARKET_WOMAN',
    avatar: '🧕🏾',
    locationHint: 'Obalende Terminal',
    greeting: 'Driver, hold boot door up carefully, no let red oil spill!',
    description: 'Mother of twins shipping 25-liter yellow jerrycans of red palm oil.',
    dialogueLines: [
      'Pure Ondo red oil, zero water inside! ₦3,500 carriage.',
      'Settle me ₦2,800 and I enter your front seat beside you.',
      'Well done driver, you drive smooth.'
    ],
    settleCostNaira: 3500,
    haggleMinNaira: 2700,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 3200, streetCred: 18 }
  },
  {
    id: 'npc-mama-esther',
    name: 'Mama Esther',
    profession: 'Rice & Beans Bag Merchant',
    category: 'MARKET_WOMAN',
    avatar: '👩🏾',
    locationHint: 'CMS Waterfront Jetty',
    greeting: 'Driver! 50kg bag of short grain rice for my customer at Ikeja.',
    description: 'Wholesaler dealing with grain distribution across Lagos terminals.',
    dialogueLines: [
      'Luggage fee is ₦2,000 straight. Heavy duty!',
      'Haggle down to ₦1,600 and I give your conductor a loaf of bread.',
      'Driver, boot door close tight? Good!'
    ],
    settleCostNaira: 2000,
    haggleMinNaira: 1500,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 1900, streetCred: 20 }
  },
  {
    id: 'npc-iya-segun',
    name: 'Iya Segun',
    profession: 'Herbal Agbo & Honey Specialist',
    category: 'MARKET_WOMAN',
    avatar: '👵🏾',
    locationHint: 'Yaba Concourse',
    greeting: 'Driver! Your eye look red! Drink original Agbo Jedi for stamina!',
    description: 'Traditional apothecary carrying vintage glass bottles of bitter herbal remedies.',
    dialogueLines: [
      'One bottle of Agbo Jedi and honey na ₦1,000! Driver back pain will disappear!',
      'Bring ₦700 make I bless you with cold herbal drink.',
      'You will drive all night without sleep!'
    ],
    settleCostNaira: 1000,
    haggleMinNaira: 700,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 40, streetCred: 10 }
  },

  // --- 2. AREA BOYS & AGBEROS (10 NPCs) ---
  {
    id: 'npc-scorpion-oshodi',
    name: 'Scorpion of Oshodi',
    profession: 'NURTW Park Enforcer',
    category: 'AREA_BOY',
    avatar: '🧢',
    locationHint: 'Oshodi Underbridge',
    greeting: 'Owo Da?! Drop ₦1,000 for parking space or your side mirror go fly!',
    description: 'Muscular toll collector rocking stained white singlet and heavy brass ring.',
    dialogueLines: [
      'Chairman don issue new day ticket! ₦1,000 flat, no stories!',
      'You dey form big boy? Settle ₦600 sharp before I deflate your front tyre!',
      'Respect! Hustle must pay, clear road!'
    ],
    settleCostNaira: 1000,
    haggleMinNaira: 500,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 30 }
  },
  {
    id: 'npc-baba-fryo',
    name: 'Baba Fryo (Notice Me)',
    profession: 'Agbero Junction Chairman',
    category: 'AREA_BOY',
    avatar: '🕶️',
    locationHint: 'Ojuelegba Flyover',
    greeting: 'Senior driver! Drop union money make street smooth for you today!',
    description: 'Infamous area boy wearing dark shades and whistle around his neck.',
    dialogueLines: [
      'Ojuelegba is under my command! Give boys ₦800 refreshment fee!',
      'Aha, my brother! Pay ₦500 make I whistle for you pass traffic!',
      'Gbe body e! High speed driver, I see you!'
    ],
    settleCostNaira: 800,
    haggleMinNaira: 400,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 25 }
  },
  {
    id: 'npc-killer-bean',
    name: 'Killer Bean',
    profession: 'Yaba Night Toll Collector',
    category: 'AREA_BOY',
    avatar: '🥊',
    locationHint: 'Yaba / Tejuosho Cross',
    greeting: 'Night shift is dangerous! Settle security fee ₦700 before you load!',
    description: 'No-nonsense night boy collecting dues in the dark.',
    dialogueLines: [
      'No Danfo leaves Yaba without night dues! ₦700 or step down!',
      'You say you know Chairman Rasaki? Pay ₦450 last!',
      'Safe movement, watch out for police at bridge!'
    ],
    settleCostNaira: 700,
    haggleMinNaira: 400,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 20 }
  },
  {
    id: 'npc-dollar-boy',
    name: 'Dollar Boy',
    profession: 'CMS Waterfront Agbero',
    category: 'AREA_BOY',
    avatar: '💰',
    locationHint: 'CMS Marina Terminal',
    greeting: 'Boss driver! Island route is pure gold! Settle your boys ₦1,200!',
    description: 'Flashy area boy boasting dollar print bandana.',
    dialogueLines: [
      'All Danfo coming from Mainland must drop ₦1,200 for jetty maintenance!',
      'Haggle with me? ₦800 and I personally help pack boot for you.',
      'Oya forward movement!'
    ],
    settleCostNaira: 1200,
    haggleMinNaira: 700,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 35 }
  },
  {
    id: 'npc-tiger-anthony',
    name: 'Tiger of Anthony',
    profession: 'Expressway Agbero Scout',
    category: 'AREA_BOY',
    avatar: '🐅',
    locationHint: 'Anthony Interchange',
    greeting: 'Stop there! Drop ₦500 for state ticket or you no go touch Maryland!',
    description: 'Quick on his feet, carries bundle of colored paper union receipts.',
    dialogueLines: [
      'Yellow paper receipt is ₦500! Without it LASTMA go catch you ahead!',
      'Pay ₦350 and take the stamp!',
      'Ride on brother!'
    ],
    settleCostNaira: 500,
    haggleMinNaira: 300,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 18 }
  },
  {
    id: 'npc-shina-rambo-jnr',
    name: 'Shina Junior',
    profession: 'Ikeja Bus Stop Route Master',
    category: 'AREA_BOY',
    avatar: '🧢',
    locationHint: 'Ikeja Along Rail Line',
    greeting: 'Oya drop passenger here! Settle ₦600 loading fee right now!',
    description: 'Loud conductor-turned-enforcer controlling the rail line stop.',
    dialogueLines: [
      'Passenger rush is mad today! Settle ₦600 make I pack full bus for you!',
      'Bring ₦400, I go shout CMS CMS make 14 passengers rush enter!',
      'Load enter! Slap the body gbam-gbam!'
    ],
    settleCostNaira: 600,
    haggleMinNaira: 350,
    haggleType: 'PAY_SETTLEMENT',
    reward: { cashNaira: 2800, streetCred: 22 }
  },
  {
    id: 'npc-jagaban-boy',
    name: 'Jagaban Boy',
    profession: 'Third Mainland Bridge Gatekeeper',
    category: 'AREA_BOY',
    avatar: '🦁',
    locationHint: 'Adekunle Inflow Point',
    greeting: 'Third Mainland expressway is open! Pay ₦900 bridge entry toll!',
    description: 'Commands the on-ramp to Nigeria\'s longest expressway bridge.',
    dialogueLines: [
      'Expressway is moving 80km/h! ₦900 for hassle-free lane clearance.',
      'Settle ₦600 make I guide you pass broken down trailer.',
      'Hit the gas! Fly pass third mainland!'
    ],
    settleCostNaira: 900,
    haggleMinNaira: 500,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 28 }
  },
  {
    id: 'npc-mc-junior',
    name: 'MC Olu Junior',
    profession: 'Chief Transport Union Representative',
    category: 'AREA_BOY',
    avatar: '👑',
    locationHint: 'National Stadium Surulere',
    greeting: 'Salute to the veteran driver! Daily branch ticket is ₦1,500!',
    description: 'High ranking union executive in customized gold and green union uniform.',
    dialogueLines: [
      'Official daily union levy: ₦1,500 with stamped barcode receipt.',
      'As our veteran brother, pay ₦1,000 flat.',
      'Union stands with you! Respect!'
    ],
    settleCostNaira: 1500,
    haggleMinNaira: 1000,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 50 }
  },
  {
    id: 'npc-small-doctor',
    name: 'Small Hazard',
    profession: 'Street Spotter & Agbero Whistle Blower',
    category: 'AREA_BOY',
    avatar: '📢',
    locationHint: 'Palmgrove Bus Stop',
    greeting: 'LASTMA ahead o! Drop ₦300 make I show you the inner bypass street!',
    description: 'Skinny youth with whistle who monitors traffic police ambushes.',
    dialogueLines: [
      'LASTMA towing van dey hide under pedestrian bridge! Pay ₦300 for intel!',
      'Bring ₦200 sharp, divert through service lane!',
      'You safe now driver! Accelerate!'
    ],
    settleCostNaira: 300,
    haggleMinNaira: 150,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 20 }
  },
  {
    id: 'npc-bullet-head',
    name: 'Bullet Head',
    profession: 'Obalende Garage Enforcer',
    category: 'AREA_BOY',
    avatar: '🪖',
    locationHint: 'Obalende Roundabout',
    greeting: 'Obalende final bus stop! Drop ₦800 terminal clearing fee!',
    description: 'Veteran garage boy with scarred eyebrow and intimidating glare.',
    dialogueLines: [
      'Every bus emptying passengers must drop ₦800.',
      'Pay ₦500, no time to argue in the sun.',
      'Offload your commuters, park well!'
    ],
    settleCostNaira: 800,
    haggleMinNaira: 450,
    haggleType: 'PAY_SETTLEMENT',
    reward: { streetCred: 24 }
  },

  // --- 3. MECHANICS & AUTO SPECIALISTS (8 NPCs) ---
  {
    id: 'npc-baba-kazeem',
    name: 'Baba Kazeem',
    profession: 'Danfo Chief Engine Mechanic',
    category: 'MECHANIC',
    avatar: '👨🏾‍🔧',
    locationHint: 'Ladipo Auto Market / Anthony',
    greeting: 'Driver! Your cylinder gasket dey smoke! Pull over make I tighten am!',
    description: 'Veteran engine specialist in grease-covered blue boilersuit.',
    dialogueLines: [
      'Full top-cylinder overhaul and valve tuning: ₦4,500. Restores 100% durability!',
      'Haba Bamidele! Settle ₦3,500 and I will also blow your carburettor clean!',
      'Engine is roaring sweet like brand new Tokunbo engine now!'
    ],
    settleCostNaira: 4500,
    haggleMinNaira: 3200,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 40, streetCred: 25 }
  },
  {
    id: 'npc-sunday-rewire',
    name: 'Sunday Rewire',
    profession: 'Auto Electrician & Alternator Guru',
    category: 'MECHANIC',
    avatar: '⚡',
    locationHint: 'Oshodi Workshop Corner',
    greeting: 'Your headlights dey blink like Christmas light! Alternator belt loose!',
    description: 'Carries test bulbs and multimeter in his front pocket.',
    dialogueLines: [
      'Rewiring dashboard cluster and fixing dynamo charging: ₦3,000.',
      'Pay ₦2,200 make I fix headlights, wipers and battery terminal tight.',
      'Current is flowing solid! Your battery will never die.'
    ],
    settleCostNaira: 3000,
    haggleMinNaira: 2000,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 30, streetCred: 20 }
  },
  {
    id: 'npc-rasheed-vulcanizer',
    name: 'Rasheed Vulcanizer',
    profession: 'Roadside Tyre Pumper & Puncture Specialist',
    category: 'MECHANIC',
    avatar: '🛞',
    locationHint: 'Maryland Flyover Shoulder',
    greeting: 'Driver! Your rear left tyre pressure low! Puncture go cause rollover!',
    description: 'Sitting next to roaring red diesel compressor and soapy water basin.',
    dialogueLines: [
      'Patching 2 punctures and pumping all 4 tyres to 45 PSI: ₦1,500.',
      'Bring ₦1,000 make I gauge all tyres with machine gauge.',
      'Tyres balanced! You fit take corner with 80 km/h now!'
    ],
    settleCostNaira: 1500,
    haggleMinNaira: 900,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 25, streetCred: 15 }
  },
  {
    id: 'npc-chinedu-parts',
    name: 'Chinedu Spare Parts',
    profession: 'German Tokunbo Brake Pad Importer',
    category: 'MECHANIC',
    avatar: '📦',
    locationHint: 'Ikeja Auto Line',
    greeting: 'Oga driver! Stop using wooden brake pads! Buy original ceramic pads!',
    description: 'Importer with shelves stacked with genuine imported bus brake disks.',
    dialogueLines: [
      'Original German brake pads: ₦5,000. Stops Danfo from 100km/h in 3 seconds!',
      'As we be brothers, bring ₦3,800 make I give you guarantee!',
      'Safety first o! Your brakes will grip like magnet.'
    ],
    settleCostNaira: 5000,
    haggleMinNaira: 3500,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 50, streetCred: 30 }
  },
  {
    id: 'npc-taofeek-radiator',
    name: 'Taofeek Radiator',
    profession: 'Brass Radiator Soldering & Coolant Specialist',
    category: 'MECHANIC',
    avatar: '🧯',
    locationHint: 'Ojuelegba Canal Bank',
    greeting: 'Danfo engine water boiling! Your radiator pipe has 3 pinholes!',
    description: 'Expert welder with gas torch soldering brass vehicle radiators.',
    dialogueLines: [
      'Soldering leakages and flushing radiator with green coolant: ₦2,800.',
      'Pay ₦2,000 and engine heat will never cross 70°C again!',
      'Clean water cooling installed! No more roadside boiling!'
    ],
    settleCostNaira: 2800,
    haggleMinNaira: 1800,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 35, streetCred: 20 }
  },
  {
    id: 'npc-kabiru-panel',
    name: 'Kabiru Panel Beater',
    profession: 'Chassis Straightening & Yellow Spray Painter',
    category: 'MECHANIC',
    avatar: '🔨',
    locationHint: 'CMS Marina Underpass',
    greeting: 'Your Danfo body get dent from trailer! Let me knock and spray am yellow!',
    description: 'Holds heavy rubber mallet and spray paint gun with yellow lacquer.',
    dialogueLines: [
      'Hammer out side dent and restore double black stripes: ₦3,500.',
      'Settle ₦2,500 make Danfo shine like brand new car from showroom!',
      'Fine yellow body! Passengers will love entering your bus.'
    ],
    settleCostNaira: 3500,
    haggleMinNaira: 2200,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 35, streetCred: 35 }
  },
  {
    id: 'npc-musa-battery',
    name: 'Musa Battery Charging',
    profession: 'Heavy 75Ah Battery Reconditioning',
    category: 'MECHANIC',
    avatar: '🔋',
    locationHint: 'Yaba Railway Crossing',
    greeting: 'Driver! Battery water dry! Danfo no go crank if you switch off engine!',
    description: 'Manages racks of sulfuric acid battery cells and charging clips.',
    dialogueLines: [
      'Acid top-up and boost rapid charge: ₦1,800.',
      'Bring ₦1,200 make I clamp am right now for 5 minutes.',
      'Full 12.8 Volts! Engine go fire at one crank!'
    ],
    settleCostNaira: 1800,
    haggleMinNaira: 1000,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 20, streetCred: 15 }
  },
  {
    id: 'npc-solomon-wiper',
    name: 'Solomon Glass & Wipers',
    profession: 'Windshield Tint & Heavy Wiper Installer',
    category: 'MECHANIC',
    avatar: '🌧️',
    locationHint: 'Anthony Interchange Express',
    greeting: 'Rain is coming! Your wipers are tearing! Buy silicone heavy wiper blades!',
    description: 'Specializes in windscreen anti-glare visors and heavy wiper rubber.',
    dialogueLines: [
      'Pair of heavy Bosch silicone wipers + rain repellent glass polish: ₦2,200.',
      'Bring ₦1,500, clear view during torrential Lagos flood guaranteed!',
      'Wipers fitted! Vision 100% in heavy downpour.'
    ],
    settleCostNaira: 2200,
    haggleMinNaira: 1400,
    haggleType: 'REPAIR_BUS',
    reward: { durability: 25, streetCred: 18 }
  },

  // --- 4. LAW ENFORCEMENT & TRAFFIC WARDENS (8 NPCs) ---
  {
    id: 'npc-officer-john',
    name: 'Officer John (Night Patrol)',
    profession: 'Nigeria Police Force Inspector',
    category: 'POLICE_LASTMA',
    avatar: '👮🏾‍♂️',
    locationHint: 'Third Mainland Bridge Checkpoint',
    greeting: 'Park well! License, roadworthiness, fire extinguisher and C-Caution!',
    description: 'Black uniform, reflective safety sash, AK-47 slung on shoulder.',
    dialogueLines: [
      'Driver, your headlights are too dim for expressway! Settle ₦2,000 or follow us to station!',
      'Haba oga police, we be family! Settle ₦1,000 for pure water and night kola.',
      'Drive carefully, watch your speed on the bridge!'
    ],
    settleCostNaira: 2000,
    haggleMinNaira: 800,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 40 }
  },
  {
    id: 'npc-officer-bimbo',
    name: 'Officer Bimbo (LASTMA)',
    profession: 'Lagos State Traffic Management Authority',
    category: 'POLICE_LASTMA',
    avatar: '👮🏾‍♀️',
    locationHint: 'Oshodi BRT Corridor',
    greeting: 'You encroached on yellow BRT lane! Towing van is turning around right now!',
    description: 'Crisp khaki and yellow LASTMA uniform with strict handheld radio.',
    dialogueLines: [
      'Impoundment ticket is ₦10,000! You crossed the lane marker!',
      'Please madam officer, passenger was emergency! Settle ₦2,500 on the spot.',
      'Warning issued! Next time don\'t touch BRT lane!'
    ],
    settleCostNaira: 5000,
    haggleMinNaira: 1800,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 35 }
  },
  {
    id: 'npc-sergeant-alabi',
    name: 'Sergeant Alabi (VIO)',
    profession: 'Vehicle Inspection Officer',
    category: 'POLICE_LASTMA',
    avatar: '📋',
    locationHint: 'Maryland Underpass',
    greeting: 'Testing handbrake and exhaust emission! Your smoke is too dark!',
    description: 'White polo and black trousers with clipboard checking car documents.',
    dialogueLines: [
      'Exhaust emission violation! ₦3,500 penalty.',
      'Settle ₦1,500 inspection clearance fee and we stamp your paper.',
      'Clear! Maintain your exhaust pipe.'
    ],
    settleCostNaira: 3500,
    haggleMinNaira: 1200,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 25 }
  },
  {
    id: 'npc-commander-tunde',
    name: 'Commander Tunde (FRSC)',
    profession: 'Federal Road Safety Corps Marshall',
    category: 'POLICE_LASTMA',
    avatar: '🎖️',
    locationHint: 'Lagos-Ibadan / Berger Gateway',
    greeting: 'Speed limit violation! You were clocking 88 km/h in a 60 zone!',
    description: 'Beige uniform, black beret, radar speed detection device in hand.',
    dialogueLines: [
      'Over-speeding fine: ₦4,000.',
      'Pay ₦2,000 safety education levy and receive safety flyer.',
      'Slow down! Speed thrills but kills!'
    ],
    settleCostNaira: 4000,
    haggleMinNaira: 1500,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 30 }
  },
  {
    id: 'npc-officer-godwin',
    name: 'Corporal Godwin (Mobile Police)',
    profession: 'MOPOL Squad Highway Patrol',
    category: 'POLICE_LASTMA',
    avatar: '👮🏾‍♂️',
    locationHint: 'Ojuelegba Underbridge',
    greeting: 'Halt! Boot open make we search for contraband!',
    description: 'Green camouflage uniform with bulletproof vest.',
    dialogueLines: [
      'Search operation in progress! Drop ₦1,500 for the checkpoint squad.',
      'Settle ₦800 for energy drinks for the squad.',
      'Clear! Proceed with your journey.'
    ],
    settleCostNaira: 1500,
    haggleMinNaira: 600,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 22 }
  },
  {
    id: 'npc-madam-amaka',
    name: 'Madam Amaka (Task Force)',
    profession: 'Lagos Environmental Task Force',
    category: 'POLICE_LASTMA',
    avatar: '👮🏾‍♀️',
    locationHint: 'Ikeja Along Terminal',
    greeting: 'Illegal passenger boarding on highway shoulder! That is an offense!',
    description: 'Stern task force enforcement coordinator.',
    dialogueLines: [
      'Shoulder boarding fee violation: ₦3,000.',
      'Settle ₦1,200 administrative clearance.',
      'Board passengers only in designated bays!'
    ],
    settleCostNaira: 3000,
    haggleMinNaira: 1100,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 28 }
  },
  {
    id: 'npc-officer-friday',
    name: 'Officer Friday (Night Detective)',
    profession: 'Special Anti-Robbery Plainclothes',
    category: 'POLICE_LASTMA',
    avatar: '🕵🏾‍♂️',
    locationHint: 'CMS Marina Waterfront',
    greeting: 'Driver, identify yourself and all 14 passengers on board!',
    description: 'Undercover officer wearing jacket with badge on belt.',
    dialogueLines: [
      'Late night manifest check! ₦2,500 clearance dues.',
      'Settle ₦1,000 for surveillance recharge card.',
      'Proceed safely driver.'
    ],
    settleCostNaira: 2500,
    haggleMinNaira: 900,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 32 }
  },
  {
    id: 'npc-traffic-warden-kehinde',
    name: 'Warden Kehinde (Yellow Fever)',
    profession: 'Metropolitan Traffic Warden',
    category: 'POLICE_LASTMA',
    avatar: '🚦',
    locationHint: 'Anthony Roundabout',
    greeting: 'Whistle blows! Stop! You didn\'t obey my hand signal!',
    description: 'Yellow and black striped sleeves dancing in the middle of traffic.',
    dialogueLines: [
      'Hand signal disobey fine: ₦1,800.',
      'Drop ₦700 for cold water under this hot sun.',
      'Oya pass! Step on gas!'
    ],
    settleCostNaira: 1800,
    haggleMinNaira: 600,
    haggleType: 'BRIBE_CHECKPOINT',
    reward: { streetCred: 20 }
  },

  // --- 5. COMMUTERS & CORPORATE PASSENGERS (8 NPCs) ---
  {
    id: 'npc-banker-segun',
    name: 'Segun (Investment Banker)',
    profession: 'Marina Senior Risk Analyst',
    category: 'COMMUTER',
    avatar: '💼',
    locationHint: 'CMS Marina Terminal',
    greeting: 'Driver! I have 9:00 AM board meeting on Broad Street! Fly through express!',
    description: 'Sharp navy blue suit, tie, leather laptop bag, Rolex watch.',
    dialogueLines: [
      'I will pay ₦1,500 if you reach Marina in under 6 minutes!',
      'Don\'t splash muddy water on my Italian shoes!',
      'Take ₦2,000 for your fast driving! You saved my career!'
    ],
    settleCostNaira: 1500,
    haggleMinNaira: 1000,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 2200, streetCred: 30 }
  },
  {
    id: 'npc-tech-bro-tobi',
    name: 'Tobi (Fintech Developer)',
    profession: 'Yaba Tech Hub Senior Engineer',
    category: 'COMMUTER',
    avatar: '💻',
    locationHint: 'Yaba / Herbert Macaulay',
    greeting: 'Driver, does your Danfo have phone charger? My battery is 4%!',
    description: 'Hoodie, wireless AirPods, mechanical keyboard sticking out of backpack.',
    dialogueLines: [
      'Going to Ikeja Tech Hub! Fare is ₦800.',
      'If you let me plug phone into your charger, I add ₦500 tip!',
      'Code pushed! Thanks for the ride boss!'
    ],
    settleCostNaira: 800,
    haggleMinNaira: 600,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 1300, streetCred: 18 }
  },
  {
    id: 'npc-student-funmi',
    name: 'Funmi (Unilag Student)',
    profession: 'University Undergraduate Finalist',
    category: 'COMMUTER',
    avatar: '🎒',
    locationHint: 'Onike / Akoka Gate',
    greeting: 'Brother driver! Please abeg student fare na ₦400, I have exam at 10 AM!',
    description: 'Books clutched to chest, polite smile, running late for exam.',
    dialogueLines: [
      'Driver abeg help a student! ₦400 is all my pocket money.',
      'God will bless your business as you carry me!',
      'Thank you brother! I wrote the exam well!'
    ],
    settleCostNaira: 500,
    haggleMinNaira: 350,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 400, streetCred: 25 }
  },
  {
    id: 'npc-nurse-grace',
    name: 'Nurse Grace',
    profession: 'LUTH Emergency Room Nurse',
    category: 'COMMUTER',
    avatar: '🩺',
    locationHint: 'Idi-Araba / Ojuelegba',
    greeting: 'Driver! Night duty starts in 15 minutes at hospital! Please hurry!',
    description: 'Crisp white nursing scrub with stethoscope.',
    dialogueLines: [
      'Hospital shift emergency! ₦1,000 fare.',
      'Bless your kind heart driver for stopping!',
      'Lives will be saved tonight because you drive fast!'
    ],
    settleCostNaira: 1000,
    haggleMinNaira: 700,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 1200, streetCred: 40 }
  },
  {
    id: 'npc-pastor-paul',
    name: 'Pastor Paul',
    profession: 'Miracle Assembly General Overseer',
    category: 'COMMUTER',
    avatar: '📖',
    locationHint: 'Maryland Junction',
    greeting: 'The Lord will enlarge your coast driver! Going to Sunday Revival!',
    description: 'Immaculate purple suit holding leather-bound Bible.',
    dialogueLines: [
      'I pay ₦1,200 and offer a special prayer for your gearbox and tyres!',
      'May fuel never finish in your tank!',
      'Go and prosper in Lagos streets!'
    ],
    settleCostNaira: 1200,
    haggleMinNaira: 800,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 1500, streetCred: 35 }
  },
  {
    id: 'npc-alhaji-bello',
    name: 'Alhaji Bello',
    profession: 'Kano Cattle & Onion Merchant',
    category: 'COMMUTER',
    avatar: '👳🏾‍♂️',
    locationHint: 'Mile 12 Cattle Market',
    greeting: 'Barka da rana! I need Danfo to carry me and my cash bag to Marina!',
    description: 'Flowing Babbar Riga gown holding leather pouch.',
    dialogueLines: [
      'Special charter fare: ₦3,000 for direct express non-stop.',
      'Settle ₦2,500 and I enter front seat with dignity.',
      'Madalla! Excellent driving brother.'
    ],
    settleCostNaira: 3000,
    haggleMinNaira: 2200,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 2800, streetCred: 45 }
  },
  {
    id: 'npc-lawyer-chike',
    name: 'Barrister Chike',
    profession: 'High Court Litigation Attorney',
    category: 'COMMUTER',
    avatar: '⚖️',
    locationHint: 'Igbosere High Court / CMS',
    greeting: 'Driver, my court appearance is in 20 minutes! Step on the accelerator!',
    description: 'Black lawyer court gown and powdered wig box.',
    dialogueLines: [
      'Express fare: ₦1,800. Time is of the legal essence!',
      'I will defend your conductor for free if police harass him!',
      'Justice served! Excellent ride.'
    ],
    settleCostNaira: 1800,
    haggleMinNaira: 1200,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 2000, streetCred: 35 }
  },
  {
    id: 'npc-teacher-bose',
    name: 'Mrs. Bose (School Principal)',
    profession: 'Government Secondary School Teacher',
    category: 'COMMUTER',
    avatar: '👩🏾‍🏫',
    locationHint: 'Oshodi Railway Stop',
    greeting: 'Good day driver! Please make sure your conductor speaks respectfully!',
    description: 'Glasses, marking pen, holding stacks of test papers.',
    dialogueLines: [
      'Standard fare ₦600. Keep the change driver.',
      'Education is the key to life! Drive safely for the children.',
      'Well done young man!'
    ],
    settleCostNaira: 600,
    haggleMinNaira: 450,
    haggleType: 'FARE_NEGOTIATION',
    reward: { cashNaira: 700, streetCred: 20 }
  },

  // --- 6. STREET HAWKERS & ROADSIDE SURVIVORS (6 NPCs) ---
  {
    id: 'npc-gala-seller',
    name: 'Emeka Gala',
    profession: 'Sausage Roll & Cold Lacasera Hawker',
    category: 'STREET_HAWKER',
    avatar: '🌭',
    locationHint: 'Third Mainland Traffic Jam',
    greeting: 'Gala! Cold Lacasera! Driver chop make your eyes clear!',
    description: 'Darting between moving cars with wooden tray on head.',
    dialogueLines: [
      'Combo: 2 Beef Rolls + Chilled Lacasera for ₦800!',
      'Pay ₦650 make I throw am inside through driver window!',
      'Chop life driver! Fresh energy restored!'
    ],
    settleCostNaira: 800,
    haggleMinNaira: 600,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 35, streetCred: 10 }
  },
  {
    id: 'npc-pure-water-boy',
    name: 'Musa Pure Water',
    profession: 'Chilled Sachet Water Vendor',
    category: 'STREET_HAWKER',
    avatar: '💧',
    locationHint: 'Oshodi Flyover Bottleneck',
    greeting: 'Pure water! Ice water! Radiator water! ₦100 per cold sachet!',
    description: 'Balanced silver pan of chilled sachets wrapped in wet towel.',
    dialogueLines: [
      'Bag of 20 pure water sachets for radiator emergency: ₦500!',
      'Bring ₦350 driver, engine heat will drop instantly!',
      'Blessing on your hustle!'
    ],
    settleCostNaira: 500,
    haggleMinNaira: 350,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 25, durability: 10 }
  },
  {
    id: 'npc-mallam-suya',
    name: 'Mallam Garba (Suya Master)',
    profession: 'Charcoal Smoked Spicy Suya Griller',
    category: 'STREET_HAWKER',
    avatar: '🥩',
    locationHint: 'Ojuelegba Night Junction',
    greeting: 'Oga driver! Night shift don start! Fresh spicy beef suya wrapped in newspaper!',
    description: 'Fanning glowing red charcoal embers under spicy meat skewers.',
    dialogueLines: [
      'Full parcel with sliced onions and extra yaji pepper: ₦2,000!',
      'Because you be regular driver, take am for ₦1,500!',
      'Hot spicy stamina for long night drive!'
    ],
    settleCostNaira: 2000,
    haggleMinNaira: 1400,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 65, streetCred: 15 }
  },
  {
    id: 'npc-shoe-cobbler',
    name: 'Aboki Shoe Repairer',
    profession: 'Itinerant Leather & Rubber Cobbler',
    category: 'STREET_HAWKER',
    avatar: '👞',
    locationHint: 'Anthony Curb',
    greeting: 'Sew shoe! Fix gas pedal rubber grip! ₦400!',
    description: 'Carries wooden toolbox with cobbler needles and leather strips.',
    dialogueLines: [
      'Sew torn driver slip-on sandal and glue non-slip pedal rubber: ₦600!',
      'Bring ₦400, your foot no go slip off brake pedal again.',
      'Solid grip! Drive on brother!'
    ],
    settleCostNaira: 600,
    haggleMinNaira: 350,
    haggleType: 'BUY_GOODS',
    reward: { stamina: 15, durability: 15 }
  },
  {
    id: 'npc-newspaper-stand',
    name: 'Pa Alamu (Newspaper Vendor)',
    profession: 'Daily Newspaper & Politics Analyst',
    category: 'STREET_HAWKER',
    avatar: '📰',
    locationHint: 'Maryland Roundabout',
    greeting: 'The Punch! Vanguard! Read about fuel subsidy and road maintenance!',
    description: 'Elderly vendor surrounded by commuters arguing politics.',
    dialogueLines: [
      'Today\'s paper has news on new traffic fines: ₦500!',
      'Pay ₦350 make you sabi where police dey mount checkpoint today!',
      'Knowledge is power driver!'
    ],
    settleCostNaira: 500,
    haggleMinNaira: 300,
    haggleType: 'BUY_GOODS',
    reward: { streetCred: 20 }
  },
  {
    id: 'npc-fuel-black-market',
    name: 'Sodiq (Black Market Fuel)',
    profession: 'Emergency 10L Diesel Jerrycan Supplier',
    category: 'STREET_HAWKER',
    avatar: '⛽',
    locationHint: 'Third Mainland Breakdown Point',
    greeting: 'Your fuel empty on bridge? I get 10L yellow jerrycan of diesel right here!',
    description: 'Waiting near breakdown lanes with yellow jerrycan and plastic funnel.',
    dialogueLines: [
      '10 Liters emergency diesel: ₦12,000! Saves you from ₦30,000 towing fee!',
      'Haggle down to ₦9,500 and I pour am directly into your tank!',
      'Engine started! Get off the bridge before LASTMA arrive!'
    ],
    settleCostNaira: 12000,
    haggleMinNaira: 9000,
    haggleType: 'BUY_GOODS',
    reward: { durability: 15, streetCred: 25 }
  }
];
