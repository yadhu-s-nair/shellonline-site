#!/usr/bin/env node
/*
 * shellonline site builder — zero dependencies, plain Node.
 *
 * Usage:
 *   node build.js [--config path/to/config.json] [--out path/to/dist]
 *
 * Reads config.json, renders partials/*.html + pages/*.html through a tiny
 * mustache-style templating engine, copies assets/, and writes everything to
 * the output directory (default: ./dist next to this script).
 */
'use strict';
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { config: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') args.config = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

// ---------- tiny templating engine ----------
// Supports: {{path.to.value}} (escaped), {{{path.to.value}}} (raw),
// {{#each path}}...{{/each}}, {{#if path}}...{{/if}}, {{#unless path}}...{{/unless}}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function resolve(pathExpr, item, root) {
  if (pathExpr === 'this') return item;
  if (pathExpr.startsWith('this.')) return getPath(item, pathExpr.slice(5));
  let v;
  if (item && typeof item === 'object') v = getPath(item, pathExpr);
  if (v === undefined) v = getPath(root, pathExpr);
  return v;
}

const TAG_RE = /\{\{\{(.+?)\}\}\}|\{\{(.+?)\}\}/g;

function tokenize(str) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  let lastIndex = 0;
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(str)) !== null) {
    const text = str.slice(lastIndex, match.index);
    if (text) stack[stack.length - 1].children.push({ type: 'text', value: text });
    lastIndex = TAG_RE.lastIndex;

    if (match[1] !== undefined) {
      // triple-brace raw output
      stack[stack.length - 1].children.push({ type: 'raw', path: match[1].trim() });
      continue;
    }
    const raw = match[2].trim();
    if (raw.startsWith('#each ')) {
      const node = { type: 'each', path: raw.slice(6).trim(), children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (raw === '/each') {
      stack.pop();
    } else if (raw.startsWith('#if ')) {
      const node = { type: 'if', path: raw.slice(4).trim(), children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (raw === '/if') {
      stack.pop();
    } else if (raw.startsWith('#unless ')) {
      const node = { type: 'unless', path: raw.slice(8).trim(), children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (raw === '/unless') {
      stack.pop();
    } else {
      stack[stack.length - 1].children.push({ type: 'var', path: raw });
    }
  }
  const tail = str.slice(lastIndex);
  if (tail) stack[stack.length - 1].children.push({ type: 'text', value: tail });
  return root;
}

function render(node, item, root, out) {
  for (const child of node.children) {
    switch (child.type) {
      case 'text':
        out.push(child.value);
        break;
      case 'var': {
        const v = resolve(child.path, item, root);
        out.push(v === undefined || v === null ? '' : escapeHtml(v));
        break;
      }
      case 'raw': {
        const v = resolve(child.path, item, root);
        out.push(v === undefined || v === null ? '' : String(v));
        break;
      }
      case 'each': {
        const arr = resolve(child.path, item, root) || [];
        for (const el of arr) render(child, el, root, out);
        break;
      }
      case 'if': {
        const v = resolve(child.path, item, root);
        if (v) render(child, item, root, out);
        break;
      }
      case 'unless': {
        const v = resolve(child.path, item, root);
        if (!v) render(child, item, root, out);
        break;
      }
    }
  }
}

function renderTemplate(str, config) {
  const tree = tokenize(str);
  const out = [];
  render(tree, config, config, out);
  return out.join('');
}

// ---------- file helpers ----------
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// ---------- main ----------
function main() {
  const args = parseArgs(process.argv.slice(2));
  const templateDir = __dirname;
  const configPath = path.resolve(args.config || path.join(templateDir, 'config.json'));
  const outDir = path.resolve(args.out || path.join(templateDir, 'dist'));

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // derived fields so the config author never has to hand-encode a URL
  if (config.business) {
    config.business.whatsappDefaultMessageEncoded = encodeURIComponent(
      config.business.whatsappDefaultMessage || ''
    );
  }
  config.currentYear = String(new Date().getFullYear());

  const headerSrc = fs.readFileSync(path.join(templateDir, 'partials', 'header.html'), 'utf8');
  const footerSrc = fs.readFileSync(path.join(templateDir, 'partials', 'footer.html'), 'utf8');

  rmDir(outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const pageKeyByFile = {
    'index.html': 'home',
    'services.html': 'services',
    'about.html': 'about',
    'contact.html': 'contact',
    'gallery.html': 'gallery',
  };

  const pagesDir = path.join(templateDir, 'pages');
  const pageFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html'));
  let totalBytes = 0;
  for (const file of pageFiles) {
    let src = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    src = src.replace('{{> header}}', headerSrc).replace('{{> footer}}', footerSrc);
    const pageKey = pageKeyByFile[file];
    const pageConfig = Object.assign({}, config, { page: config.pages[pageKey] });
    const rendered = renderTemplate(src, pageConfig);
    fs.writeFileSync(path.join(outDir, file), rendered, 'utf8');
    totalBytes += Buffer.byteLength(rendered, 'utf8');
    console.log(`built ${file} (${Buffer.byteLength(rendered, 'utf8')} bytes)`);
  }

  // theme.css generated from config so colours/fonts are a one-file edit
  const theme = config.theme || {};
  const themeCss = `:root {
  --color-primary: ${theme.primaryColor || '#1f6f54'};
  --color-secondary: ${theme.secondaryColor || '#0f3d30'};
  --color-accent: ${theme.accentColor || '#e8a13a'};
  --color-text: ${theme.textColor || '#222222'};
  --color-bg: ${theme.backgroundColor || '#ffffff'};
  --color-bg-alt: ${theme.backgroundAltColor || '#f6f4ef'};
  --font-heading: ${theme.headingFont || "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"};
  --font-body: ${theme.bodyFont || "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"};
}
`;
  fs.writeFileSync(path.join(outDir, 'theme.css'), themeCss, 'utf8');

  copyDir(path.join(templateDir, 'assets'), path.join(outDir, 'assets'));

  const styleBytes = fs.statSync(path.join(templateDir, 'assets', 'css', 'style.css')).size;
  console.log(`\nBuilt ${pageFiles.length} pages to ${outDir}`);
  console.log(`Approx first-view weight (index.html + theme.css + style.css): ${(totalBytes / pageFiles.length + styleBytes + themeCss.length)} bytes (excludes gallery photos you add).`);
}

main();
