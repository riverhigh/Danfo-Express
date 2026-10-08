# Danfo Express — Implementation Task Artifact Plan & Architecture

## 1. System Architecture & File Structure

```
/src
├── assets/                  # Vector icons & sound descriptors
├── audio/
│   ├── soundEngine.ts       # Web Audio API procedural sound synthesizer (Horn, Engine, Slap, Brakes, Coins, Sirens)
│   └── afrobeatRadio.ts     # Procedural multi-track Afrobeat/Fuji radio player (drums, bass, organ, brass)
├── types/
│   └── game.ts              # Core types: GameState, Bus, Passenger, Hazard, ConductorAction, Shift, Upgrades
├── game/
│   ├── config.ts            # Tuning constants: speeds, physics, heat rates, fares, combo multipliers
│   ├── engine.ts            # 60 FPS requestAnimationFrame loop, update pipeline, collision physics
│   ├── traffic.ts           # Autonomous traffic AI (okadas, luxury SUVs, rival danfos, fuel tankers)
│   ├── roadGenerator.ts     # Infinite procedural Lagos road segments (lanes, markets, bridges, floods, potholes)
│   ├── passengerSystem.ts   # Boarding, alighting, mood decay, fares, drop-off precision
│   └── chaosEvents.ts       # Overcooked cabin micro-events (Big Bill, Preacher, Agbero Jump-on, Sudden Drop)
├── components/
│   ├── GameCanvas.tsx       # Canvas 2D high-octane renderer with cell-shaded styling, motion lines, particles
│   ├── CabinView.tsx        # In-bus passenger cabin view with live mood, seats, and quick-time action triggers
│   ├── ArcadeHUD.tsx        # Top/bottom arcade HUD: Hustle Meter, Heat Gauge, Speed, Shift Clock, Fares, Combo
│   ├── ConductorControls.tsx# Driver hotkeys & interactive touch buttons (Call, Collect, Slap/Hang, Settle)
│   ├── RadioPlayer.tsx      # Interactive Lagos Danfo Sound System (track toggle, volume, mood boost)
│   ├── GarageModal.tsx      # Vehicle progression, mechanical upgrades, slogans, custom horns
│   ├── ShiftSummaryModal.tsx# Daily park report: Total Fares, Union Levy payout, Street Cred, Net Profit
│   └── TitleScreen.tsx      # High-octane arcade intro, instructions, controls guide, and shift selector
├── App.tsx                  # Top-level state coordinator & screen routing
└── index.css                # Tailwind CSS v4 styling + arcade typography configurations
```

---

## 2. Core Modules & Implementation Phases

### Phase 1: Game State & Types Definition (`src/types/game.ts` & `src/game/config.ts`)
- Define full data structures for:
  - `Vehicle`: speed, maxSpeed, acceleration, handling, heat, maxHeat, durability, capacity, passengerSeats, upgrades, slogan.
  - `Passenger`: id, name, archetype (Corporate, Market Woman, Student, Agbero, Preacher), destination, fare, patience, hasBigBill, changeNeeded.
  - `TrafficVehicle`: type (Okada, SUV, RivalDanfo, PoliceCar, Tanker), x, y, speed, lane, width, height, aggressive.
  - `Hazard`: type (Pothole, FloodWater, MarketStall, Roadblock, FuelSpill), x, y, length, severity.
  - `CabinEvent`: type (BIG_BILL, PREACHER, AGBERO_STOWAWAY, ILLEGAL_DROP, OVERHEAT_STALL), progress, timer, resolved.
  - `ShiftState`: timeOfDay (Morning Rush, Midday Hustle, Evening Storm), clock (06:00 to 22:00), shiftEarnings, unionLevyDue, streetCred.

### Phase 2: Procedural Audio Engine (`src/audio/soundEngine.ts` & `src/audio/afrobeatRadio.ts`)
- Web Audio API zero-dependency procedural synthesizer:
  - **Dynamic Danfo Horn**: Authentic 2-tone melodic electric horn ("Peep-Peep / Pon-Pon").
  - **Engine Audio**: Frequency-modulated oscillator scaling with RPM, metallic rattle on damage.
  - **Conductor Door Slap**: Heavy dual-percussion metallic slap when conductor leans out.
  - **Coins / Money Clink**: Bright resonant chime on successful fare collection.
  - **Police / LASTMA Siren**: Modulated siren sweep when heat is high or near checkpoint.
  - **Radio System**: Procedural polyphonic Afrobeat rhythm generator with selectable channels:
    - *Track 1: "Lagos Rush Hour" (Fast Afrobeat drums + high-energy horns)*
    - *Track 2: "Fuji Street Heat" (Talking drum syncopation + synth chords)*
    - *Track 3: "Ojuelegba Midnight" (Chill highlife groove)*
  - Audio toggle and volume sliders for pristine player control.

