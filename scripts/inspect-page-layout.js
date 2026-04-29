// Mostra os itens de uma página com coordenadas (x, y) para inspecionar layout em colunas.
// Uso: node scripts/inspect-page-layout.js 121

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PDF  = path.join(ROOT, 'confidential', 'Guerra-das-Tempestades-Guia-de-Regras-v1.01.pdf');

(async () => {
  const pageNum = parseInt(process.argv[2] || '121', 10);
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;

  const data = new Uint8Array(fs.readFileSync(PDF));
  const pdf  = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();

  // Ordena por Y (descrescente, top→bottom no PDF coords) e depois X
  const items = content.items.map(it => ({
    str: it.str,
    x: Math.round(it.transform[4]),
    y: Math.round(it.transform[5]),
    eol: !!it.hasEOL,
  }));

  // Agrupa por Y (linhas)
  const byY = {};
  for (const it of items) {
    const k = it.y;
    (byY[k] = byY[k] || []).push(it);
  }

  // Imprime linhas top→bottom, e dentro de cada linha left→right
  const ys = Object.keys(byY).map(Number).sort((a,b)=>b-a);
  for (const y of ys) {
    const line = byY[y].sort((a,b)=>a.x-b.x);
    const text = line.map(it => `[x=${it.x}] ${it.str}`).join(' | ');
    console.log(`y=${y}: ${text}`);
  }
})();
