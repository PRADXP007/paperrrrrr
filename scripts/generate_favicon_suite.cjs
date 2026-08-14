const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. High-fidelity SVG of the Paperrrrrr Icon Mark
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#241B18" />
      <stop offset="100%" stop-color="#12100E" />
    </linearGradient>

    <!-- Terracotta Brand Gradient -->
    <linearGradient id="terracottaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E07A5F" />
      <stop offset="50%" stop-color="#C3644B" />
      <stop offset="100%" stop-color="#97422C" />
    </linearGradient>

    <!-- Luminous Accent Gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFB4A2" />
      <stop offset="100%" stop-color="#C3644B" />
    </linearGradient>

    <!-- Paper Sheet Gradient 1 (Back Sheet) -->
    <linearGradient id="sheetBack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E2DCD5" />
    </linearGradient>

    <!-- Paper Sheet Gradient 2 (Front Sheet) -->
    <linearGradient id="sheetFront" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF9F5" />
      <stop offset="100%" stop-color="#D8CFCA" />
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="dropShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Container Rounded Squircle -->
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bgGrad)" stroke="#C3644B" stroke-opacity="0.25" stroke-width="4" />

  <!-- Geometric Layer 1: Back Document Folio -->
  <g filter="url(#softShadow)">
    <rect x="136" y="104" width="240" height="304" rx="20" fill="url(#sheetBack)" transform="rotate(-6 256 256)" opacity="0.85" />
    <path d="M 312 90 L 370 148 L 312 148 Z" fill="#C5BCB6" transform="rotate(-6 256 256)" opacity="0.9" />
  </g>

  <!-- Geometric Layer 2: Middle Document Folio -->
  <g filter="url(#softShadow)">
    <rect x="144" y="112" width="224" height="288" rx="18" fill="url(#sheetFront)" transform="rotate(3 256 256)" />
    <!-- Subtle document rule lines -->
    <rect x="180" y="170" width="120" height="10" rx="5" fill="#88726D" opacity="0.35" transform="rotate(3 256 256)" />
    <rect x="180" y="196" width="150" height="10" rx="5" fill="#88726D" opacity="0.35" transform="rotate(3 256 256)" />
    <rect x="180" y="222" width="135" height="10" rx="5" fill="#88726D" opacity="0.35" transform="rotate(3 256 256)" />
  </g>

  <!-- Geometric Layer 3: Dynamic Paperrrrrr Monogram / Synthesis Fold -->
  <g filter="url(#dropShadow)">
    <!-- Primary P Spine / Fold -->
    <path d="M 176 140 
             L 248 140 
             C 304 140 344 176 344 232 
             C 344 288 304 324 248 324 
             L 220 324 
             L 220 372 
             L 176 372 Z" 
          fill="url(#terracottaGrad)" />
    
    <!-- P Inner Loop Counter (Clear Cutout with Accent Glow) -->
    <path d="M 220 180 
             L 246 180 
             C 278 180 300 200 300 232 
             C 300 264 278 284 246 284 
             L 220 284 Z" 
          fill="#1A1513" />

    <!-- Isometric Folding Accent Shard -->
    <path d="M 176 140 L 220 180 L 176 220 Z" fill="url(#accentGrad)" opacity="0.9" />
    
    <!-- Spark of Intelligence / Synthesis Starlet -->
    <path d="M 336 128 
             Q 336 156 364 156 
             Q 336 156 336 184 
             Q 336 156 308 156 
             Q 336 156 336 128 Z" 
          fill="url(#accentGrad)" />
  </g>
</svg>`;

// 2. Monochrome / High-Contrast Favicon Version for Small Tab Scales
const svgFaviconSmall = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E07A5F" />
      <stop offset="100%" stop-color="#97422C" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#181412" />
  <rect x="2" y="2" width="60" height="60" rx="12" fill="none" stroke="#C3644B" stroke-width="2" stroke-opacity="0.4" />
  <!-- Crisp P Monogram with Manuscript Fold -->
  <path d="M 16 12 
           L 35 12 
           C 47 12 53 19 53 28 
           C 53 37 47 44 35 44 
           L 26 44 
           L 26 52 
           L 16 52 Z" 
        fill="url(#favGrad)" />
  <path d="M 26 21 
           L 34 21 
           C 40 21 43 24 43 28 
           C 43 32 40 35 34 35 
           L 26 35 Z" 
        fill="#181412" />
  <!-- Little Spark -->
  <circle cx="48" cy="14" r="3.5" fill="#FFB4A2" />
</svg>`;

async function buildFaviconSuite() {
  const publicDir = path.join(__dirname, '../public');
  const appDir = path.join(__dirname, '../app');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

  const svgBuffer = Buffer.from(svgIcon);
  const svgFaviconBuffer = Buffer.from(svgFaviconSmall);

  console.log("Generating Paperrrrrr favicon asset suite with sharp...");

  // 1. Generate 512x512 icon
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512x512.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(appDir, 'icon.png'));

  // 2. Generate 192x192 icon
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192x192.png'));

  // 3. Generate 180x180 apple-touch-icon
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(appDir, 'apple-icon.png'));

  // 4. Generate 32x32 & 16x16 PNGs
  await sharp(svgFaviconBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(svgFaviconBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));

  // 5. Generate .ico for public/ and app/ (32x32 format)
  const ico32Buffer = await sharp(svgFaviconBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico32Buffer);

  // 6. Save master SVG in public for crisp vector displays
  fs.writeFileSync(path.join(publicDir, 'paperrrrrr-logo.svg'), svgIcon);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFaviconSmall);

  console.log("Favicon suite generated successfully in public/ and app/!");
}

buildFaviconSuite().catch(console.error);
