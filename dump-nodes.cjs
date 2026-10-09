const fs = require('fs');

function dumpAllMeshes(path) {
  const buf = fs.readFileSync(path);
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  console.log('===', path, '===');
  console.log('Nodes count:', gltf.nodes ? gltf.nodes.length : 0);
  (gltf.nodes || []).forEach((n, idx) => {
    console.log(`Node ${idx}: "${n.name || ''}" mesh=${n.mesh} rot=${n.rotation} trans=${n.translation} scale=${n.scale}`);
  });
}

dumpAllMeshes('public/models/3d_model__passenger_tricycle_keke_napep.glb');
dumpAllMeshes('public/models/honda_today_g-type_police.glb');
