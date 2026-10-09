const fs = require('fs');

function inspectPoliceAll(path) {
  const buf = fs.readFileSync(path);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  gltf.meshes.forEach((m, idx) => {
    const prim = m.primitives[0];
    const acc = gltf.accessors[prim.attributes.POSITION];
    console.log(`Police Mesh ${idx} "${m.name}": min_y=${acc.min[1]} max_y=${acc.max[1]} dx=${(acc.max[0]-acc.min[0]).toFixed(2)} dz=${(acc.max[2]-acc.min[2]).toFixed(2)}`);
  });
}

inspectPoliceAll('public/models/honda_today_g-type_police.glb');
