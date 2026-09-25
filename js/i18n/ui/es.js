// Spanish UI strings. Key set must match en.js.
export default {
  'app.name': 'Math Notes',

  'editor.label': 'Entrada de la calculadora',
  'editor.placeholder':
    'Escribe tus cálculos…\nLos resultados aparecen al lado\nConsulta la Documentación para todo lo que entiende',

  'total.label': 'Agregado del total',
  'total.sum': 'total',
  'total.average': 'media',
  'total.median': 'mediana',

  'loading.sr': 'Calculando',
  'loading.dots': 'Cargando',

  'font.group': 'Tamaño del texto',
  'font.decrease': 'Reducir el tamaño del texto',
  'font.increase': 'Aumentar el tamaño del texto',
  'font.reset': 'Restablecer tamaño',

  'footer.share': 'Compartir',
  'footer.settings': 'Ajustes',
  'footer.examples': 'Ejemplos',
  'footer.docs': 'Docs',

  'modal.examples': 'Ejemplos',
  'modal.settings': 'Ajustes',
  'modal.closeExamples': 'Cerrar los ejemplos',
  'modal.closeSettings': 'Cerrar los ajustes',

  'status.ratesCached': 'tasas: en caché',
  'status.ratesLive': 'tasas: en vivo',
  'status.ratesUnavailable': 'tasas de cambio no disponibles',

  'share.buildFailed': 'No se pudo crear un enlace para esta hoja',
  'share.copiedLong': 'Enlace copiado — es largo, algunas apps pueden cortarlo',
  'share.copied': 'Enlace copiado',
  'share.copyFailed': 'No se pudo copiar — el enlace está en la barra de direcciones',
  'share.unreadable': 'No se pudo leer ese enlace',
  'share.openConfirm': '¿Abrir la hoja compartida "{name}" en una pestaña nueva?',
  'share.opened': 'Abierta "{name}"',
  'share.defaultName': 'Hoja compartida',

  'io.importConfirm': 'La importación reemplazará el contenido de la pestaña actual. ¿Continuar?',

  'tabs.list': 'Hojas',
  'tabs.rename': 'Doble clic para renombrar',
  'tabs.close': 'Cerrar pestaña',
  'tabs.new': 'Nueva pestaña',
  'tabs.defaultName': 'Hoja {n}',
  'tabs.closeConfirm': '¿Cerrar "{name}"? Su contenido se perderá.',
  'tabs.templates': 'Hojas iniciales',
  'template.budget': 'Presupuesto',
  'template.trip': 'Coste del viaje',
  'template.invoice': 'Factura',
  'template.savings': 'Meta de ahorro',
  'template.split': 'Dividir la cuenta',

  'find.placeholder': 'Buscar en la hoja',
  'find.matchCase': 'Distinguir mayúsculas',
  'find.previous': 'Coincidencia anterior (Shift+Enter)',
  'find.next': 'Siguiente coincidencia (Enter)',
  'find.close': 'Cerrar (Escape)',
  'find.replacePlaceholder': 'Reemplazar con',
  'find.replace': 'Reemplazar',
  'find.replaceHint': 'Reemplazar la coincidencia actual (Enter)',
  'find.all': 'Todo',
  'find.replaceAll': 'Reemplazar todas las coincidencias',

  'goto.label': 'Ir a la línea',
  'goto.lineNumber': 'Número de línea',

  'starter.group': 'Acciones del contenido de ejemplo',
  'starter.keep': '✓ Conservar contenido',
  'starter.keepTitle': 'Conservar este contenido de ejemplo',
  'starter.clear': '× Borrar contenido',
  'starter.clearTitle': 'Vaciar esta pestaña',
  'starter.name': 'Bienvenida',
  'starter.welcomeComment':
    '# ¡Bienvenido! Cada línea se evalúa; el resultado aparece a la derecha.',
  'starter.labelComment': '# Una etiqueta nombra la línea; `sum` suma el bloque de arriba:',
  'starter.tagComment': '# Las etiquetas marcan filas; una #etiqueta sola las suma todas:',

  'autocomplete.label': 'Sugerencias',
  'example.addTitle': 'Haz clic para añadir al editor',

  'settings.files': 'Archivos',
  'settings.filesBody': 'Exporta la hoja activa como texto o importa una desde un archivo.',
  'settings.export': 'Exportar',
  'settings.import': 'Importar',
  'settings.theme': 'Tema',
  'settings.themeBody': 'Elige un tema.',
  'settings.measurement': 'Sistema de medidas',
  'settings.measurementBody':
    'Se usa para las unidades de volumen de cocina. El métrico es el predeterminado.',
  'settings.precision': 'Precisión decimal',
  'settings.precisionBody':
    'Decimales mostrados en los resultados. Un resultado truncado termina en puntos suspensivos; los cálculos conservan toda la precisión.',
  'settings.precisionLabel': 'Decimales',
  'settings.clock': 'Reloj',
  'settings.clockBody': 'Cómo se escriben las horas. El formato de 24 horas es el predeterminado.',
  'settings.language': 'Idioma',
  'settings.languageBody':
    'El idioma de la interfaz. Se detecta del sistema de forma predeterminada.',
  'settings.recover': 'Recuperar',
  'settings.recoverBody':
    'Las copias guardadas automáticamente de cada pestaña se guardan en IndexedDB. Restaura una para recuperar trabajo perdido.',
  'settings.restoreAll': 'Restaurar todo desde la última copia',
  'settings.noSnapshots':
    'Aún no hay copias. Aparecen unos segundos después de que edites una pestaña.',
  'settings.restore': 'Restaurar',
  'settings.reset': 'Restablecer',
  'settings.resetBody':
    'Restablece el tema, las pestañas y todos los datos guardados a sus valores predeterminados.',
  'settings.resetButton': 'Restablecer datos',
  'settings.resetConfirm':
    'Esto restablecerá el tema, las pestañas y todos los datos guardados. ¿Continuar?',
  'settings.restoreConfirm': '¿Restaurar "{name}" de {ago}? Esto reemplaza su contenido actual.',
  'settings.restoreAllConfirm':
    '¿Reemplazar todas las pestañas por la copia más reciente de cada una? Esto descarta las pestañas actuales.',

  'time.justNow': 'ahora mismo',
  'time.minutesAgo': 'hace {n} min',
  'time.hoursAgo': 'hace {n} h',
  'time.daysAgo': 'hace {n} d',

  'apply.theme': 'Aplicar {name}',
  'apply.measurement': 'Usar unidades de volumen {name}',
  'apply.clock': 'Mostrar horas en formato {name}',
  'apply.language': 'Usar {name}',

  'measurement.metric': 'Métrico',
  'measurement.us': 'Estadounidense',
  'measurement.imperial': 'Imperial',
  'clock.24': '24 horas',
  'clock.12': '12 horas',
  'language.en': 'English',
  'language.pt': 'Português',
  'language.es': 'Español',
};
