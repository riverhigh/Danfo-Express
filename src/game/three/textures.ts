import * as THREE from 'three';

/**
 * Procedural texture generators with memory caching for ultra-crisp, zero-crash Lagos 3D rendering
 */

let cachedAsphaltTex: THREE.CanvasTexture | null = null;
let cachedCurbTex: THREE.CanvasTexture | null = null;
let cachedDashboardTex: THREE.CanvasTexture | null = null;
let cachedNairaTex: THREE.CanvasTexture | null = null;
const facadeTextureCache = new Map<string, THREE.CanvasTexture>();
const signboardTextureCache = new Map<string, THREE.CanvasTexture>();
const busStopSignTextureCache = new Map<string, THREE.CanvasTexture>();

export function createAsphaltTexture(): THREE.CanvasTexture {
  if (cachedAsphaltTex) return cachedAsphaltTex;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, 256, 256);

  // Fast grain and gravel speckles
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const brightness = Math.floor(Math.random() * 45) + 20;
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire skid mark streaks
  ctx.strokeStyle = 'rgba(10, 10, 10, 0.4)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(70, 0);
  ctx.lineTo(70, 256);
  ctx.moveTo(185, 0);
  ctx.lineTo(185, 256);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 16);
  cachedAsphaltTex = texture;
  return texture;
}

export function createCurbTexture(): THREE.CanvasTexture {
  if (cachedCurbTex) return cachedCurbTex;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Alternating Lagos Yellow and Black hazard stripes
  const stripeWidth = 32;
  for (let x = 0; x < 256; x += stripeWidth * 2) {
    ctx.fillStyle = '#facc15'; // Lagos Yellow
    ctx.fillRect(x, 0, stripeWidth, 64);
    ctx.fillStyle = '#09090b'; // Black
    ctx.fillRect(x + stripeWidth, 0, stripeWidth, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 1);
  cachedCurbTex = texture;
  return texture;
}

export function createBuildingFacadeTexture(name: string, accentColor: string): THREE.CanvasTexture {
  const cacheKey = `${name}::${accentColor}`;
  const existing = facadeTextureCache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Concrete building base
  ctx.fillStyle = '#292524';
  ctx.fillRect(0, 0, 256, 256);

  // Windows grid
  for (let y = 70; y < 240; y += 35) {
    for (let x = 15; x < 240; x += 40) {
      // Window frame
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(x, y, 28, 22);
      // Glass glow
      const isLit = ((x + y + name.length) % 3) !== 0;
      ctx.fillStyle = isLit ? '#fef08a' : '#0f172a';
      ctx.fillRect(x + 2, y + 2, 24, 18);
      // Air conditioner unit below some windows
      if ((x + y) % 5 === 0) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + 5, y + 24, 18, 8);
      }
    }
  }

  // Shop signboard at ground floor
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 10, 256, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 128, 35, 244);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  facadeTextureCache.set(cacheKey, texture);
  return texture;
}

export function createSignboardTexture(text: string, subtext: string, bgColor: string): THREE.CanvasTexture {
  const cacheKey = `${text}::${subtext}::${bgColor}`;
  const existing = signboardTextureCache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 75, 480);

  ctx.font = '600 20px sans-serif';
  ctx.fillText(subtext, 256, 120, 480);

  const texture = new THREE.CanvasTexture(canvas);
  signboardTextureCache.set(cacheKey, texture);
  return texture;
}

export function createBusStopSignTexture(
  stopName: string,
  nextStopLabel: string,
  stopUid?: string,
  isOppositeSide: boolean = false
): THREE.CanvasTexture {
  const cacheKey = `${stopName}::${nextStopLabel}::${stopUid || ''}::${isOppositeSide ? '1' : '0'}`;
  const existing = busStopSignTextureCache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Lagos Yellow Header with Stop UID & Corridor Direction
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 60);

  ctx.fillStyle = '#09090b';
  ctx.font = '900 19px sans-serif';
  ctx.textAlign = 'center';
  const headerText = stopUid
    ? `🚏 ${stopUid.toUpperCase()} • ${isOppositeSide ? 'TO IKEJA / MAINLAND' : 'TO CMS / ISLAND'}`
    : 'LAGOS BUS TRANSIT STOP 🚏';
  ctx.fillText(headerText, 256, 38, 492);

  // Green Main Body (or Deep Blue for Opposite Return Lane)
  ctx.fillStyle = isOppositeSide ? '#0369a1' : '#047857';
  ctx.fillRect(0, 60, 512, 196);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 66, 500, 184);

  // Current Stop Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px sans-serif';
  ctx.fillText(stopName.toUpperCase(), 256, 120, 480);

  // Directional Next Bus Stop After This Stop
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(
    `${isOppositeSide ? '↩ OTHER SIDE NEXT:' : '➔ NEXT STOP:'} ${nextStopLabel.toUpperCase()}`,
    256,
    172,
    480
  );

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(
    isOppositeSide
      ? 'OUTBOUND CORRIDOR (MARYLAND ➔ IKEJA DIRECTION)'
      : 'INBOUND CORRIDOR (IKEJA ➔ MARYLAND ➔ OSHODI ➔ CMS)',
    256,
    220,
    480
  );

  const texture = new THREE.CanvasTexture(canvas);
  busStopSignTextureCache.set(cacheKey, texture);
  return texture;
}

