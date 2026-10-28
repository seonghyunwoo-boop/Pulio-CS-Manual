const fs = require('node:fs');
const path = require('node:path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify } = require('html-minifier-terser');

(async () => {
  const source = fs.readFileSync('index.html', 'utf8');

  let count = 0;

  let output = source.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    (whole, attributes, code) => {
      if (
        /\bsrc\s*=/.test(attributes) ||
        /\btype\s*=\s*["']?module\b/i.test(attributes) ||
        !code.trim()
      ) {
        return whole;
      }

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
    }
  );

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
    ignoreCustomFragments: [
      /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi
    ]
  });

  // 배포 폴더 생성
  fs.mkdirSync('protected', { recursive: true });

  // 난독화된 HTML 저장
  fs.writeFileSync(
    'protected/index.html',
    output,
    'utf8'
  );

  // 이미지 및 PDF 파일 복사
  const assetExtensions = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.ico',
    '.pdf'
  ]);

  let copiedCount = 0;

  function copyAssets(sourceDir, targetDir) {
    const entries = fs.readdirSync(sourceDir, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        // 빌드 결과물 및 개발 관련 폴더 제외
        if (
          [
            'protected',
            'node_modules',
            '.git',
            '.github',
            'scripts'
          ].includes(entry.name)
        ) {
          continue;
        }

        fs.mkdirSync(targetPath, { recursive: true });
        copyAssets(sourcePath, targetPath);
      } else if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase();

        if (assetExtensions.has(extension)) {
          fs.copyFileSync(sourcePath, targetPath);
          copiedCount++;

          console.log('Copied asset:', sourcePath);
        }
      }
    }
  }

  copyAssets('.', 'protected');

  console.log(
    `Protected ${count} classic scripts. Output: protected/index.html`
  );

  console.log(
    `Copied ${copiedCount} image/PDF assets.`
  );

})().catch(error => {
  console.error(error);
  process.exit(1);
});
