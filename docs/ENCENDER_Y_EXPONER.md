# Encender VetTurnos el día de la exposición

## Antes de salir

Lleva el proyecto y la base de datos en el mismo equipo donde practicaste. GitHub guarda el código, pero no guarda `data/veterinaria.db`. Si descargas el repositorio en otro computador, empieza sin tus registros. Comprueba que Node.js 24 o superior está instalado con `node --version`.

## Encender desde Visual Studio Code

1. Abre VS Code y selecciona Archivo → Abrir carpeta.
2. Selecciona `C:\Users\CVILLOTA\Documents\New project\veterinaria`.
3. Entra a Terminal → Nueva terminal. Debes ver `veterinaria` al final de la ruta del terminal.
4. Escribe el comando y pulsa Enter:

```powershell
npm.cmd start
```

5. Espera a que aparezca `Veterinaria disponible en http://localhost:3000`.
6. Abre `http://localhost:3000/` en el navegador. Comprueba que aparecen las mascotas.
7. Mantén la terminal abierta mientras expones. Puedes cambiar al navegador sin cerrar VS Code.

Si abriste la terminal en la carpeta `New project`, entra primero al proyecto:

```powershell
cd .\veterinaria
npm.cmd start
```

Si la terminal está en otra ubicación, puedes entrar con la ruta completa:

```powershell
Set-Location 'C:\Users\CVILLOTA\Documents\New project\veterinaria'
npm.cmd start
```

## Qué ocurre cuando lo enciendes

`npm.cmd` ejecuta npm en Windows. `start` busca la instrucción `start` en `package.json`, que ejecuta `node server.mjs`. Node abre la base de datos y empieza a responder al navegador en el puerto 3000. `localhost` significa este mismo computador: no es un enlace público que el profesor pueda abrir desde otro equipo.

El servidor necesita estar encendido para usar la aplicación. Los registros ya guardados permanecen en el archivo SQLite cuando lo apagas. Las observaciones que todavía no has guardado al cerrar una consulta son un borrador.

## Si algo falla

| Mensaje o situación | Qué hacer |
| --- | --- |
| El navegador no puede conectarse | Comprueba que la terminal muestra el servidor iniciado y abre exactamente `http://localhost:3000/`. |
| `Página no encontrada` dentro de la aplicación | Abre la dirección anterior; las secciones usan `/#mascotas` o `/#turnos`, con el símbolo `#`. |
| npm no encuentra `package.json` | La terminal está en otra carpeta. Entra a `veterinaria` con `Set-Location`. |
| `EADDRINUSE` | El puerto 3000 ya lo usa otro proceso. Primero abre la aplicación; puede estar encendida. No inicies dos copias. |
| `ExperimentalWarning` de SQLite | En nuestra versión de Node puede aparecer este aviso. Comprueba que después aparezca la dirección del servidor. |
| `node` o `npm.cmd` no se reconoce | Comprueba la instalación de Node antes del día de la exposición. |

Para apagar: vuelve a la terminal y pulsa `Ctrl+C`. Para encender otra vez: ejecuta `npm.cmd start`. Para recargar la página: pulsa `Ctrl+R` en el navegador; esto no enciende un servidor apagado.

## Respaldo antes de la exposición

Apaga el servidor con `Ctrl+C` antes de copiar la base, para obtener un respaldo consistente. Desde la carpeta del proyecto:

```powershell
$fechaRespaldoVet = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath '.\data\veterinaria.db' -Destination ".\data\veterinaria-respaldo-$fechaRespaldoVet.db"
npm.cmd start
```

Los respaldos contienen los mismos datos que la aplicación y no se suben a GitHub. Conserva una copia privada del proyecto y de la base para recuperar los datos si falla tu equipo.

## Recorrido para exponer

1. Mostrar mascotas y buscar las dos Luna por propietario en Turnos: explicar el trie.
2. Solicitar normales y urgencias: explicar cola y heap y mostrar el próximo paciente.
3. Escoger un veterinario compatible: explicar las conexiones del grafo.
4. Llamar pacientes con profesionales distintos: mostrar ocupados y disponibles.
5. Escribir una observación y cerrar una consulta: explicar la transacción.
6. Abrir Ver historial: explicar cómo la lista enlazada recorre las consultas.
7. Recargar para mostrar que los datos guardados persisten.

El recorrido detallado y los ejemplos están en [DEMOSTRACION.md](DEMOSTRACION.md). Esta demostración local funciona sin internet una vez que el proyecto y Node están en el computador. Para cumplir la entrega también falta verificar el enlace público.
