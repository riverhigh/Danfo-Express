const fs = require('fs');

const models = [
  'public/models/1991_honda_civic_eg6.glb',
  'public/models/2005_toyota_townace_gl.glb',
  'public/models/3d_model__passenger_tricycle_keke_napep.glb',
  'public/models/honda_today_g-type_police.glb',
  'public/models/kia_km420.glb',
  'public/models/2000_honda_civic_type_r_ek9.glb',
  'public/models/2010_kia_forte_koup.glb',
  'public/models/ac_-_honda_acty_ha3_free.glb'
];

models.forEach(p => {
  const buf = fs.readFileSync(p);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  // Calculate total bounding box across meshes
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  gltf.meshes.forEach(m => {
    const acc = gltf.accessors[m.primitives[0].attributes.POSITION];
    for (let c = 0; c < 3; c++) {
      if (acc.min[c] < min[c]) min[c] = acc.min[c];
      if (acc.max[c] > max[c]) max[c] = acc.max[c];
    }
  });
  const dx = max[0] - min[0];
  const dy = max[1] - min[1];
  const dz = max[2] - min[2];
  console.log(p.split('/').pop(), `dx(width/len)=${dx.toFixed(2)}, dy(height)=${dy.toFixed(2)}, dz(width/len)=${dz.toFixed(2)}`);
});
