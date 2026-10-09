const fs = require('fs');

function inspectMeshes(path) {
  const buf = fs.readFileSync(path);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  console.log('===', path, '===');
  gltf.meshes.forEach((m, idx) => {
    // Check accessor min/max
    const prim = m.primitives[0];
    const posAccIdx = prim.attributes.POSITION;
    const acc = gltf.accessors[posAccIdx];
    console.log(`Mesh ${idx} "${m.name || ''}": min=${acc.min} max=${acc.max}`);
  });
}

inspectMeshes('public/models/honda_today_g-type_police.glb');
inspectMeshes('public/models/3d_model__passenger_tricycle_keke_napep.glb');
