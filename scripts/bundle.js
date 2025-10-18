const fs = require('fs');
const path = require('path');

const files = [
  'dist/index.js',
  'dist/EventEmitter.js',
  'dist/MessageParser.js',
  'dist/WebSocketManager.js',
  'dist/types.js'
];

const outputFile = 'dist/kick-ws.js';

// Leer y combinar archivos
let combinedContent = '';

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Remover sourceMappingURL del final del archivo
  const cleanedContent = content.replace(/\/\/# sourceMappingURL=.*\.map$/, '');

  combinedContent += cleanedContent + '\n\n';
});

// Escribir archivo combinado
fs.writeFileSync(path.join(__dirname, '..', outputFile), combinedContent);

console.log('✅ Bundle creado:', outputFile);
