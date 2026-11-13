// Copia os arquivos da leitura de notas (Tesseract) para public/tesseract,
// para o app não depender de sites externos (CDN). Roda sozinho antes do dev e do build.
import { copyFileSync, mkdirSync } from 'node:fs'

const destino = 'public/tesseract'
mkdirSync(destino, { recursive: true })
const arquivos = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz', 'por.traineddata.gz'],
]
for (const [de, para] of arquivos) copyFileSync(de, `${destino}/${para}`)
console.log('Arquivos de leitura de nota copiados para', destino)
