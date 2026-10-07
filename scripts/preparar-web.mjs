import { mkdir, copyFile } from 'node:fs/promises';

// Lista explícita: solo archivos públicos; nunca bases, respaldos o credenciales.
const archivos = ['index.html', 'css/styles.css', 'js/app.js', 'js/turnos.js', 'js/veterinarios.js', 'js/historial.js'];
for (const archivo of archivos) {
  const destino = new URL(`../dist/web/${archivo}`, import.meta.url);
  await mkdir(new URL('.', destino), { recursive: true });
  await copyFile(new URL(`../${archivo}`, import.meta.url), destino);
}
console.log('Archivos públicos preparados en dist/web.');
