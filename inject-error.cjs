const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Inject a global error catcher before the React script
const errorScript = `
    <script>
      window.addEventListener('error', function(e) {
        document.body.innerHTML = '<div style="background:red;color:white;padding:20px;font-family:sans-serif;z-index:999999;position:absolute;inset:0;overflow:auto;"><h1>Crash!</h1><pre>' + e.error?.stack + '</pre></div>';
      });
      window.addEventListener('unhandledrejection', function(e) {
        document.body.innerHTML = '<div style="background:red;color:white;padding:20px;font-family:sans-serif;z-index:999999;position:absolute;inset:0;overflow:auto;"><h1>Promise Crash!</h1><pre>' + e.reason?.stack + '</pre></div>';
      });
    </script>
`;

if (!indexHtml.includes('Crash!')) {
  indexHtml = indexHtml.replace('</head>', errorScript + '</head>');
  fs.writeFileSync('index.html', indexHtml);
  console.log('Error catcher injected');
} else {
  console.log('Already injected');
}
