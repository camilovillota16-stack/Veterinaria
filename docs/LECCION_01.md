# Clase 1 Interfaz y registro de mascotas

Esta guía describe el primer avance, hasta el commit `e1e4d2a`, cuando los registros eran temporales. La versión actual ya conserva los datos. Continúa con [LECCION_02.md](LECCION_02.md) para entender los cambios.

## Objetivo

Entender cómo una acción en el formulario se convierte en un objeto JavaScript y se muestra en la pantalla. Al terminar podrás ejecutar el proyecto, registrar una mascota y explicar cada paso del registro.

Esta versión conserva los registros en memoria mientras la página permanece abierta. No tiene una base de datos, API ni las cinco estructuras propias todavía.

## Ejecutar el proyecto

En una terminal de Visual Studio Code, dentro de la carpeta `veterinaria`, ejecuta:

```powershell
npm.cmd start
```

Abre `http://localhost:3000` en el navegador. Mantén la terminal abierta. Para detener el servidor, pulsa `Ctrl+C`. Si necesitas iniciarlo de nuevo, repite el comando.

También puedes abrir `index.html` directamente en el navegador para esta primera clase, pero usaremos el servidor local para preparar las siguientes etapas.

No hay dependencias externas que instalar en esta clase. `npm.cmd` es la entrada de npm para Windows; evita depender de la política de ejecución de scripts PowerShell.

## Función de cada archivo

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Define las pantallas, el formulario y el lugar donde aparecerán los registros. |
| `css/styles.css` | Define colores, distribución, tamaños y adaptación a pantallas pequeñas. |
| `js/app.js` | Lee el formulario, valida, crea el objeto mascota y actualiza la pantalla. |
| `package.json` | Define el proyecto y el comando `start`. |
| `server.mjs` | Entrega los archivos de la interfaz al navegador en el puerto 3000. Todavía no procesa registros. |

## Leer el código en este orden

1. En `index.html`, encuentra `formulario-mascota` y sus cinco campos. La raza es opcional. El atributo `name` identifica cada valor para `FormData`; el atributo `id` permite vincular etiquetas y seleccionar elementos.
2. En `js/app.js`, encuentra `const mascotas = []`. Es el estado temporal de la pantalla. `const` impide reemplazar la variable, pero permite añadir elementos al arreglo mediante `push`.
3. Encuentra `formulario.addEventListener("submit", registrarMascota)`. Registra qué función se ejecuta cuando se envía el formulario. También funciona al pulsar Enter desde un campo.
4. Lee `registrarMascota`. `preventDefault()` evita la recarga; `FormData` lee los campos; el objeto `mascota` agrupa los datos; `trim()` elimina espacios de los extremos.
5. Revisa las validaciones. `required` verifica campos vacíos en el navegador y JavaScript también rechaza nombres compuestos solo por espacios y teléfonos inválidos.
6. Encuentra `mascotas.push(mascota)`. Aquí se incorpora el registro al arreglo temporal.
7. Lee `crearTarjeta`. `createElement` crea elementos del DOM, `textContent` introduce texto y `append` los incorpora a otros elementos.
8. Lee `actualizarResumen`. Se cuentan mascotas y especies distintas; `Set` se usa como utilidad, no como una de las cinco estructuras exigidas.
9. Lee `mostrarPagina`. El fragmento de la dirección, por ejemplo `#mascotas`, selecciona la pantalla visible. Los botones Atrás y Adelante también funcionan.

## Ejemplo del objeto que construimos

```javascript
const mascota = {
  nombre: "Luna",
  especie: "Gato",
  raza: "Siamés",
  propietario: "Camilo",
  telefono: "300 123 4567",
};
```

Este objeto representa una mascota. Sus propiedades permiten acceder a datos concretos: `mascota.nombre` devuelve `"Luna"`.

El ejercicio de añadir la raza conecta tres cambios: un campo con `name="raza"` en HTML, la propiedad `raza` en el objeto y un párrafo en la tarjeta. `mascota.raza || "Sin especificar"` proporciona el texto que se muestra cuando el campo está vacío.

## Recorrido del registro

Formulario enviado → evento `submit` → validación → objeto mascota → arreglo `mascotas` → tarjeta en pantalla y contadores actualizados.

El servidor local solo entrega los archivos. El registro ocurre en el navegador. Cuando añadamos la persistencia, este recorrido incluirá una solicitud al backend y una transacción en la base de datos.

## Práctica

1. Registra a Luna como gato y a Max como perro. En Inicio deben aparecer dos mascotas y dos especies.
2. Registra otra mascota de especie gato. Deben aparecer tres mascotas y dos especies.
3. Intenta registrar un nombre con solo espacios y un teléfono con letras. No deben añadirse registros.
4. Recarga la página. Los registros desaparecen porque todavía viven solo en memoria.
5. Cambia el título del inicio en `index.html` por un mensaje de bienvenida de tu elección y comprueba el resultado. Este ejercicio no cambia la lógica del registro.

## Preguntas para explicar el proyecto

- ¿Por qué llamamos a `preventDefault()`?
- ¿Qué diferencia hay entre el objeto `mascota` y el arreglo `mascotas`?
- ¿Qué sucedería si elimináramos `mascotas.push(mascota)`?
- ¿Por qué el servidor de esta clase no guarda los registros?

## Guardar un avance con Git

Antes de crear un commit, revisa lo que cambió:

```powershell
git status
git diff
```

Para un avance futuro, añade solo los archivos que correspondan, verifica el contenido preparado con `git diff --cached` y crea un commit con un mensaje descriptivo. Después se sube con `git push`. No repitas el commit inicial si ya aparece en `git log --oneline`.
