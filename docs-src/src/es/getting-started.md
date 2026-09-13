# Primeros pasos

Math Notes es una hoja de líneas. Escribes un cálculo por línea y la respuesta aparece a la derecha, como una pista atenuada. No hay botón **=** ni cuadrícula de celdas: la hoja se recalcula mientras escribes.

```calc devuelve 2
1 + 1
```

```calc devuelve 7
2 * 3 + 1
```

Una línea puede ser un número simple, una expresión, una asignación, un comentario, o una etiqueta seguida de una expresión. El resultado de la última línea también aparece en la barra de total, abajo.

## La pantalla

- El **editor** es el área de texto grande. Su capa fantasma muestra resultados, tags y errores en su sitio.
- La **barra de total** está debajo del editor y agrega la hoja. Usa su menú para cambiar entre **total**, **media** y **mediana**.
- El **pie** contiene los controles de tamaño del texto y los botones **Compartir**, **Ajustes**, **Ejemplos** y **Documentación**.
- La **barra de pestañas** de arriba guarda hojas separadas (consulta [Archivos, compartir & datos](/docs/files/)).

## Resultados

Los resultados se formatean con separadores de miles y se escriben con la unidad o moneda que llevan.

```calc 1,000,000
1000000
```

```calc 0.01 m
1cm to m
```

Por defecto, un resultado muestra hasta **3 decimales**. Un valor con más precisión termina en puntos suspensivos, mientras que el cálculo conserva toda la precisión. Cámbialo en **Ajustes → Precisión decimal** (consulta [Ajustes & apariencia](/docs/settings/)).

Cuando una línea no se puede evaluar, el error aparece en la propia línea, en rojo. Los errores nunca impiden que el resto de la hoja se evalúe.

## Edición

- **Sangría** — `Tab` indenta la línea actual o una selección de varias líneas, `Shift+Tab` desindenta. La sangría es de dos espacios y no cambia cómo se evalúa la línea.
- **Comentar una línea** — haz clic en el número de la línea en el margen izquierdo para comentarla o descomentarla. Una línea que ya empieza por `##` solo pierde un `#`.
- **Números de línea** — el margen izquierdo numera la hoja y resalta la línea donde está el cursor.
- **Deshacer / rehacer** — `⌘Z` / `Ctrl+Z` y `⇧⌘Z` / `Ctrl+Shift+Z`, con un historial separado para cada pestaña.
- **Ir a una línea** — `⌘G` / `Ctrl+G` y escribe un número de línea.
- **Buscar y reemplazar** — `⌘F` / `Ctrl+F` busca en la hoja activa con resaltado en vivo, y reemplaza una o todas las coincidencias.
- **Tamaño del texto** — **−** / **+** del pie cambian el editor entre el 50% y el 200% del tamaño predeterminado del navegador; **Restablecer tamaño** vuelve al 100%.

## Autocompletado

Mientras escribes, un cuadro de sugerencias propone las variables de la hoja y las `#tags`, además de las funciones, palabras clave, constantes y unidades integradas. Pulsa `Ctrl+Space` para abrirlo cuando quieras. **↑**/**↓** eligen, **Enter**/**Tab** insertan, **Esc** cierra.

## Primera visita

La primera visita abre con una hoja de **Bienvenida** en vez de una página vacía — variables, etiquetas, `sum`, tags, duraciones con unidades, porcentajes y fechas. Usa sus botones **Conservar contenido** / **Borrar contenido** para descartarla o vaciarla.

## Sin conexión

Math Notes es una PWA instalable. Tras la primera visita, un service worker mantiene la app disponible sin conexión; las tasas de cambio se guardan en caché, así que las conversiones siguen funcionando. Consulta [App & plataforma](/docs/app/).
