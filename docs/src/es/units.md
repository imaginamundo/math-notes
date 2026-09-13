# Unidades & medidas

Convierte entre unidades con `to`, `in` o `as`, nombra lo que estás midiendo para convertir entre dimensiones, y escribe tasas de forma natural.

## Conversión de unidades

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

También se admiten unidades CSS, para revisar un diseño:

```calc devuelve ≈ 37.8 px
1 cm in px
```

```calc devuelve 32 px
2 em in px
```

## Sistema de medidas

Las unidades de volumen de cocina siguen el sistema de medidas de **Ajustes → Sistema de medidas** — Métrico (predeterminado), Estadounidense o Imperial. Define `cup` como 250, 236.6 o 284.1 ml, respectivamente, junto con `tsp`, `tbsp`, `fl oz`, `pint`, `quart` y `gallon`.

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

Una tasa es una unidad por otra. mathjs hace la aritmética; estas frases facilitan escribir tasas. `per`, `a`, `an`, `at` y `for` se entienden todos.

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

## La regla de las unidades

Las unidades solo se combinan en formas que tienen sentido. `kg L`, `BRL hour`, `h^2` y `m^0.5` se informan como errores, no como unidades combinadas extrañas. El dinero solo forma razones (`USD/hour`, `USD/km`), así que usa una tasa cuando quieras convertir una moneda a lo largo del tiempo o la distancia.

## Referencia de unidades

| Base | Unidades |
| --- | --- |
| Longitud | meter (m), inch (in), foot (ft), yard (yd), mile (mi), link (li), rod (rd), chain (ch), angstrom, mil |
| Área de superficie | m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare |
| Volumen | m3, litre (l, L, lt, liter), cc, cuin, cuft, cuyd, teaspoon, tablespoon |
| Volumen líquido | minim (min), fluiddram (fldr), fluidounce (floz), gill (gi), cup (cp), pint (pt), quart (qt), gallon (gal), beerbarrel (bbl), oilbarrel (obl), hogshead, drop (gtt) |
| Ángulos | rad (radian), deg (degree), grad (gradian), cycle, arcsec (arcsecond), arcmin (arcminute) |
| Tiempo | second (s), minute (min), hour (h), day, week, month, year, decade, century, millennium |
| Frecuencia | hertz (Hz) |
| Masa | gram (g), tonne, ton, grain (gr), dram (dr), ounce (oz), poundmass (lbm, lb, lbs), hundredweight (cwt), stick, stone |
| Corriente eléctrica | ampere (A) |
| Temperatura | kelvin (K), celsius (degC), fahrenheit (degF), rankine (degR) |
| Cantidad de sustancia | mole (mol) |
| Intensidad luminosa | candela (cd) |
| Fuerza | newton (N), dyne (dyn), poundforce (lbf), kip |
| Energía | joule (J), erg, Wh, BTU, electronvolt (eV) |
| Potencia | watt (W), hp |
| Presión | Pa, psi, atm, torr, bar, mmHg, mmH2O, cmH2O |
| Electricidad & magnetismo | coulomb (C), volt (V), ohm, farad (F), weber (Wb), tesla (T), henry (H), siemens (S) |
| Binario | bits (b), bytes (B) |

Consulta la [referencia de unidades de mathjs](https://mathjs.org/docs/datatypes/units.html#reference) para la lista completa. Las unidades de tiempo y temperatura también aparecen en [fechas e intervalos de tiempo](/docs/dates/).
