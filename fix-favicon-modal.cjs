const fs = require('fs');

// ===== 1. FIX FAVICON — change from .jpg to .png SVG favicon =====
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml
  .replace('<link rel="icon" type="image/jpeg" href="/icon-192.jpg">', '<link rel="icon" type="image/svg+xml" href="/favicon.svg">')
  .replace('<link rel="apple-touch-icon" href="/icon-192.jpg">', '<link rel="apple-touch-icon" href="/icon-192.jpg">');
fs.writeFileSync('index.html', indexHtml);

// Create a proper SVG favicon
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#f59e0b"/>
  <rect x="8" y="20" width="48" height="28" rx="4" fill="#78350f"/>
  <rect x="10" y="22" width="44" height="14" rx="2" fill="#0284c7"/>
  <rect x="10" y="38" width="44" height="8" rx="0" fill="#92400e"/>
  <circle cx="18" cy="50" r="7" fill="#1c1917"/>
  <circle cx="18" cy="50" r="4" fill="#44403c"/>
  <circle cx="46" cy="50" r="7" fill="#1c1917"/>
  <circle cx="46" cy="50" r="4" fill="#44403c"/>
  <rect x="22" y="14" width="20" height="10" rx="2" fill="#bfdbfe"/>
  <text x="32" y="35" text-anchor="middle" font-family="Arial Black" font-size="10" font-weight="900" fill="#fbbf24">DANFO</text>
</svg>`;
fs.writeFileSync('public/favicon.svg', faviconSvg);
console.log('Favicon fixed');

// ===== 2. FIX NPC MODAL z-index — ensure it's clickable =====
let npcModal = fs.readFileSync('src/components/NpcInteractionModal.tsx', 'utf8');
npcModal = npcModal.replace(
  'className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"',
  'className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md" style={{pointerEvents:"all"}}'
);
fs.writeFileSync('src/components/NpcInteractionModal.tsx', npcModal);
console.log('NPC Modal z-index fixed');
