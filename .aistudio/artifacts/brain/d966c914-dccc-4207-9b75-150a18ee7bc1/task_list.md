# Danfo Express Refactoring Task List

## Overview
Addressing steering wheel inversion, reverse gear audio and physics, driving screen UI clutter, starting home single room state, and funds synchronization between Work and Home modes.

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

### [x] Phase 4: Verification & Compilation
- [x] Verify TypeScript types and build with `compile_applet` (Build succeeded)
- [x] Run `lint_applet` (TypeScript checks passed with 0 errors)
