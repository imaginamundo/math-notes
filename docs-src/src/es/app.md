# App & plataforma

Math Notes es una progressive web app: se instala como una app nativa, funciona sin conexión y respeta las preferencias de tu sistema.

## Instalar

Abre la app en un navegador moderno y usa la acción **Instalar** o **Añadir a la pantalla de inicio** del navegador. Una vez instalada, se abre en su propia ventana, sin barra de direcciones ni interfaz del navegador.

## Sin conexión

Un service worker mantiene la app disponible sin conexión. Tras la primera visita, la estructura y el código de la app se sirven desde la caché y se actualizan en segundo plano, así que las visitas siguientes son instantáneas y una conexión perdida no interrumpe tu trabajo.

Las tasas de cambio también se guardan en caché, así que las conversiones siguen funcionando sin conexión con las tasas más recientes que haya visto la app.

## Atajos de teclado

Toda acción tiene un atajo; la lista completa está en la [Referencia](/docs/reference/). Los más comunes:

| Atajo | Acción |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Deshacer |
| `⇧⌘Z` `Ctrl+Shift+Z` | Rehacer |
| `⌘F` `Ctrl+F` | Buscar y reemplazar |
| `⌘G` `Ctrl+G` | Ir a una línea |
| `Ctrl+Space` | Autocompletado |
| `Tab` `Shift+Tab` | Indentar / desindentar |
| `⇧⌘C` `Ctrl+Shift+C` | Copiar el resultado de la línea actual |
| `⇧⌘S` `Ctrl+Shift+S` | Copiar un enlace para compartir |

## Accesibilidad

- El control de tamaño del texto escala desde el tamaño predeterminado del navegador, así que honra tu preferencia del sistema.
- El editor tiene una etiqueta accesible, la barra de estado anuncia el estado con `aria-live`, y las ventanas son elementos `<dialog>` nativos con cabecera etiquetada y botón de cierre alcanzable por teclado.
- La agregación de la barra de total es un `<select>` etiquetado.
- La documentación que estás leyendo es HTML estático con enlace para saltar al contenido, elementos de referencia y una barra lateral alcanzable por teclado.