export function createDashboardClusterTexture(): THREE.CanvasTexture {
  if (cachedDashboardTex) return cachedDashboardTex;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark textured dashboard background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 512, 256);

  // High-tech textured mesh
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 512, 2);
  }

  // Instrument gauge bevel borders
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;

  // 1. Far Left Dial: Tachometer (RPM x1000)
  ctx.beginPath();
  ctx.arc(100, 135, 75, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(100, 135, 75, Math.PI * 0.75, Math.PI * 1.85);
  ctx.stroke();
  // Redline
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(100, 135, 75, Math.PI * 1.85, Math.PI * 2.25);
  ctx.stroke();
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RPM x1000', 100, 155);

  // 2. Center-Left Dial: GRAPHIC FUEL GAUGE [E --- F]
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(205, 145, 48, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();

  // Fuel arc gradient: Red at E to Emerald at F
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(205, 145, 48, Math.PI * 0.8, Math.PI * 1.2);
  ctx.stroke();
  ctx.strokeStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(205, 145, 48, Math.PI * 1.2, Math.PI * 2.2);
  ctx.stroke();

  // "E" and "F" Labels
  ctx.font = '900 16px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.fillText('E', 175, 175);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('F', 235, 175);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('⛽ FUEL', 205, 135);

  // 3. Center-Right Dial: ACCELERATION / TORQUE METER (0 - 100%)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(307, 145, 48, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(307, 145, 48, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 12px monospace';
  ctx.fillText('ACCEL %', 307, 135);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText('0', 280, 175);
  ctx.fillText('100', 335, 175);

  // 4. Far Right Dial: Speedometer (KM/H)
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(412, 135, 75, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(412, 135, 75, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px monospace';
  ctx.fillText('KM/H', 412, 155);

  // Speed Ticks (0, 20, 40, 60, 80, 100, 120, 140)
  for (let i = 0; i <= 7; i++) {
    const angle = Math.PI * 0.75 + (i / 7) * (Math.PI * 1.5);
    const x1 = 412 + Math.cos(angle) * 62;
    const y1 = 135 + Math.sin(angle) * 62;
    const x2 = 412 + Math.cos(angle) * 72;
    const y2 = 135 + Math.sin(angle) * 72;
    ctx.strokeStyle = i >= 5 ? '#ef4444' : '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const speedVal = i * 20;
    const tx = 412 + Math.cos(angle) * 50;
    const ty = 135 + Math.sin(angle) * 50;
    ctx.fillStyle = i >= 5 ? '#ef4444' : '#cbd5e1';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${speedVal}`, tx, ty + 3);
  }

  // Top Status Bar: Check Engine, Battery, Oil, High Beam
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(150, 15, 212, 36);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(150, 15, 212, 36);

  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#eab308';
  ctx.fillText('⚡ 12.4V', 185, 36);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('OIL: OK', 256, 36);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('BEAM', 325, 36);

  const tex = new THREE.CanvasTexture(canvas);
  cachedDashboardTex = tex;
  return tex;
}

export function createNairaNoteTexture(): THREE.CanvasTexture {
  if (cachedNairaTex) return cachedNairaTex;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Crisp Central Bank of Nigeria ₦1000 note gradient
  const grad = ctx.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, '#064e3b');
  grad.addColorStop(0.5, '#059669');
  grad.addColorStop(1, '#047857');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  // Outer border & guilloche pattern simulation
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 244, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('₦1000', 14, 34);
  ctx.fillText('₦1000', 170, 114);

  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CENTRAL BANK OF NIGERIA', 128, 55);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '10px sans-serif';
  ctx.fillText('ONE THOUSAND NAIRA', 128, 75);

  // Security strip
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(80, 6, 14, 116);

  const tex = new THREE.CanvasTexture(canvas);
  cachedNairaTex = tex;
  return tex;
}

const bankSignTextureCache = new Map<string, THREE.CanvasTexture>();

export function createBankCorporateTexture(
  bankName: string = 'EKO ZENITH BANK',
  subText: string = 'COMMERCIAL BANKING • BULK CASH • DUAL TELLER'
): THREE.CanvasTexture {
  const cacheKey = `${bankName}::${subText}`;
  const existing = bankSignTextureCache.get(cacheKey);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  // Deep corporate navy blue gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 192);
  grad.addColorStop(0, '#091e42');
  grad.addColorStop(0.5, '#0c2d6b');
  grad.addColorStop(1, '#081735');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 192);

  // Elegant gold trim border
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 176);

  // Inner subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 480, 160);

  // Bank Emblem / Building Icon
  ctx.fillStyle = '#facc15';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏛️ ' + bankName.toUpperCase(), 256, 70);

  // Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(subText.toUpperCase(), 256, 115);

  // Tagline
  ctx.fillStyle = '#93c5fd';
  ctx.font = '600 14px sans-serif';
  ctx.fillText('WALK-IN TELLER WITHDRAWAL (>₦100,000) • SAFE & SECURE', 256, 150);

  const tex = new THREE.CanvasTexture(canvas);
  bankSignTextureCache.set(cacheKey, tex);
  return tex;
}

export function createBankQueueDisplayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Dark LED display panel
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, 384, 128);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 376, 120);

  // Digital LED glow for Ticket announcement
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NOW SERVING: B-041 @ COUNTER 2', 192, 48);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('NEXT IN QUEUE: B-042 • B-043 • B-044', 192, 85);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.fillText('PLEASE WAIT FOR CHIME BEFORE APPROACHING TELLER', 192, 112);

  return new THREE.CanvasTexture(canvas);
}

export function createPosUmbrellaSignTexture(
  agentName: string = 'AUNTY BUKKY',
  themeColor: string = '#16a34a'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 384, 192);

  // Header band
  ctx.fillStyle = themeColor;
  ctx.fillRect(0, 0, 384, 52);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`💳 ${agentName.toUpperCase()} POS`, 192, 36);

  // Main text
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 26px sans-serif';
  ctx.fillText('CASH OUT HERE ₦', 192, 95);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('WITHDRAWAL • TRANSFER • AIRTIME', 192, 132);

  ctx.fillStyle = '#dc2626';
  ctx.font = '800 14px sans-serif';
  ctx.fillText('MAX: ₦100,000 PER TRANSACTION • 24/7', 192, 168);

  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 378, 186);

  return new THREE.CanvasTexture(canvas);
}

export function createCustomCarShopTexture(
  shopName: string = 'ALABA CUSTOM DANFO & SIGNWRITER',
  subText: string = 'REAR WINDOW SLOGANS • BODY KITS • ARTWORK • HORNS'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 192);
  grad.addColorStop(0, '#78350f');
  grad.addColorStop(0.5, '#b45309');
  grad.addColorStop(1, '#92400e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 192);

  // Yellow trim
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillRect(0, 178, 512, 14);

  // Border
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🎨 ${shopName.toUpperCase()}`, 256, 68);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('NO CONDITION IS PERMANENT • NO KING AS GOD', 256, 108);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 14px sans-serif';
  ctx.fillText(subText, 256, 148);

  return new THREE.CanvasTexture(canvas);
}

export function createPoliceLastmaSignTexture(
  stationTitle: string = 'NIGERIA POLICE FORCE & LASTMA JOINT ENFORCEMENT COMMAND',
  subText: string = 'ZONE 2 AREA HEADQUARTERS • TRAFFIC COMPLIANCE & IMPOUND YARD'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  // Left half police dark navy blue, Right half LASTMA wine / burgundy
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#0f172a'); // Police Navy
  grad.addColorStop(0.48, '#1e293b');
  grad.addColorStop(0.52, '#4a0410'); // LASTMA Wine/Burgundy
  grad.addColorStop(1, '#831843');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 192);

  // Top header stripe: Police Blue/Yellow/Green on left, LASTMA Cream/Wine on right
  ctx.fillStyle = '#0284c7'; ctx.fillRect(0, 0, 170, 14);
  ctx.fillStyle = '#facc15'; ctx.fillRect(170, 0, 86, 14);
  ctx.fillStyle = '#fef08a'; ctx.fillRect(256, 0, 128, 14); // Cream
  ctx.fillStyle = '#9f1239'; ctx.fillRect(384, 0, 128, 14); // Wine

  // Yellow trim border
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 500, 180);

  // Main text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('🇳🇬 ' + stationTitle, 256, 58);

  // Subheaders
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('👮 NPF HIGHWAY PATROL  |  🚦 LASTMA TRAFFIC CORRECTION', 256, 102);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 13px sans-serif';
  ctx.fillText(subText, 256, 145);

  ctx.fillStyle = '#f43f5e';
  ctx.font = '800 11px sans-serif';
  ctx.fillText('ONE-WAY & OBSTRUCTION OFFENDERS WILL BE TOWED • FINES ENFORCED', 256, 172);

  return new THREE.CanvasTexture(canvas);
}
