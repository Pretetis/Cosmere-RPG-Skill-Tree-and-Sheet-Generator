const fs = require('fs');
const path = require('path');
const PDF = path.join(__dirname, '..', 'confidential', 'Guerra-das-Tempestades-Guia-de-Regras-v1.01.pdf');
(async () => {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
  const data = new Uint8Array(fs.readFileSync(PDF));
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await pdf.getPage(121);
  const content = await page.getTextContent();
  // ordem original
  for (let i = 0; i < Math.min(content.items.length, 30); i++) {
    const it = content.items[i];
    console.log(i, `x=${Math.round(it.transform[4])} y=${Math.round(it.transform[5])}`, JSON.stringify(it.str));
  }
})();
