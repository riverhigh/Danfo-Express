const fs = require('fs');

// Inspect keke and police meshes using node
function inspectGlbScene(path) {
  const buf = fs.readFileSync(path);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  console.log('===', path, '===');
  // Check meshes with low height or round shape
  gltf.meshes.forEach((m, idx) => {
    const prim = m.primitives[0];
    const acc = gltf.accessors[prim.attributes.POSITION];
    const min = acc.min;
    const max = acc.max;
    const dx = Math.abs(max[0] - min[0]);
    const dy = Math.abs(max[1] - min[1]);
    const dz = Math.abs(max[2] - min[2]);
    // check if it's very flat (dy very small compared to dx and dz)
    if (dy < 0.25 && dx > 1.0 && dz > 1.0) {
      console.log(`POTENTIAL SHADOW/CIRCLE DISK: Mesh ${idx} "${m.name || ''}" size=(${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)}) y range=[${min[1].toFixed(3)}, ${max[1].toFixed(3)}]`);
    }
  });
}

inspectGlbScene('public/models/3d_model__passenger_tricycle_keke_napep.glb');
inspectGlbScene('public/models/honda_today_g-type_police.glb');
