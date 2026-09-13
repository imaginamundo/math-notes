## Basics

Type a calculation on any line and its result appears right beside it as a dimmed hint. Errors show inline in red. The **total** at the bottom sums all numeric results — use its dropdown to switch to the **average** or **median** — and results are formatted with thousands separators. Results show up to 3 decimal places (**Settings → Decimal precision**); a value with more precision ends with an ellipsis, while calculations keep full precision.

The footer's **−** / **+** change the editor text size (50–200%, with **Reset size** back to 100%). On a first visit a **Welcome** sheet demonstrates the app; use its **Keep content** / **Clear content** buttons to dismiss or empty it. As you type, a popup suggests variables, **#tags** and built-in names (or press **Ctrl+Space**): **↑**/**↓** to choose, **Enter**/**Tab** to insert, **Esc** to dismiss.

```calc returns 2
1 + 1
```

```calc returns 7
2 * 3 + 1
```

```calc returns 4
(4 / 2) ^ 2
```

```calc returns 4
sqrt(16)
```

```calc returns 1
10 % 3
```

```calc returns 1,000,000
1000000
```

| Operator | Function |
| --- | --- |
| `+` | Add |
| `-` | Subtract |
| `*` | Multiply |
| `/` | Divide |
| `^` | Power |
| `%` | Remainder |

