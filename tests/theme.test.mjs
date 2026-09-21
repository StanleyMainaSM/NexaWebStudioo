import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

assert.equal(exists('src/lib/theme.tsx'), false, 'Theme context file must be removed.');
assert.equal(exists('src/components/ThemeToggle.tsx'), false, 'Theme toggle component must be removed.');

const mainSource = read('src/main.tsx');
const htmlSource = read('index.html');
const cssSource = read('src/index.css');
const tailwindSource = read('tailwind.config.js');
const servicesSource = read('src/pages/Services.tsx');
const footerSource = read('src/components/Footer.tsx');

assert.doesNotMatch(mainSource, /<ThemeProvider>/, 'Main entry point must not mount ThemeProvider.');
assert.doesNotMatch(mainSource, /<ThemeToggle \/>/, 'Main entry point must not mount ThemeToggle.');

assert.match(htmlSource, /data-theme="light"/, 'HTML document must declare light theme.');
assert.match(htmlSource, /localStorage\.removeItem\('avelixa-theme'\)/, 'Pre-React bootstrap must clear any legacy theme preference.');
assert.match(htmlSource, /theme-color["'] content=["']#f8fafc["']/, 'Theme color meta tag must be light.');

assert.doesNotMatch(cssSource, /\[data-theme='dark'\]/, 'CSS must not contain dark mode rules.');
assert.doesNotMatch(cssSource, /\.theme-toggle/, 'CSS must not contain theme toggle styles.');

assert.match(cssSource, /--avelixa-page:\s*248 250 252/, 'CSS must declare clean light page background token.');
assert.match(cssSource, /service-card-1[\s\S]*service-card-6/, 'Service cards must have refined light mode gradients.');
assert.match(cssSource, /text-gray-400[\s\S]*475569/, 'Light mode must provide comfortable contrast for gray text.');
assert.match(cssSource, /social-instagram[\s\S]*social-facebook[\s\S]*social-whatsapp/, 'Social controls must retain brand colors.');
assert.doesNotMatch(cssSource, /filter:\s*(?:grayscale|invert|saturate)/i, 'Theme CSS must not globally filter photographs.');

assert.match(tailwindSource, /--avelixa-ink-950/, 'Tailwind ink colors must use theme tokens.');
assert.match(servicesSource, /service-grid/, 'Services must use a dedicated visual card grid.');
assert.match(servicesSource, /service-card service-card-/, 'Service cards must carry visual style hooks.');
assert.match(footerSource, /label:\s*'Instagram'/, 'Instagram link must be retained.');
assert.match(footerSource, /label:\s*'WhatsApp'/, 'WhatsApp link must be retained.');

console.log('Light-only theme verification tests passed.');
