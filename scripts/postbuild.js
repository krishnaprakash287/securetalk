import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtmlPath)) {
  const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

  // 1. Create 404.html fallback for static hosts
  fs.writeFileSync(path.join(distDir, '404.html'), indexContent);

  // 2. SPA routes to generate physical files for
  const routes = [
    'reset-password',
    'forgot-password',
    'login',
    'register',
    'verify-email',
    'chats',
    'settings',
    'settings/devices',
    'settings/security',
    'security',
    'security/report',
    'privacy',
    'terms',
  ];

  for (const route of routes) {
    const routeDir = path.join(distDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), indexContent);

    // Also write top-level .html file
    if (!route.includes('/')) {
      fs.writeFileSync(path.join(distDir, `${route}.html`), indexContent);
    }
  }

  console.log('Postbuild: Successfully generated SPA route fallbacks and 404.html.');
} else {
  console.warn('Postbuild: dist/index.html not found, skipping route fallback generation.');
}
