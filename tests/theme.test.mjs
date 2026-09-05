import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const themeSource = read('src/lib/theme.tsx');
const mainSource = read('src/main.tsx');
const htmlSource = read('index.html');
const cssSource = read('src/index.css');
const tailwindSource = read('tailwind.config.js');
const servicesSource = read('src/pages/Services.tsx');
const footerSource = read('src/components/Footer.tsx');

assert.match(themeSource, /DEFAULT_THEME:\s*Theme\s*=\s*'light'/, 'Light must be the default theme.');
assert.match(themeSource, /localStorage\.getItem\(THEME_STORAGE_KEY\)/, 'Theme should restore persisted preference.');
assert.match(themeSource, /localStorage\.setItem\(THEME_STORAGE_KEY, theme\)/, 'Theme should persist the selected preference.');
assert.match(themeSource, /root\.dataset\.theme\s*=\s*theme/, 'Theme state should be applied centrally to the document root.');
assert.match(themeSource, /current === 'light' \? 'dark' : 'light'/, 'Theme toggle must switch between Light and Dark.');
assert.match(mainSource, /<ThemeProvider>/, 'The application must use the centralized ThemeProvider.');
assert.match(mainSource, /<ThemeToggle \/>/, 'A shared theme toggle must be mounted globally.');
assert.match(htmlSource, /avelixa-theme/, 'The pre-React bootstrap must restore the theme preference.');
assert.match(htmlSource, /const theme = stored === 'dark' \|\| stored === 'light' \? stored : 'light'/, 'The pre-React default must be Light.');
assert.match(cssSource, /\[data-theme='light'\]/, 'Light theme tokens must exist centrally.');
assert.match(cssSource, /\[data-theme='dark'\]/, 'Dark theme tokens must exist centrally.');
assert.match(cssSource, /\.theme-toggle/, 'The theme control must have centralized accessible styling.');
assert.match(cssSource, /--avelixa-surface-accent/, 'Light/dark themes must provide a deliberate accent surface token.');
assert.match(cssSource, /service-card-1[\s\S]*service-card-6/, 'Light mode service cards must have restrained visual differentiation.');
assert.match(cssSource, /social-instagram[\s\S]*social-facebook[\s\S]*social-whatsapp/, 'Social controls must retain recognizable brand colors.');
assert.doesNotMatch(cssSource, /filter:\s*(?:grayscale|invert|saturate)/i, 'Theme CSS must not globally filter photographs or illustrations.');
assert.match(tailwindSource, /--avelixa-ink-950/, 'Tailwind ink colors must use centralized theme tokens.');
assert.match(servicesSource, /service-grid/, 'Services must use a dedicated visual card grid.');
assert.match(servicesSource, /service-card service-card-/, 'Service cards must carry differentiated theme hooks.');
assert.match(servicesSource, /object-cover/, 'Service imagery must preserve intentional image sizing without theme filters.');
assert.match(footerSource, /data-social="social-instagram"/, 'Instagram must retain a dedicated social brand treatment.');
assert.match(footerSource, /data-social="social-whatsapp"/, 'WhatsApp must retain a dedicated social brand treatment.');

console.log('Theme system regression tests passed.');
