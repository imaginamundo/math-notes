# Referencia

Una referencia compacta de la sintaxis. Cada título aparece en la barra lateral para acceso rápido.

## Operadores

| Operador | Significado |
| --- | --- |
| `+` `-` `*` `/` | Sumar, restar, multiplicar, dividir |
| `^` | Potencia |
| `%` | Resto |
| `!` | Factorial |
| `( )` | Agrupar |
| `=` | Asignar |
| `[ ]` | Lista o índice |
| `:` | Rango o paso |

## Operadores en palabras

`plus`, `minus`, `times`, `multiplied by`, `divided by`, `with`, `without`, `mul`.

## Palabras clave

| Palabra clave | Significado |
| --- | --- |
| `sum` `total` | Sumar las líneas de arriba (hasta una línea en blanco) |
| `average` `avg` | Promediar las líneas de arriba |
| `prev` | El resultado anterior |
| `line(n)` | El resultado de la línea `n` |
| `end` | Cerrar un [grupo](/docs/groups/) |

## Alias de función

| Alias | Significado |
| --- | --- |
| `ln(x)` | Logaritmo natural |
| `fact(x)` | Factorial |
| `arcsin` `arccos` `arctan` | Funciones trigonométricas inversas |
| `root(n, x)` | La raíz `x`-ésima de `n` |
| `fromunix(t)` | Una fecha a partir de una marca de tiempo Unix |
| `unix()` | La marca de tiempo Unix actual |

Las funciones estándar de mathjs (`sqrt`, `abs`, `round`, `ceil`, `floor`, `sin`, `cos`, `mean`, `sum`, `min`, `max`, `sort`, `concat`, …) también están disponibles.

## Constantes

`pi`, `π`, `e`.

## Unidades

Familias comunes: longitud (`m`, `cm`, `km`, `in`, `ft`, `mi`), masa (`g`, `kg`, `lb`, `oz`), volumen (`l`, `ml`, `cup`, `tbsp`), tiempo (`s`, `min`, `h`, `day`, `week`), temperatura (`degC`, `degF`, `K`), datos (`b`, `B`, `kB`, `MB`, `GB`), energía (`J`, `Wh`, `kWh`, `BTU`), potencia (`W`, `hp`) y presión (`Pa`, `psi`, `atm`, `bar`). La lista completa está en [Unidades & medidas](/docs/units/).

## Monedas

`AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`. Consulta [Dinero & monedas](/docs/money/).

## Calendario

Palabras de fecha `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`; frases `days until`, `workdays in`, `work hours in`, `weekday on`, `as <patrón>`; horas como `9:45 am`, `16:00`. Consulta [Fechas & tiempo](/docs/dates/).

## Redondeo

`to n dp`, `to n digits`, `rounded`, `rounded up`, `rounded down`, `to nearest n` (incluidas fracciones como `to nearest 16th`).

## Atajos de teclado

| Atajo | Acción |
| --- | --- |
| `⌘Z` / `Ctrl+Z` | Deshacer el último cambio en la pestaña |
| `⇧⌘Z` / `Ctrl+Shift+Z` | Rehacer |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Pestaña siguiente / anterior |
| `⌘1…9` / `Ctrl+1…9` | Ir a la enésima pestaña |
| `⌘F` / `Ctrl+F` | Buscar y reemplazar en la hoja activa |
| `⌘G` / `Ctrl+G` | Ir a un número de línea |
| `Ctrl+Space` | Mostrar sugerencias de autocompletado |
| `Tab` / `Shift+Tab` | Indentar / desindentar la(s) línea(s) |
| `⇧⌘C` / `Ctrl+Shift+C` | Copiar el resultado de la línea actual |
| `⇧⌘S` `⇧⌘L` / `Ctrl+Shift+S` | Copiar un enlace para compartir |
| `⇧⌘E` / `Ctrl+Shift+E` | Exportar la hoja activa |
| `⇧⌘I` / `Ctrl+Shift+I` | Importar una hoja |
| `⇧⌘⌫` / `Ctrl+Shift+Backspace` | Limpiar la hoja activa |

## Palabras reservadas

`prev`, `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`, `end`, y cualquier nombre que empiece por `__` no se pueden usar como variables.