### Phase 3: Arcade Canvas Driving Engine (`src/game/engine.ts`, `src/game/traffic.ts`, `src/components/GameCanvas.tsx`)
- High-performance 2D Canvas with vibrant comic/arcade rendering:
  - Asphalt highway with painted lane dividers, curbs, road bridges, and market stalls.
  - Danfo physics: responsive steering, acceleration, drifting on sharp corners, braking, pothole jump ramps.
  - Particle systems: tire skid marks, exhaust soot puffs, pothole dust clouds, flood spray.
  - Dynamic traffic AI:
    - Okadas (swerving between lanes, fragile)
    - Rival Danfos (aggressive, cutting you off, racing for passengers)
    - Luxury SUVs (VIP targets to draft behind for hustle points)
    - Fuel tanker bottlenecks (blocking 3 out of 4 lanes)
  - LASTMA & Union roadblocks with interactive avoidance / bribery triggers.
  - Speed-based visual lean and kinetic screen shake on impacts or high combos.

### Phase 4: Conductor & In-Bus Cabin Chaos (`src/components/CabinView.tsx`, `src/game/chaosEvents.ts`)
- Dual-control system: Driving on canvas while managing the bus interior.
- Quick-action Conductor bar (Keyboard keys Q, W, E, R + Touch buttons):
  - **Q: Call Location**: Shouts current destination ("Oshodi! Ikeja!"), attracting crowds at upcoming stops.
  - **W: Collect Fares**: Time-based micro-game to collect cash before passengers hop off.
  - **E: Hang Out & Slap**: Slaps the bus side to scare off adjacent okadas and aggressive cars.
  - **R: Settle Officers**: Quickly slips ₦500 to LASTMA checkpoint or Union agbero to pass without delay.
- Overcooked Cabin Micro-events:
  - **Big Bill ₦10,000**: Tap to split change from other passenger fares before stop!
  - **Street Preacher / Salesman**: Crank radio volume to 100% to drown out noise or pay ₦200 to alight.
  - **Agbero Stowaway**: Agbero grabbed onto the ladder! Steer zigzag or slam brakes to shake off!
  - **Express Drop-Off**: Decelerate to 10-15 km/h for flying drop-off bonus timer savings.

### Phase 5: Progression, Garage, Upgrades & Shifts (`src/components/GarageModal.tsx`, `src/components/ShiftSummaryModal.tsx`)
- Shift Cycle Progression:
  - Morning Rush (06:00 - 10:00): Tight passenger deadlines, heavy Third Mainland Bridge bottlenecks.
  - Midday Hustle (10:00 - 16:00): Engine overheating hazards, active LASTMA patrols.
  - Evening Rush (16:00 - 22:00): Flooded roads, rainstorms, rival bus races, triple fares.
- Vehicles:
  - **Rustic Van**: Starter vehicle, rugged, low heat dissipation.
  - **Turbo Sprinter**: Fast, high capacity, fragile bumper.
  - **High-Riser Coaster**: Massive 24-passenger capacity, requires skilled lane management.
- Upgrades & Customization:
  - Dual Radiator Electric Fan (cooling speed +40%)
  - Reinforced Bull-Bar (protects against traffic knocks)
  - Roof Mega-Speakers (+25% passenger patience, drowns preachers)
  - Hand-painted windshield slogans: *"No King as God"*, *"Work & Pray"*, *"Face Your Front"*, *"No Condition Is Permanent"*
  - Musical Horn upgrades.

### Phase 6: Polish, Accessibility, Mobile Controls & Verification
- Seamless keyboard (WASD / Arrows + QWER / Space) and full on-screen touch D-Pad / pedals for mobile / tablet.
- Sound effects and music with instant mute toggle.
- Tabular figures (`tabular-nums`) for currency (₦ Naira), speed (km/h), heat (%), time, and combo counter.
- Strict Anti-Slop adherence: no generic pill badges, high-contrast readable typography, genuine Lagos pop art flair.
- Compile and build verification with `compile_applet`.
