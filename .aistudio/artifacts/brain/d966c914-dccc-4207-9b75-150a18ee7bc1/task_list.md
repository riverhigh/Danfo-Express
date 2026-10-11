# Danfo Express Refactoring Task List

## Overview
Addressing steering direction inversion and natural steering feel, physical drive-in service bays for Gas Stations and Mechanic Shops, on-foot walk-mode NPC service interactions, and full wallet/funds persistence.

---

### [x] Phase 1: Reverse Gear Audio, Steering Inversion & Wheel Direction Fix
- [x] Fix 3D Cockpit steering wheel rotation (proper right-handed clockwise rotation when turning right: negated Z in Three.js)
- [x] Fix front exterior wheels steering knuckle yaw (align turning direction with steering input: positive yaw on right turn)
- [x] Fix reverse camera flip in First Person mode (maintain natural forward driving cockpit view through windshield rather than jarring 180° flip)
- [x] Implement clean mechanical reverse gear whine and smooth low-idle audio in `soundEngine.ts`, stopping incorrect forward high revs
- [x] Fix reverse beep cadence timer in simulation loop (clean 1.25s interval with state reset, eliminating frame-stacked audio screech)
- [x] Polish reverse gear momentum and steering kinematics for smooth, intuitive backing up

### [x] Phase 2: Driving Screen UI Cleanup & Windshield Streamlining
- [x] Remove obstructive floating bus stop popups and overlapping debug banners that block forward windshield visibility
- [x] Consolidate essential metrics (Distance, Speed, Fuel, Passengers, Wallet, Bank) into a clean, unified top notification bar
- [x] Streamline dashboard overlays into a clean toggleable Dashboard Mode (Zuuks style with `[🎛️ DASH]` / `[👁️ CLEAN]` button)
- [x] Add `[✓ Fixed] R-Gear Sound` visual status indicator and highlight 'R' in the Gear Selector when engaged

### [x] Phase 3: Player Starting Home & Funds Synchronization
- [x] Lock higher apartment tiers by default so player starts in the single room (Face-Me-I-Face-You / Minor starter bedroom)
- [x] Ensure luxury rooms (Oshodi pool lounge, dining flat, Ikeja master studio penthouse) remain locked until purchased with earned funds
- [x] Synchronize `walletNaira` and `bankBalanceNaira` between driving/work mode, home mode, POS/bank modal, and save state so funds always match in real time
- [x] Display both Wallet Cash and Bank Balance in Player Home mode with POS/Bank access

### [x] Phase 5: Complete Steering Inversion & Natural Feel Fix
- [x] Fix steering coordinate direction: Turn Left steers bus left (+X), Turn Right steers bus right (-X)
- [x] Align 3D exterior front wheel knuckle yaw with actual turning direction (steer left yaw points left, steer right points right)
- [x] Implement natural progressive steering response: smooth speed-sensitive dampening, natural self-centering spring, and buttery smooth touch/mouse wheel dragging
- [x] Sync both 2D dashboard wheel instances and 3D cockpit steering wheel without stutter or inversion

### [x] Phase 6: Physical Drive-In Parking Bay Triggers (Gas Stations & Mechanic Yards)
- [x] Remove proximity-based floating banners when driving past on the highway
- [x] Enforce strict physical parking box collision check (bus must steer off expressway into station apron/compound)
- [x] Require bus to be completely parked and stationary (velocity near zero, gear in 'Park', brakes on, or engine OFF)
- [x] Display subtle, non-obtrusive bay parking status with clear prompt to step out in Walk Mode

### [x] Phase 7: Walk-Mode Service Interaction & Dedicated Service Dialogs
- [x] Enable smooth on-foot walk navigation throughout the Gas Station compound and Mechanic Workshop
- [x] Add distance checks and interactive prompts when approaching the 3D Fuel Attendant or Mechanic NPC
- [x] Implement dedicated Gas Station Pump Service Dialog (choose liters, calculate cost at ₦500/L, pay with wallet cash, refill fuel tank)
- [x] Implement dedicated Mechanic Workshop Dialog (view engine heat/comfort/durability, select coolant flush, suspension tune-up, or bull-bar upgrade, pay with wallet cash)
- [x] Add walk-back prompt and seamless re-entry into the Danfo bus to resume driving

### [x] Phase 8: Verification & Compilation
- [x] Verify build with `compile_applet` (Build succeeded)
- [x] Check with `lint_applet` for clean TypeScript execution (0 errors)
