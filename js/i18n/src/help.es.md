## Básico

Escribe un cálculo en cualquier línea y el resultado aparece justo al lado, como una pista atenuada. Los errores se muestran en la propia línea, en rojo. El **total** de abajo suma todos los resultados numéricos — usa su menú para cambiar a la **media** o la **mediana** — y los resultados se formatean con separadores de miles. Los resultados muestran hasta 3 decimales (**Ajustes → Precisión decimal**); un valor con más precisión termina en puntos suspensivos, mientras que los cálculos conservan toda la precisión.

Los botones **−** / **+** del pie cambian el tamaño del texto del editor (50–200%, con **Restablecer tamaño** de vuelta a 100%). En la primera visita, una hoja de **Bienvenida** demuestra la app; usa sus botones **Conservar contenido** / **Borrar contenido** para descartarla o vaciarla. Mientras escribes, un cuadro de sugerencias propone variables, **#tags** y nombres integrados (o pulsa **Ctrl+Space**): **↑**/**↓** para elegir, **Enter**/**Tab** para insertar, **Esc** para cerrar.

```calc devuelve 2
1 + 1
```

```calc devuelve 7
2 * 3 + 1
```

```calc devuelve 4
(4 / 2) ^ 2
```

```calc devuelve 4
sqrt(16)
```

```calc devuelve 1
10 % 3
```

```calc devuelve 1,000,000
1000000
```

| Operador | Función |
| --- | --- |
| `+` | Sumar |
| `-` | Restar |
| `*` | Multiplicar |
| `/` | Dividir |
| `^` | Potencia |
| `%` | Resto |

