# Units & measures

Convert between units with `to`, `in` or `as`, name what you are measuring to convert across dimensions, and write rates naturally.

## Unit conversion

```calc returns 0.01 m
1cm to m
```

```calc returns 7200 s
2h to s
```

```calc returns 5000 m
5km to m
```

```calc returns 86 degF
30 degC to degF
```

```calc returns 45.36 kg
100 lb in kg
```

CSS units are supported too, so you can check a layout:

```calc returns ≈ 37.8 px
1 cm in px
```

```calc returns 32 px
2 em in px
```

## Measurement system

Cooking volume units follow the measurement system in **Settings → Measurement system** — Metric (default), US customary or Imperial. It sets `cup` to 250, 236.6 or 284.1 ml respectively, along with `tsp`, `tbsp`, `fl oz`, `pint`, `quart` and `gallon`.

## Cooking & measures

Convert between dimensions by naming what you are measuring. The subject is free-form and optional: a known ingredient uses its density, a fuel its energy density, media their bitrate, and anything else a default (water). Write it before `to`/`in`.

```calc ≈ 1.32 cups
300g butter in cups
```

```calc 265 grams
2 cups flour in grams
```

```calc 211.25 grams
1 cup sugar in grams
```

```calc 1.2 cups (subject optional)
300g in cups
```

```calc 1.2 cups (any subject works)
300g feathers in cups
```

```calc 9.5 kWh
1 l petrol in kWh
```

```calc 14.4 GB
2 hours 4k video in GB
```

## Rates

A rate is one unit per another. mathjs does the arithmetic; these phrases make rates easy to write. `per`, `a`, `an`, `at` and `for` are all understood.

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

## Custom units

Define your own unit with `unit <name> = <amount>`. It then behaves like a built-in one: the plural works, it converts to the units it was defined from, and it merges with them. Change the definition and every use follows.

```calc 2 widgets
unit widget = 3.5 kg
2 widgets
```

```calc 7 kg
unit widget = 3.5 kg
2 widgets in kg
```

A name may contain several words or accents, and a unit can be built from another.

```calc 3,000
unit monthly rent = 1500
2 monthly rents
```

```calc 84 kg
unit widget = 3.5 kg
unit box = 12 widgets
2 boxes in kg
```

Definitions are scoped to the sheet that contains them, so removing the line removes the unit. `unit` and `total` are reserved words.

## The unit rule

Units only combine in shapes that mean something. `kg L`, `BRL hour`, `h^2` and `m^0.5` are reported as errors rather than as strange combined units. Money only forms ratios (`USD/hour`, `USD/km`), so use a rate when you want to convert a currency across time or distance.

## Unit reference

| Dimension | Units |
| --- | --- |
| Length | meter (m), inch (in), foot (ft), yard (yd), mile (mi), link (li), rod (rd), chain (ch), angstrom, mil |
| Surface area | m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare |
| Volume | m3, litre (l, L, lt, liter), cc, cuin, cuft, cuyd, teaspoon, tablespoon |
| Liquid volume | minim (min), fluiddram (fldr), fluidounce (floz), gill (gi), cup (cp), pint (pt), quart (qt), gallon (gal), beerbarrel (bbl), oilbarrel (obl), hogshead, drop (gtt) |
| Angles | rad (radian), deg (degree), grad (gradian), cycle, arcsec (arcsecond), arcmin (arcminute) |
| Time | second (s), minute (min), hour (h), day, week, month, year, decade, century, millennium |
| Frequency | hertz (Hz) |
| Mass | gram (g), tonne, ton, grain (gr), dram (dr), ounce (oz), poundmass (lbm, lb, lbs), hundredweight (cwt), stick, stone |
| Electric current | ampere (A) |
| Temperature | kelvin (K), celsius (degC), fahrenheit (degF), rankine (degR) |
| Amount of substance | mole (mol) |
| Luminous intensity | candela (cd) |
| Force | newton (N), dyne (dyn), poundforce (lbf), kip |
| Energy | joule (J), erg, Wh, BTU, electronvolt (eV) |
| Power | watt (W), hp |
| Pressure | Pa, psi, atm, torr, bar, mmHg, mmH2O, cmH2O |
| Electricity & magnetism | coulomb (C), volt (V), ohm, farad (F), weber (Wb), tesla (T), henry (H), siemens (S) |
| Binary | bits (b), bytes (B) |

See the [mathjs units reference](https://mathjs.org/docs/datatypes/units.html#reference) for the full list. Time and temperature units can also appear in [dates and timespans](/docs/dates/).
