const fs = require("fs");
const path = require("path");

const outputFile = "dist/kick-wss.js";

// Leer el archivo principal (index.js) que contiene las exportaciones re-exportadas
const indexPath = path.join(__dirname, "..", "dist/index.js");
let indexContent = fs.readFileSync(indexPath, "utf8");

// Remover sourceMappingURL del final del archivo
indexContent = indexContent.replace(/\/\/# sourceMappingURL=.*\.map$/, "");

// Remover re-exports individuales del index.js para evitar duplicados
indexContent = indexContent.replace(
  /^export\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?$/gm,
  "",
);

// Remover import statements del index.js para que el bundle sea autocontenido
indexContent = indexContent.replace(
  /^import\s+\{[^}]*\}\s*from\s*["'][^"']*["'];?$/gm,
  "",
);
indexContent = indexContent.replace(
  /^import\s+\w+\s+from\s*["'][^"']*["'];?$/gm,
  "",
);

// Leer los archivos de implementación pero sin sus exportaciones individuales
const implementationFiles = [
  "dist/EventEmitter.js",
  "dist/MessageParser.js",
  "dist/WebSocketManager.js",
  "dist/types.js",
];

let implementationContent = "";

implementationFiles.forEach((file) => {
  const filePath = path.join(__dirname, "..", file);
  let content = fs.readFileSync(filePath, "utf8");

  // Remover sourceMappingURL del final del archivo
  content = content.replace(/\/\/# sourceMappingURL=.*\.map$/, "");

  // Remover export statements individuales para evitar duplicados
  content = content.replace(/^export\s+class\s+(\w+)/gm, "class $1");
  content = content.replace(
    /^export\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?$/gm,
    "",
  );
  content = content.replace(/^export\s+default\s+/gm, "");

  // Remover import statements para que el bundle sea autocontenido
  content = content.replace(
    /^import\s+\{[^}]*\}\s*from\s*["'][^"']*["'];?$/gm,
    "",
  );
  content = content.replace(/^import\s+\w+\s+from\s*["'][^"']*["'];?$/gm, "");

  implementationContent += content + "\n\n";
});

// Combinar: primero las implementaciones, luego el index con sus exportaciones
const combinedContent = implementationContent + indexContent;

// Escribir archivo combinado
fs.writeFileSync(path.join(__dirname, "..", outputFile), combinedContent);

console.log("✅ Bundle creado:", outputFile);
