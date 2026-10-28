const fs = require('node:fs');
const path = require('node:path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('html-minifier-terser');

(async () => {
  const source = fs.readFileSync('index.html', 'utf8');
  let count = 0;
  let output = source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (whole, attributes, code) => {
    if (/\bsrc\s*=/.test(attributes) || /\btype\s*=\s*["']?module\b/i.test(attributes) || !code.trim()) return whole;
    count++;
    const result = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      renameGlobals: false,
      renameProperties: false,
      identifierNamesGenerator: 'hexadecimal',
      stringArray: true,
      stringArrayThreshold: 0.25,
      stringArrayEncoding: ['base64'],
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      selfDefending: false,
      sourceMap: false
    }).getObfuscatedCode();
    return `<script${attributes}>${result}</script>`;
  });
  output = await minify(output, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    minifyCSS: false,
    minifyJS: false,
    removeAttributeQuotes: false,
    removeOptionalTags: false,
    keepClosingSlash: true,
    caseSensitive: true,
    ignoreCustomFragments: [/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi]
  });
 fs.mkdirSync('protected', { recursive: true });
fs.writeFileSync('protected/index.html', output, 'utf8');

// 이미지 및 PDF 파일을 배포 폴더에 복사
const assets = fs.readdirSync('.');

for (const file of assets) {
  if (!fs.statSync(file).isFile()) continue;

  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|pdf)$/i.test(file)) {
    fs.copyFileSync(file, path.join('protected', file));
    console.log(`Copied asset: ${file}`);
  }
}

console.log(`Protected ${count} classic scripts. Output: protected/index.html`);
})().catch(e => { console.error(e); process.exit(1); });
