# Unidades & medidas

Converta entre unidades com `to`, `in` ou `as`, nomeie o que você está medindo para converter entre dimensões, e escreva taxas naturalmente.

## Conversão de unidades

```calc retorna 0.01 m
1cm to m
```

```calc retorna 7200 s
2h to s
```

```calc retorna 5000 m
5km to m
```

```calc retorna 86 degF
30 degC to degF
```

```calc retorna 45.36 kg
100 lb in kg
```

Unidades CSS também são suportadas, para você conferir um layout:

```calc retorna ≈ 37.8 px
1 cm in px
```

```calc retorna 32 px
2 em in px
```

## Sistema de medidas

As unidades de volume de cozinha seguem o sistema de medidas em **Configurações → Sistema de medidas** — Métrico (padrão), Americano ou Imperial. Ele define `cup` como 250, 236.6 ou 284.1 ml, respectivamente, junto com `tsp`, `tbsp`, `fl oz`, `pint`, `quart` e `gallon`.

## Cozinha & medidas

Converta entre dimensões nomeando o que você está medindo. O sujeito é livre e opcional: um ingrediente conhecido usa sua densidade, um combustível sua densidade energética, mídias seu bitrate, e qualquer outra coisa usa um padrão (água). Escreva-o antes de `to`/`in`.

```calc ≈ 1.32 cups
300g butter in cups
```

```calc 265 grams
2 cups flour in grams
```

```calc 211.25 grams
1 cup sugar in grams
```

```calc 1.2 cups (sujeito opcional)
300g in cups
```

```calc 1.2 cups (qualquer sujeito funciona)
300g feathers in cups
```

```calc 9.5 kWh
1 l petrol in kWh
```

```calc 14.4 GB
2 hours 4k video in GB
```

## Taxas

Uma taxa é uma unidade por outra. O mathjs faz a aritmética; estas frases facilitam escrever taxas. `per`, `a`, `an`, `at` e `for` são todos entendidos.

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

```calc 5 min
time to upload 3 GB at 10 MB/s
```

```calc 05:00/km
5 km in 25 min
```

## A regra das unidades

Unidades só se combinam em formas que fazem sentido. `kg L`, `BRL hour`, `h^2` e `m^0.5` são reportados como erros, não como unidades combinadas estranhas. Dinheiro só forma razões (`USD/hour`, `USD/km`), então use uma taxa quando quiser converter uma moeda ao longo do tempo ou da distância.

## Referência de unidades

| Base | Unidades |
| --- | --- |
| Comprimento | meter (m), inch (in), foot (ft), yard (yd), mile (mi), link (li), rod (rd), chain (ch), angstrom, mil |
| Área de superfície | m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare |
| Volume | m3, litre (l, L, lt, liter), cc, cuin, cuft, cuyd, teaspoon, tablespoon |
| Volume líquido | minim (min), fluiddram (fldr), fluidounce (floz), gill (gi), cup (cp), pint (pt), quart (qt), gallon (gal), beerbarrel (bbl), oilbarrel (obl), hogshead, drop (gtt) |
| Ângulos | rad (radian), deg (degree), grad (gradian), cycle, arcsec (arcsecond), arcmin (arcminute) |
| Tempo | second (s), minute (min), hour (h), day, week, month, year, decade, century, millennium |
| Frequência | hertz (Hz) |
| Massa | gram (g), tonne, ton, grain (gr), dram (dr), ounce (oz), poundmass (lbm, lb, lbs), hundredweight (cwt), stick, stone |
| Corrente elétrica | ampere (A) |
| Temperatura | kelvin (K), celsius (degC), fahrenheit (degF), rankine (degR) |
| Quantidade de matéria | mole (mol) |
| Intensidade luminosa | candela (cd) |
| Força | newton (N), dyne (dyn), poundforce (lbf), kip |
| Energia | joule (J), erg, Wh, BTU, electronvolt (eV) |
| Potência | watt (W), hp |
| Pressão | Pa, psi, atm, torr, bar, mmHg, mmH2O, cmH2O |
| Eletricidade & magnetismo | coulomb (C), volt (V), ohm, farad (F), weber (Wb), tesla (T), henry (H), siemens (S) |
| Binário | bits (b), bytes (B) |

Veja a [referência de unidades do mathjs](https://mathjs.org/docs/datatypes/units.html#reference) para a lista completa. Unidades de tempo e temperatura também aparecem em [datas e intervalos de tempo](/docs/dates/).
