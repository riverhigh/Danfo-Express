const fs = require('fs');

function inspectGlb(path) {
  const buf = fs.readFileSync(path);
  const str = buf.toString('latin1', 0, Math.min(buf.length, 100000));
  const names = (str.match(/"name":"([^"]+)"/g) || []).map(m => m.replace(/"name":"|"/g, ''));
  console.log('===', path, '===');
  console.log('Sample node/mesh names:', names.slice(0, 30));
}

inspectGlb('public/models/3d_model__passenger_tricycle_keke_napep.glb');
inspectGlb('public/models/honda_today_g-type_police.glb');
