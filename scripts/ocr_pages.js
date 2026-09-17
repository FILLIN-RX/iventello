const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const imgDir = 'temp_pages';
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.png')).sort();

async function runOCR() {
  const results = [];
  for (const file of files) {
    console.log(`Processing ${file}...`);
    const { data: { text } } = await Tesseract.recognize(
      path.join(imgDir, file),
      'fra',
      { logger: m => console.log(m) }
    );
    results.push({ page: file, text });
  }
  fs.writeFileSync('data_raw_text.json', JSON.stringify(results, null, 2));
  console.log('OCR done. Saved to data_raw_text.json');
}

runOCR().catch(console.error);
