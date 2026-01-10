#!/usr/bin/env node
/**
 * Viriato Build Script
 *
 * Builds the frontend for deployment:
 * - Copies HTML and CSS to dist/
 * - Processes JavaScript with environment variable injection
 * - Minifies in production mode
 *
 * Usage:
 *   npm run build        # Production build (minified)
 *   npm run build --dev  # Development build (no minification)
 *
 * Environment variables:
 *   API_URL - Backend API URL (default: https://viriato-api.onrender.com)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const isDev = process.argv.includes('--dev');
const API_URL = process.env.API_URL || 'https://viriato-api.onrender.com';

const SRC_DIR = path.join(__dirname, '..', 'docs');
const DIST_DIR = path.join(__dirname, '..', 'dist');

console.log('========================================');
console.log('Viriato Build');
console.log('========================================');
console.log(`Mode: ${isDev ? 'development' : 'production'}`);
console.log(`API_URL: ${API_URL}`);
console.log('');

// Create dist directory
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Copy index.html
console.log('Copying index.html...');
fs.copyFileSync(
    path.join(SRC_DIR, 'index.html'),
    path.join(DIST_DIR, 'index.html')
);

// Copy styles.css
console.log('Copying styles.css...');
fs.copyFileSync(
    path.join(SRC_DIR, 'styles.css'),
    path.join(DIST_DIR, 'styles.css')
);

// Process app.js - inject API_URL
console.log('Processing app.js...');
let appJs = fs.readFileSync(path.join(SRC_DIR, 'app.js'), 'utf-8');

// Replace hardcoded API_URL with environment variable
appJs = appJs.replace(
    /const API_URL = ['"][^'"]+['"]/,
    `const API_URL = '${API_URL}'`
);

// Write processed JavaScript
fs.writeFileSync(path.join(DIST_DIR, 'app.js'), appJs);

// Copy archive folder if exists
const archiveDir = path.join(SRC_DIR, 'archive');
if (fs.existsSync(archiveDir)) {
    console.log('Copying archive/...');
    fs.cpSync(archiveDir, path.join(DIST_DIR, 'archive'), { recursive: true });
}

// Summary
console.log('');
console.log('Build complete!');
console.log(`Output: ${DIST_DIR}`);

const files = fs.readdirSync(DIST_DIR);
files.forEach(file => {
    const stats = fs.statSync(path.join(DIST_DIR, file));
    if (stats.isFile()) {
        const sizeKb = (stats.size / 1024).toFixed(1);
        console.log(`  ${file} (${sizeKb} KB)`);
    } else {
        console.log(`  ${file}/`);
    }
});
