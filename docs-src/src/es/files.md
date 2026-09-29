# Archivos, compartir & datos

Math Notes guarda tu trabajo en tu dispositivo. No hay cuenta ni servidor: las hojas se guardan en tu navegador, se copian en un almacén local versionado, y solo se comparten cuando tú lo eliges.

## Pestañas

Usa las pestañas de arriba para mantener hojas separadas. Cada pestaña se guarda automáticamente mientras escribes.

- **Cambiar** — haz clic en una pestaña (o usa `←`/`→` con ella enfocada, o `Ctrl+Tab`).
- **Reordenar** — haz clic y arrastra una pestaña a otra posición.
- **Renombrar** — haz doble clic en el nombre de la pestaña (o pulsa `F2` con la pestaña enfocada; en una pantalla táctil, mantén pulsado).
- **Cerrar** — haz clic en la `×` (se te pedirá confirmación).
- **Añadir** — haz clic en la pestaña `+`, o en el `⌄` de al lado para empezar desde una plantilla (presupuesto, coste del viaje, factura, meta de ahorro, dividir la cuenta).

## Exportar e importar

Usa **Ajustes → Archivos** para descargar la hoja activa como archivo de texto, o cargar una desde un archivo. Las mismas acciones están en `⇧⌘E` / `Ctrl+Shift+E` (exportar) y `⇧⌘I` / `Ctrl+Shift+I` (importar).

## Enlaces para compartir

El botón **Compartir** copia un enlace que lleva la hoja activa dentro. A quien lo abra se le pregunta si quiere abrir la hoja en una pestaña nueva; nunca reemplaza lo que ya tiene.

No se sube nada. La hoja viaja en el fragmento `#` del enlace, que los navegadores nunca envían a un servidor — no aparece en registros de acceso ni se reenvía en una cabecera `Referer`.

## Copias automáticas

Las ediciones de cada pestaña se copian a IndexedDB como snapshots versionados. Abre **Ajustes → Recuperar** para ver todos los snapshots, agrupados por pestaña, y restaurar cualquiera de ellos, o usa **Restaurar todo desde la última copia** para recuperar todas las pestañas. Cerrar una pestaña también elimina sus snapshots. Los snapshots se guardan comprimidos para ocupar poco.

Si localStorage no está disponible o está corrupto, las hojas se reconstruyen automáticamente desde las copias de seguridad, y un valor corrupto se copia aparte en vez de perderse.

## Restablecer

**Ajustes → Restablecer → Restablecer datos** borra el tema, las pestañas y todos los datos guardados, volviendo a los valores predeterminados, y después abre una hoja de **Bienvenida** nueva y reinicia el contador de pestañas. Exporta antes lo que quieras conservar.

## Privacidad

Las hojas se quedan en tu dispositivo. La única petición de red que hace la app es para las tasas de cambio, y se guardan en caché para usarlas sin conexión. Consulta [Acerca de](/docs/about/) para las bibliotecas implicadas.
