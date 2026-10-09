const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
const iconLink = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23facc15'/><rect x='10' y='30' width='80' height='12' fill='%2309090b'/><rect x='10' y='50' width='80' height='12' fill='%2309090b'/><circle cx='30' cy='78' r='10' fill='%23292524'/><circle cx='70' cy='78' r='10' fill='%23292524'/><text x='50' y='25' font-size='16' font-family='sans-serif' font-weight='900' text-anchor='middle' fill='%2309090b'>DANFO</text></svg>">`;
code = code.replace('<title>Danfo Express</title>', `<title>Danfo Express</title>\n    ${iconLink}`);
fs.writeFileSync('index.html', code);
