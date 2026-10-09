const fs = require('fs');

function inspectPoliceMeshes() {
  const buf = fs.readFileSync('public/models/honda_today_g-type_police.glb');
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  console.log('Police meshes:');
  gltf.meshes.forEach((m, idx) => {
    const prim = m.primitives[0];
    const acc = gltf.accessors[prim.attributes.POSITION];
    const dx = acc.max[0] - acc.min[0];
    const dy = acc.max[1] - acc.min[1];
    const dz = acc.max[2] - acc.min[2];
    console.log(`Mesh ${idx} "${m.name}": size=(${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)}) min_y=${acc.min[1].toFixed(2)}`);
  });
}

inspectPoliceMeshes();
