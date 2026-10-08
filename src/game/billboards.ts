import * as THREE from 'three';

export interface BillboardAd {
  id: string;
  brandName: string;
  tagline: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  imageUrl?: string;
  distanceMarkerMeters: number;
}

export const DEFAULT_BILLBOARDS: BillboardAd[] = [
  {
    id: 'ad-opay',
    brandName: 'OPAY BEYOND BANKING',
    tagline: 'Instant Transfers • Zero Failure Rate • Save with OWealth',
    bgColor: '#16a34a',
    textColor: '#ffffff',
    accentColor: '#4ade80',
    distanceMarkerMeters: 450,
  },
  {
    id: 'ad-chowdeck',
    brandName: 'CHOWDECK EXPRESS',
    tagline: 'Hot Smokey Jollof Delivered in 20 Mins Flat!',
    bgColor: '#ea580c',
    textColor: '#ffffff',
    accentColor: '#facc15',
    distanceMarkerMeters: 1100,
  },
  {
    id: 'ad-flutterwave',
    brandName: 'FLUTTERWAVE PAYMENTS',
    tagline: 'Endless Possibilities • Global Commerce from Lagos',
    bgColor: '#f97316',
    textColor: '#ffffff',
    accentColor: '#fed7aa',
    distanceMarkerMeters: 1900,
  },
  {
    id: 'ad-indomie',
    brandName: 'INDOMIE NOODLES',
    tagline: 'Delicious Taste of Mama\'s Love • Super Pack Onion',
    bgColor: '#dc2626',
    textColor: '#ffffff',
    accentColor: '#facc15',
    distanceMarkerMeters: 2500,
  },
];

const BILLBOARD_STORAGE_KEY = 'danfo_custom_billboards';

export function getCustomBillboards(): BillboardAd[] {
  try {
    const raw = localStorage.getItem(BILLBOARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_BILLBOARDS;
}

export function saveCustomBillboards(ads: BillboardAd[]): void {
  try {
    localStorage.setItem(BILLBOARD_STORAGE_KEY, JSON.stringify(ads));
  } catch (e) {
    // ignore
  }
}

export function createBillboardTexture(ad: BillboardAd): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, ad.bgColor);
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Modern border & billboard framing
  ctx.strokeStyle = ad.accentColor;
  ctx.lineWidth = 16;
  ctx.strokeRect(12, 12, 1000, 488);

  // Decorative diagonal sports stripes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  for (let i = 0; i < 1024; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 40, 0);
    ctx.lineTo(i - 80, 512);
    ctx.lineTo(i - 120, 512);
    ctx.closePath();
    ctx.fill();
  }

  // Tag banner "ADVERTISE HERE / SPONSORED BILLBOARD"
  ctx.fillStyle = ad.accentColor;
  ctx.fillRect(40, 36, 320, 38);
  ctx.fillStyle = '#09090b';
  ctx.font = '900 20px "Bungee", sans-serif';
  ctx.fillText('LAGOS EXPRESSWAY LED', 54, 62);

  // Brand Name
  ctx.fillStyle = ad.textColor;
  ctx.font = '900 64px "Bungee", Impact, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillText(ad.brandName, 50, 190, 920);

  // Tagline
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = ad.accentColor;
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(ad.tagline, 52, 270, 920);

  // Bottom footer call to action
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px monospace';
  ctx.fillText('⚡ CONTACT BILLBOARD OWNER TO ADVERTISE YOUR PRODUCT HERE', 52, 450);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}
