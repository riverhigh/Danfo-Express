import * as THREE from 'three';

/**
 * Procedural texture generators for ultra-crisp, zero-external-dependency Lagos 3D rendering
 */

export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, 512, 512);

  // Grain and gravel speckles
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = Math.floor(Math.random() * 45) + 20;
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
  }

  // Subtle tire skid mark streaks
  ctx.strokeStyle = 'rgba(10, 10, 10, 0.4)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(140, 512);
  ctx.moveTo(370, 0);
  ctx.lineTo(370, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 16);
  return texture;
}

export function createCurbTexture(): THREE.CanvasTexture {
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
  return texture;
}

export function createBuildingFacadeTexture(name: string, accentColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Concrete building base
  ctx.fillStyle = '#292524';
  ctx.fillRect(0, 0, 512, 512);

  // Windows grid
  for (let y = 140; y < 480; y += 70) {
    for (let x = 30; x < 480; x += 80) {
      // Window frame
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(x, y, 55, 45);
      // Glass glow
      const isLit = Math.random() > 0.4;
      ctx.fillStyle = isLit ? '#fef08a' : '#0f172a';
      ctx.fillRect(x + 4, y + 4, 47, 37);
      // Air conditioner unit below some windows
      if (Math.random() > 0.6) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + 10, y + 48, 35, 16);
      }
    }
  }

  // Shop signboard at ground floor
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 20, 512, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 256, 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createSignboardTexture(text: string, subtext: string, bgColor: string): THREE.CanvasTexture {
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
  ctx.font = '900 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 75);

  ctx.font = '600 22px sans-serif';
  ctx.fillText(subtext, 256, 120);

  return new THREE.CanvasTexture(canvas);
}

export function createBusStopSignTexture(stopName: string, destination: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Lagos Yellow Header
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 60);

  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAGOS BUS TRANSIT STOP 🚏', 256, 40);

  // Green Main Body
  ctx.fillStyle = '#047857';
  ctx.fillRect(0, 60, 512, 196);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 66, 500, 184);

  // Stop Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px sans-serif';
  ctx.fillText(stopName.toUpperCase(), 256, 125);

  // Destination Tag
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`ROUTE: ${destination.toUpperCase()}`, 256, 175);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '18px sans-serif';
  ctx.fillText('PASSENGER BOARDING BAY • NO ILLEGAL PARKING', 256, 220);

  return new THREE.CanvasTexture(canvas);
}

export function createDashboardClusterTexture(): THREE.CanvasTexture {
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

  return new THREE.CanvasTexture(canvas);
}

export function createNairaNoteTexture(): THREE.CanvasTexture {
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

  return new THREE.CanvasTexture(canvas);
}
