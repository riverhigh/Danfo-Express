const fs = require('fs');

function dumpKekeNodes() {
  const buf = fs.readFileSync('public/models/3d_model__passenger_tricycle_keke_napep.glb');
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  console.log('Keke nodes:');
  (gltf.nodes || []).forEach((n, idx) => {
    console.log(`Node ${idx}: "${n.name || ''}" mesh=${n.mesh} rot=${n.rotation}`);
  });
}

dumpKekeNodes();