Many more functions and operators are available — see the [mathjs documentation](https://mathjs.org/docs/expressions/syntax.html#operators).

## Tabs

Use the tabs at the top to keep separate worksheets. Every tab is saved automatically as you type.

-   **Switch** — click a tab (or use `←`/`→` once focused, or `Ctrl+Tab`).
-   **Reorder** — click and drag a tab to a new position.
-   **Rename** — double-click the tab name.
-   **Close** — click the `×` (you'll be asked to confirm).
-   **Add** — click the `+` tab.
-   **Export / Import** — use the buttons in the **Settings** modal to download the active sheet as text or load one from a file.
-   **Share** — the **Share** button copies a link that carries the active sheet inside it. Anyone who opens it is asked whether to open the sheet in a new tab; it never replaces what they already have. Nothing is uploaded: the sheet travels in the link's `#` fragment, which browsers never send to a server.

## Comments, labels & tags

Everything after a `#` followed by a space is ignored (a comment). A `label:` before an expression names the line without being evaluated.

```calc returns 4
2 + 2 # this is a note
```

```calc returns 15
Price: 10 + 5
```

With no space, `#word` is a **tag**. A line that is only tags shows their total, and `sum`/`total`/`average`/`avg` (optionally `of`) before the tag also work. Tagged lines above are summed, wherever they are. A row with several tags is the full amount split equally between them, so each tag gets its share while the row and its group total keep the full price. Tags can also be used in calculations: `#food * 2`, `#food + #other`. Requesting a tag that has no tagged lines shows an error.

```calc last line returns 50
20 #food
30 #food
#food
```

```calc last line returns 100
20 #food
30 #food
#food * 2
```

**Tip:** click a line's number in the left gutter to comment or uncomment that line — handy for switching a calculation off without deleting it. A line that already starts with `##` just loses one `#`.

## Variables

Assign a value with `=` and reuse it on later lines. Use `prev` for the most recent result above — it skips comments and blank lines. `sum`/`total`/`average`/`avg` aggregate the lines above until a blank line, which starts a new block.

```calc last line returns 15
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people
```

```calc last line returns 80
20
prev * 4
```

```calc last line returns 11
10
# a comment in between
prev + 1
```

```calc last line returns 30
10
20
sum
```

```calc last line returns 6
4
8
average
```

Objects group named values; reach a field with a dot.

```calc last line returns 132
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax
```

Variable names can contain spaces.

```calc last line returns 18,000
monthly rent = 1500
monthly rent * 12
```

Reference the result of a line above with `line(n)`. The reference shows the value inline (the raw `line(n)` stays visible while you edit that line) and only lines above can be referenced.

```calc last line returns 10
5
line(1) * 2
```

## Groups

Open a named group with a label on its own line (like `Groceries:`) and close it with `end`. The header shows the group's subtotal and the whole group is shaded as a box; the inner lines still count in the bottom total. Blank lines inside are ignored, and `sum`/`average` inside a group total that group. A header with no `end` is just a label, and an `end` with no header is an error.

```calc header shows 10.1
Groceries:
4.50
3.20
2.40
end
```

```calc header shows 1.1 m
Trip:
10 cm
1 m
end
```

## Functions

Store a function with `f(x) = …` and call it later. Numi-style aliases are available too: `ln`, `fact`, `arcsin`, `arccos`, `arctan`, `root`.

```calc last line returns 42
double = f(x) = x * 2
double(21)
```

```calc returns 120
fact(5)
```

```calc returns 1
ln(e)
```

```calc returns 2
root(8, 3)
```

## Lists

Write a list with square brackets. Lists are **1-indexed**: `n[1]` is the first element. Slice with a range, assign elements, do element-wise arithmetic, and combine lists with the mathjs functions. Lists are capped at 100 items.

```calc [1, 2, 3]
[1, 2, 3]
```

```calc 10 (first element)
n = [10, 20, 30]
n[1]
```

```calc [20, 30, 40]
n = [10, 20, 30, 40]
n[2:4]
```

```calc sets the second element
n = [10, 20, 30]
n[2] = 99
```

```calc [4, 6]
[1, 2] + [3, 4]
```

```calc last line returns 1325
expenses = [1200, 80, 45]
sum(expenses)
```

```calc returns 5.5
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

## Sequences & iteration

A range `start:end` (with an optional `:step`) makes a list of numbers, and calling a function with a range applies it to every element. Lists can be named and indexed like any other variable. Ranges are capped at 100 items.

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

```calc returns 5050
sum(1:100)
```

```calc returns 3
mean(1:5)
```

## Percentages

Use `of`, `on` and `off` with `%` for percentage math.

```calc returns 2
20% of 10
```

```calc returns 31.5
5% on 30
```

```calc returns 37.6
6% off 40
```

```calc returns 50
50 as a % of 100
```

```calc returns 120
5% of what is 6
```

## Rounding

Round a result with a phrase at the end of the line, or call `round`, `ceil` or `floor` directly. Rounding works with units and currencies too.

```calc returns 0.33
1/3 to 2 dp
```

```calc returns 3.14159
π to 5 digits
```

```calc returns 6
5.5 rounded
```

```calc returns 6
5.5 rounded up
```

```calc returns 5
5.5 rounded down
```

```calc returns 40
37 to nearest 10
```

```calc returns US$ 500
$490 rounded to nearest hundred
```

```calc returns 25
21 rounded up to nearest 5
```

```calc returns 9/16
0.534 to nearest 16th
```

## Operators & scales

Word operators and number scales work naturally: `plus`, `minus`, `times`, `multiplied by`, `divided by`, `with`, `without` and `mul`.

```calc returns 72
8 times 9
```

```calc returns 5
2 plus 3
```

```calc returns 7
10 minus 3
```

```calc returns 42
6 multiplied by 7
```

```calc returns 5
10 divided by 2
```

```calc returns 150 minutes
2 hours with 30 minutes
```

```calc returns 90 minutes
2 hours without 30 minutes
```

```calc returns 12
3 mul 4
```

```calc returns 2,000
2k
```

```calc returns 1,000,000
1kk
```

```calc returns 1,000,000,000
1kkk
```

## Unit conversion

Convert units with `to`, `in` or `as`. CSS units are supported too: `px`, `em` and `point`. Cooking volume units follow the measurement system in **Settings → Measurement system** — Metric (default), US customary or Imperial — which sets `cup` (250 / 236.6 / 284.1 ml), `tsp`, `tbsp`, `fl oz`, `pint`, `quart` and `gallon`.

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

```calc returns ≈ 37.8 px
1 cm in px
```

```calc returns 32 px
2 em in px
```

| Base | Unit |
| --- | --- |
| Length | meter (m), inch (in), foot (ft), yard (yd), mile (mi), link (li), rod (rd), chain (ch), angstrom, mil |
| Surface area | m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare |
| Volume | m3, litre (l, L, lt, liter), cc, cuin, cuft, cuyd, teaspoon, tablespoon |
| Liquid volume | minim (min), fluiddram (fldr), fluidounce (floz), gill (gi), cup (cp), pint (pt), quart (qt), gallon (gal), beerbarrel (bbl), oilbarrel (obl), hogshead, drop (gtt) |
| Angles | rad (radian), deg (degree), grad (gradian), cycle, arcsec (arcsecond), arcmin (arcminute) |
| Time | second (s, secs, seconds), minute (mins, minutes), hour (h, hr, hrs, hours), day (days), week (weeks), month (months), year (years), decade (decades), century (centuries), millennium (millennia) |
| Frequency | hertz (Hz) |
| Mass | gram(g), tonne, ton, grain (gr), dram (dr), ounce (oz), poundmass (lbm, lb, lbs), hundredweight (cwt), stick, stone |
| Electric current | ampere (A) |
| Temperature | kelvin (K), celsius (degC), fahrenheit (degF), rankine (degR) |
| Amount of substance | mole (mol) |
| Luminous intensity | candela (cd) |
| Force | newton (N), dyne (dyn), poundforce (lbf), kip |
| Energy | joule (J), erg, Wh, BTU, electronvolt (eV) |
| Power | watt (W), hp |
| Pressure | Pa, psi, atm, torr, bar, mmHg, mmH2O, cmH2O |
| Electricity and magnetism | ampere (A), coulomb (C), watt (W), volt (V), ohm, farad (F), weber (Wb), tesla (T), henry (H), siemens (S), electronvolt (eV) |
| Binary | bits (b), bytes (B) |

See the [mathjs units reference](https://mathjs.org/docs/datatypes/units.html#reference) for the full list.

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

A rate is one unit per another. mathjs does the arithmetic; these phrases make rates easy to write.

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

## Currency conversion

Convert between currencies using 3-letter ISO codes or symbols. Results are written with the currency's symbol where it has one (`350usd` becomes `US$ 350`); currencies without a symbol keep their code. Money only forms ratios (`USD/hour`, `USD/km`), so multiplying a currency by another unit (`BRL hour`) is an error — use a rate instead. Rates come from the European Central Bank (via frankfurter.dev) and are cached locally for offline use.

```calc converts USD to EUR
100 USD to EUR
```

```calc converts to GBP
$5 to GBP
```

```calc converts to EUR
R$5 to EUR
```

```calc converts to BRL
50 EUR in BRL
```

```calc US$ 100 per hour
100 USD/hour
```

**Supported codes:** `AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`.

## Dates

Convert unix timestamps with `fromunix`, get the current time with `unix()`, and use date units directly.

```calc Jan 1, 1970…
fromunix(0)
```

```calc Nov 3, 2015…
fromunix(1446587186)
```

```calc current timestamp
unix()
```

```calc 30.4375 days
1 month in days
```

## Calendar

Add or subtract time from a date, measure the interval between dates, and format a date with a pattern. Dates can be written as `10 June`, `June 10, 2023`, `2019-04-01` or `12/02/1988`. A date can be saved in a variable and reused (`start = March 4`, then `start + 2 weeks`). Clock times (`9:45 am`, `1:30`) add durations and measure intervals, shown in 24-hour by default (**Settings → Clock**). Workdays are Monday to Friday (public holidays are not counted yet).

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

```calc three weeks from today
today + 3 weeks
```

```calc four days from now
4 days from now
```

```calc a clock time 3¼ hours later
16:00 + 3 hours 12 minutes
```

```calc 13 hours 15 minutes
7:30am to 8:45pm
```

```calc a clock time 3¼ hours from now
now + 3 hours 15 minutes
```

```calc 3 weeks 5 days
January 10 - February 5
```

```calc days until 25 December
days until Christmas
```

```calc 15 workdays
workdays in 3 weeks
```

```calc 176 work hours (8h days)
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

## Timespans

Show a duration as a timespan of components, or split it into two units. A timespan is a real duration, so it can be added and multiplied, and converted to a single unit with `to`/`in`/`as` (`as minutes`). Time units can be written short (`3h 5m 10s`) or long.

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

```calc last line: 1 hour 5 minutes 30 seconds
5.5 minutes as timespan
line(1) + 1h
```

## Shortcuts & files

The active sheet can be exported and imported from the **Settings** modal or with the shortcuts below.

| Shortcut | Action |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Undo the last change in the tab |
| `⇧⌘Z` `Ctrl+Shift+Z` | Redo |
| `Ctrl+Tab` `Ctrl+⇧Tab` | Next / previous tab |
| `⌘1…9` `Ctrl+1…9` | Jump to the nth tab |
| `⌘F` `Ctrl+F` | Find & replace in the active sheet |
| `⌘G` `Ctrl+G` | Jump to a line number |
| `Tab` | Indent the line or selection |
| `⇧Tab` | Outdent the line or selection |
| `⇧⌘C` `Ctrl+Shift+C` | Copy the current line's result |
| `⇧⌘S` `⇧⌘L` | Copy a share link for the active sheet |
| `⇧⌘E` `Ctrl+Shift+E` | Export the active sheet |
| `⇧⌘I` `Ctrl+Shift+I` | Import a sheet |
| `⇧⌘⌫` `Ctrl+Shift+Backspace` | Clear the active sheet |

## About

Math Notes is a browser-based inline calculator, inspired by [Numi](https://numi.app) and [Soulver](https://soulver.app). Its source is open — see the [GitHub repository](https://github.com/imaginamundo/math-notes).

Calculations run on [mathjs](https://mathjs.org), an extensible math library for JavaScript, and currency conversion rates come from the [European Central Bank](https://www.ecb.europa.eu) via [Frankfurter](https://frankfurter.dev).

Your sheets stay on your device: they are saved in your browser's storage and are never sent to a server.