Hay muchas más funciones y operadores disponibles — consulta la [documentación de mathjs](https://mathjs.org/docs/expressions/syntax.html#operators).

## Pestañas

Usa las pestañas de arriba para mantener hojas separadas. Cada pestaña se guarda automáticamente mientras escribes.

-   **Cambiar** — haz clic en una pestaña (o usa `←`/`→` con ella enfocada, o `Ctrl+Tab`).
-   **Reordenar** — haz clic y arrastra una pestaña a otra posición.
-   **Renombrar** — haz doble clic en el nombre de la pestaña.
-   **Cerrar** — haz clic en la `×` (se te pedirá confirmación).
-   **Añadir** — haz clic en la pestaña `+`.
-   **Exportar / Importar** — usa los botones de la ventana de **Ajustes** para descargar la hoja activa como texto o cargar una desde un archivo.
-   **Compartir** — el botón **Compartir** copia un enlace que lleva la hoja activa dentro. A quien lo abra se le pregunta si quiere abrir la hoja en una pestaña nueva; nunca reemplaza lo que ya tiene. No se sube nada: la hoja viaja en el fragmento `#` del enlace, que los navegadores nunca envían a un servidor.

## Comentarios, etiquetas & tags

Todo lo que sigue a un `#` y un espacio se ignora (un comentario). Una `etiqueta:` antes de una expresión da nombre a la línea sin evaluarse.

```calc devuelve 4
2 + 2 # this is a note
```

```calc devuelve 15
Price: 10 + 5
```

Sin espacio, `#palabra` es una **tag**. Una línea que solo tiene tags muestra su total, y `sum`/`total`/`average`/`avg` (opcionalmente `of`) delante de la tag también funcionan. Las líneas marcadas de arriba se suman, estén donde estén. Una fila con varias tags es el importe total dividido a partes iguales entre ellas, así que cada tag recibe su parte mientras la fila y el total del grupo conservan el precio completo. Las tags también se pueden usar en cálculos: `#food * 2`, `#food + #other`. Pedir una tag que no tiene líneas marcadas muestra un error.

```calc la última línea devuelve 50
20 #food
30 #food
#food
```

```calc la última línea devuelve 100
20 #food
30 #food
#food * 2
```

**Consejo:** haz clic en el número de una línea en el margen izquierdo para comentarla o descomentarla — útil para desactivar un cálculo sin borrarlo. Una línea que ya empieza por `##` solo pierde un `#`.

## Variables

Asigna un valor con `=` y reutilízalo en líneas posteriores. Usa `prev` para el resultado más reciente de arriba — omite comentarios y líneas en blanco. `sum`/`total`/`average`/`avg` agregan las líneas de arriba hasta una línea en blanco, que inicia un bloque nuevo.

```calc la última línea devuelve 15
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people
```

```calc la última línea devuelve 80
20
prev * 4
```

```calc la última línea devuelve 11
10
# a comment in between
prev + 1
```

```calc la última línea devuelve 30
10
20
sum
```

```calc la última línea devuelve 6
4
8
average
```

Los objetos agrupan valores con nombre; accede a un campo con un punto.

```calc la última línea devuelve 132
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax
```

Los nombres de variables pueden contener espacios.

```calc la última línea devuelve 18,000
monthly rent = 1500
monthly rent * 12
```

Referencia el resultado de una línea anterior con `line(n)`. La referencia muestra el valor en la línea (el `line(n)` sin procesar permanece visible mientras editas esa línea) y solo se pueden referenciar líneas anteriores.

```calc la última línea devuelve 10
5
line(1) * 2
```

## Grupos

Abre un grupo con nombre con una etiqueta en su propia línea (como `Groceries:`) y ciérralo con `end`. La cabecera muestra el subtotal del grupo y todo el grupo se sombrea como una caja; las líneas interiores siguen contando en el total de abajo. Las líneas en blanco de dentro se ignoran, y `sum`/`average` dentro de un grupo totalizan ese grupo. Una cabecera sin `end` es solo una etiqueta, y un `end` sin cabecera es un error.

```calc la cabecera muestra 10.1
Groceries:
4.50
3.20
2.40
end
```

```calc la cabecera muestra 1.1 m
Trip:
10 cm
1 m
end
```

## Funciones

Guarda una función con `f(x) = …` y llámala después. También hay alias estilo Numi: `ln`, `fact`, `arcsin`, `arccos`, `arctan`, `root`.

```calc la última línea devuelve 42
double = f(x) = x * 2
double(21)
```

```calc devuelve 120
fact(5)
```

```calc devuelve 1
ln(e)
```

```calc devuelve 2
root(8, 3)
```

## Listas

Escribe una lista con corchetes. Las listas están **indexadas desde 1**: `n[1]` es el primer elemento. Corta con un rango, asigna elementos, haz aritmética elemento a elemento y combina listas con las funciones de mathjs. Las listas están limitadas a 100 elementos.

```calc [1, 2, 3]
[1, 2, 3]
```

```calc 10 (primer elemento)
n = [10, 20, 30]
n[1]
```

```calc [20, 30, 40]
n = [10, 20, 30, 40]
n[2:4]
```

```calc define el segundo elemento
n = [10, 20, 30]
n[2] = 99
```

```calc [4, 6]
[1, 2] + [3, 4]
```

```calc la última línea devuelve 1325
expenses = [1200, 80, 45]
sum(expenses)
```

```calc devuelve 5.5
mean(1:10)
```

```calc [1, 2, 3]
sort([3, 1, 2])
```

```calc [1, 2, 3, 4]
concat([1, 2], [3, 4])
```

```calc 3
m = [[1, 2], [3, 4]]
m[2, 1]
```

## Secuencias & iteración

Un rango `start:end` (con un `:step` opcional) crea una lista de números, y llamar a una función con un rango la aplica a cada elemento. Las listas se pueden nombrar e indexar como cualquier otra variable. Los rangos están limitados a 100 elementos.

```calc [1, 2, 3, 4, 5]
1:5
```

```calc [1, 3, 5, 7, 9]
1:2:10
```

```calc 3
n = 1:5
n[3]
```

```calc [2, 4, 6, 8, 10]
double = f(x) = x * 2
double(1:5)
```

```calc devuelve 5050
sum(1:100)
```

```calc devuelve 3
mean(1:5)
```

## Porcentajes

Usa `of`, `on` y `off` con `%` para cálculos de porcentajes.

```calc devuelve 2
20% of 10
```

```calc devuelve 31.5
5% on 30
```

```calc devuelve 37.6
6% off 40
```

```calc devuelve 50
50 as a % of 100
```

```calc devuelve 120
5% of what is 6
```

## Redondeo

Redondea un resultado con una frase al final de la línea, o llama directamente a `round`, `ceil` o `floor`. El redondeo también funciona con unidades y monedas.

```calc devuelve 0.33
1/3 to 2 dp
```

```calc devuelve 3.14159
π to 5 digits
```

```calc devuelve 6
5.5 rounded
```

```calc devuelve 6
5.5 rounded up
```

```calc devuelve 5
5.5 rounded down
```

```calc devuelve 40
37 to nearest 10
```

```calc devuelve US$ 500
$490 rounded to nearest hundred
```

```calc devuelve 25
21 rounded up to nearest 5
```

```calc devuelve 9/16
0.534 to nearest 16th
```

## Operadores & escalas

Los operadores en palabras y las escalas numéricas funcionan de forma natural: `plus`, `minus`, `times`, `multiplied by`, `divided by`, `with`, `without` y `mul`.

```calc devuelve 72
8 times 9
```

```calc devuelve 5
2 plus 3
```

```calc devuelve 7
10 minus 3
```

```calc devuelve 42
6 multiplied by 7
```

```calc devuelve 5
10 divided by 2
```

```calc devuelve 150 minutes
2 hours with 30 minutes
```

```calc devuelve 90 minutes
2 hours without 30 minutes
```

```calc devuelve 12
3 mul 4
```

```calc devuelve 2,000
2k
```

```calc devuelve 1,000,000
1kk
```

```calc devuelve 1,000,000,000
1kkk
```

## Conversión de unidades

Convierte unidades con `to`, `in` o `as`. También se admiten unidades CSS: `px`, `em` y `point`. Las unidades de volumen de cocina siguen el sistema de medidas de **Ajustes → Sistema de medidas** — Métrico (predeterminado), Estadounidense o Imperial — que define `cup` (250 / 236.6 / 284.1 ml), `tsp`, `tbsp`, `fl oz`, `pint`, `quart` y `gallon`.

```calc devuelve 0.01 m
1cm to m
```

```calc devuelve 7200 s
2h to s
```

```calc devuelve 5000 m
5km to m
```

```calc devuelve 86 degF
30 degC to degF
```

```calc devuelve 45.36 kg
100 lb in kg
```

```calc devuelve ≈ 37.8 px
1 cm in px
```

```calc devuelve 32 px
2 em in px
```

| Base | Unidad |
| --- | --- |
| Longitud | meter (m), inch (in), foot (ft), yard (yd), mile (mi), link (li), rod (rd), chain (ch), angstrom, mil |
| Área de superficie | m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare |
| Volumen | m3, litre (l, L, lt, liter), cc, cuin, cuft, cuyd, teaspoon, tablespoon |
| Volumen líquido | minim (min), fluiddram (fldr), fluidounce (floz), gill (gi), cup (cp), pint (pt), quart (qt), gallon (gal), beerbarrel (bbl), oilbarrel (obl), hogshead, drop (gtt) |
| Ángulos | rad (radian), deg (degree), grad (gradian), cycle, arcsec (arcsecond), arcmin (arcminute) |
| Tiempo | second (s, secs, seconds), minute (mins, minutes), hour (h, hr, hrs, hours), day (days), week (weeks), month (months), year (years), decade (decades), century (centuries), millennium (millennia) |
| Frecuencia | hertz (Hz) |
| Masa | gram(g), tonne, ton, grain (gr), dram (dr), ounce (oz), poundmass (lbm, lb, lbs), hundredweight (cwt), stick, stone |
| Corriente eléctrica | ampere (A) |
| Temperatura | kelvin (K), celsius (degC), fahrenheit (degF), rankine (degR) |
| Cantidad de sustancia | mole (mol) |
| Intensidad luminosa | candela (cd) |
| Fuerza | newton (N), dyne (dyn), poundforce (lbf), kip |
| Energía | joule (J), erg, Wh, BTU, electronvolt (eV) |
| Potencia | watt (W), hp |
| Presión | Pa, psi, atm, torr, bar, mmHg, mmH2O, cmH2O |
| Electricidad y magnetismo | ampere (A), coulomb (C), watt (W), volt (V), ohm, farad (F), weber (Wb), tesla (T), henry (H), siemens (S), electronvolt (eV) |
| Binario | bits (b), bytes (B) |

Consulta la [referencia de unidades de mathjs](https://mathjs.org/docs/datatypes/units.html#reference) para la lista completa.

## Cocina & medidas

Convierte entre dimensiones nombrando lo que estás midiendo. El sujeto es libre y opcional: un ingrediente conocido usa su densidad, un combustible su densidad energética, los medios su bitrate, y cualquier otra cosa usa un valor por defecto (agua). Escríbelo antes de `to`/`in`.

```calc ≈ 1.32 cups
300g butter in cups
```

```calc 265 grams
2 cups flour in grams
```

```calc 211.25 grams
1 cup sugar in grams
```

```calc 1.2 cups (sujeto opcional)
300g in cups
```

```calc 1.2 cups (cualquier sujeto funciona)
300g feathers in cups
```

```calc 9.5 kWh
1 l petrol in kWh
```

```calc 14.4 GB
2 hours 4k video in GB
```

## Tasas

Una tasa es una unidad por otra. mathjs hace la aritmética; estas frases facilitan escribir tasas.

```calc 30 km/day
90 km / 3 day
```

```calc 300 km
30 hours at 10 km/hour
```

```calc 10 hours
100 km at 10 km/hour
```

```calc 8,766 km
24 km a day for a year
```

```calc 300 s
time to upload 3 GB at 10 MB/s
```

```calc 05:00/km
5 km in 25 min
```

## Conversión de moneda

Convierte entre monedas usando códigos ISO de 3 letras o símbolos. Los resultados se escriben con el símbolo de la moneda cuando lo tienen (`350usd` pasa a `US$ 350`); las monedas sin símbolo conservan su código. El dinero solo forma razones (`USD/hour`, `USD/km`), así que multiplicar una moneda por otra unidad (`BRL hour`) es un error — usa una tasa. Las tasas vienen del Banco Central Europeo (vía frankfurter.dev) y se guardan en caché local para usarlas sin conexión.

```calc convierte USD a EUR
100 USD to EUR
```

```calc convierte a GBP
$5 to GBP
```

```calc convierte a EUR
R$5 to EUR
```

```calc convierte a BRL
50 EUR in BRL
```

```calc US$ 100 per hour
100 USD/hour
```

**Códigos admitidos:** `AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`.

## Fechas

Convierte marcas de tiempo unix con `fromunix`, obtén la hora actual con `unix()` y usa unidades de fecha directamente.

```calc Jan 1, 1970…
fromunix(0)
```

```calc Nov 3, 2015…
fromunix(1446587186)
```

```calc marca de tiempo actual
unix()
```

```calc 30.4375 days
1 month in days
```

## Calendario

Suma o resta tiempo a una fecha, mide el intervalo entre fechas y da formato a una fecha con un patrón. Las fechas pueden escribirse como `10 June`, `June 10, 2023`, `2019-04-01` o `12/02/1988`. Una fecha se puede guardar en una variable y reutilizar (`start = March 4`, luego `start + 2 weeks`). Las horas (`9:45 am`, `1:30`) suman duraciones y miden intervalos, y se muestran en formato de 24 horas por defecto (**Ajustes → Reloj**). Los días laborables son de lunes a viernes (los festivos aún no se cuentan).

```calc 1 July
10 June + 3 weeks
```

```calc 18 March 2025
start = March 4, 2025
start + 2 weeks
```

```calc 27 December 2018
April 1, 2019 - 3 months 5 days
```

```calc 4 April 2019
3 weeks after March 14, 2019
```

```calc dentro de tres semanas
today + 3 weeks
```

```calc dentro de cuatro días
4 days from now
```

```calc una hora 3¼ horas después
16:00 + 3 hours 12 minutes
```

```calc 13 hours 15 minutes
7:30am to 8:45pm
```

```calc una hora 3¼ horas desde ahora
now + 3 hours 15 minutes
```

```calc 3 weeks 5 days
January 10 - February 5
```

```calc días hasta el 25 December
days until Christmas
```

```calc 15 workdays
workdays in 3 weeks
```

```calc 176 horas de trabajo (jornadas de 8h)
work hours in June
```

```calc 5 workdays
10 March to 17 March in workdays
```

```calc 21 March 2019
5 workdays after March 14, 2019
```

```calc Saturday
weekday on March 9, 2024
```

```calc Sunday, Mar 12, 2023
March 12, 2023 as EEEE, MMM d, yyyy
```

## Intervalos de tiempo

Muestra una duración como un timespan de componentes, o divídela en dos unidades. Un timespan es una duración real, así que se puede sumar y multiplicar, y convertir a una sola unidad con `to`/`in`/`as` (`as minutes`). Las unidades de tiempo pueden escribirse cortas (`3h 5m 10s`) o largas.

```calc 5 min 30 s
5.5 minutes as timespan
```

```calc 4 hours 32 minutes 24 seconds
4.54 hours as timespan
```

```calc 10 weeks 2 days
72 days as timespan
```

```calc 3 hours 5 minutes 10 seconds
3h 5m 10s
```

```calc 11,110 seconds
3h 5m 10s in seconds
```

```calc 12 min 30 s
12.5 minutes in minutes and seconds
```

```calc última línea: 1 hour 5 minutes 30 seconds
5.5 minutes as timespan
line(1) + 1h
```

## Atajos & archivos

La hoja activa se puede exportar e importar desde la ventana de **Ajustes** o con los atajos de abajo.

| Atajo | Acción |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Deshacer el último cambio en la pestaña |
| `⇧⌘Z` `Ctrl+Shift+Z` | Rehacer |
| `Ctrl+Tab` `Ctrl+⇧Tab` | Pestaña siguiente / anterior |
| `⌘1…9` `Ctrl+1…9` | Ir a la enésima pestaña |
| `⌘F` `Ctrl+F` | Buscar y reemplazar en la hoja activa |
| `⌘G` `Ctrl+G` | Ir a un número de línea |
| `Tab` | Indentar la línea o la selección |
| `⇧Tab` | Desindentar la línea o la selección |
| `⇧⌘C` `Ctrl+Shift+C` | Copiar el resultado de la línea actual |
| `⇧⌘S` `⇧⌘L` | Copiar un enlace para compartir la hoja activa |
| `⇧⌘E` `Ctrl+Shift+E` | Exportar la hoja activa |
| `⇧⌘I` `Ctrl+Shift+I` | Importar una hoja |
| `⇧⌘⌫` `Ctrl+Shift+Backspace` | Limpiar la hoja activa |

## Acerca de

Math Notes es una calculadora en línea basada en el navegador, inspirada en [Numi](https://numi.app) y [Soulver](https://soulver.app). Su código es abierto — consulta el [repositorio de GitHub](https://github.com/imaginamundo/math-notes).

Los cálculos funcionan con [mathjs](https://mathjs.org), una biblioteca matemática extensible para JavaScript, y las tasas de cambio provienen del [Banco Central Europeo](https://www.ecb.europa.eu) vía [Frankfurter](https://frankfurter.dev).

Tus hojas se quedan en tu dispositivo: se guardan en el almacenamiento del navegador y nunca se envían a un servidor.
