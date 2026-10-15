import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function siteProxyPlugin(): Plugin {
  return {
    name: 'site-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy-site', async (req, res) => {
        try {
          const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost:3000'}`);
          let targetUrl = reqUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Missing url parameter');
            return;
          }

          // Normalize URLs
          if (targetUrl.includes('getsolarfirst.com') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://getsolarfirst.com';
          } else if (targetUrl.includes('myags.school') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://www.myags.school';
          }

          const targetObj = new URL(targetUrl);
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            redirect: 'follow',
          });

          let html = await response.text();

          // Inject base href tag so external CSS, scripts, and images resolve correctly
          const baseTag = `<base href="${targetObj.origin}/" />`;
          // Prevent frame-busting scripts from navigating top window away
          const securityPatch = `
            <script>
              try {
                if (window.top !== window.self) {
                  Object.defineProperty(window, 'top', { get: () => window.self });
                  Object.defineProperty(window, 'parent', { get: () => window.self });
                }
              } catch (e) {}
            </script>
          `;

          if (html.includes('<head>')) {
            html = html.replace('<head>', `<head>${baseTag}${securityPatch}`);
          } else if (html.includes('<HEAD>')) {
            html = html.replace('<HEAD>', `<HEAD>${baseTag}${securityPatch}`);
          } else {
            html = `${baseTag}${securityPatch}${html}`;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');
          res.removeHeader('Cross-Origin-Opener-Policy');
          res.end(html);
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`<html><body style="font-family:sans-serif;padding:24px;background:#0c0a09;color:#facc15"><h3>Live site temporarily unreachable</h3><p>${err.message}</p></body></html>`);
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), siteProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 5000,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
