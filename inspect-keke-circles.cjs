const fs = require('fs');

function inspectKekeCircles() {
  const buf = fs.readFileSync('public/models/3d_model__passenger_tricycle_keke_napep.glb');
  const jsonChunkLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
  const gltf = JSON.parse(jsonStr);
  gltf.nodes.forEach((n, idx) => {
    if (n.name && (n.name.toLowerCase().includes('circle') || n.name.toLowerCase().includes('cylinder') || n.name.toLowerCase().includes('plane'))) {
      console.log(`Node ${idx} "${n.name}": mesh=${n.mesh} translation=${n.translation} scale=${n.scale}`);
    }
  });
}

inspectKekeCircles();
