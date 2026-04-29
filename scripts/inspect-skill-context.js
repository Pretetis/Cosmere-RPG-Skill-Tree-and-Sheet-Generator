// Inspeciona o texto extraído do PDF em torno das habilidades problemáticas.
// Uso: node scripts/inspect-skill-context.js "Treinamento de Combate" "Treinamento Fractal"

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const CONF_DIR = path.join(ROOT, 'confidential');
const CACHE    = path.join(ROOT, 'temp', 'pdf_raw_text.txt');
const WINDOW   = parseInt(process.env.W || '600', 10);

function joinByYThenX(items) {
  const s = items.slice().sort((a, b) => {
    const dy = b.transform[5] - a.transform[5];
    if (Math.abs(dy) > 2) return dy;
    return a.transform[4] - b.transform[4];
  });
  let out = '', lastY = null;
  for (const it of s) {
    if (!it.str) continue;
    const y = it.transform[5];
    if (lastY !== null && Math.abs(lastY - y) > 2) out += '\n';
    else if (out.length && !/\s$/.test(out))      out += ' ';
    out += it.str;
    lastY = y;
  }
  return out;
}
function pageItemsToText(items, w) {
  const mid = w / 2, cols = [[],[]];
  for (const it of items) if (it.str) cols[it.transform[4] < mid ? 0 : 1].push(it);
  const min = Math.min(cols[0].length, cols[1].length), tot = cols[0].length + cols[1].length;
  if (tot < 20 || min / tot < 0.1) return joinByYThenX(items);
  return joinByYThenX(cols[0]) + '\n' + joinByYThenX(cols[1]);
}

async function extractText(pdfPath) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf  = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    process.stdout.write(`\r  página ${p}/${pdf.numPages}`);
    const page     = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content  = await page.getTextContent();
    text += `\n=== PAGE ${p} ===\n` + pageItemsToText(content.items, viewport.width) + '\n';
  }
  process.stdout.write('\n');
  return text;
}

async function getRawText() {
  if (fs.existsSync(CACHE)) return fs.readFileSync(CACHE, 'utf8');
  const pdfs = fs.readdirSync(CONF_DIR).filter(f => f.endsWith('.pdf'));
  const pdfPath = path.join(CONF_DIR, pdfs[0]);
  const text = await extractText(pdfPath);
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, text, 'utf8');
  return text;
}

(async () => {
  const queries = process.argv.slice(2);
  if (!queries.length) { console.error('uso: node ... "Nome 1" "Nome 2"'); process.exit(1); }
  const raw = await getRawText();

  for (const q of queries) {
    console.log(`\n${'='.repeat(80)}\n"${q}"\n${'='.repeat(80)}`);
    let pos = raw.indexOf(q), n = 0;
    while (pos !== -1 && n < 8) {
      const before = raw.substring(Math.max(0, pos - 200), pos);
      const after  = raw.substring(pos, Math.min(raw.length, pos + WINDOW));
      const pageMatch = raw.substring(0, pos).match(/=== PAGE (\d+) ===/g);
      const page = pageMatch ? pageMatch[pageMatch.length - 1] : '?';
      console.log(`\n--- Match #${++n} pos=${pos} ${page} ---`);
      console.log('ANTES :', JSON.stringify(before));
      console.log('DEPOIS:', JSON.stringify(after));
      pos = raw.indexOf(q, pos + 1);
    }
  }
})();
