# Math Notes — examples

A catalogue of calculations that exercises every feature of Math Notes. Each block
is a small sheet you can paste into the editor; the line's result is shown after
`→`. A few results depend on today's date or the latest exchange rates, and that
is noted inline.

- [Basics](#basics)
- [Numbers & operators](#numbers--operators)
- [Variables & references](#variables--references)
- [Groups & tags](#groups--tags)
- [Lists & sequences](#lists--sequences)
- [Units & measures](#units--measures)
- [Money](#money)
- [Dates & time](#dates--time)
- [Features beyond calculations](#features-beyond-calculations)

## Basics

Every line is evaluated; the result appears to its right as dimmed ghost text, and
the bar at the bottom shows a running total of the numeric results.

### Plain calculations

```
1 + 2 * 3   → 7
(4 / 2) ^ 2   → 4
10 % 3   → 1
5!   → 120
```

### Comments and labels

```
2 + 2   # everything after a "# " is ignored   → 4
Price: 10 + 5   → 15
```

### The running total

```
10
20
30
```

The bottom bar shows `60`; its dropdown switches between total, average and median.

## Numbers & operators

### Arithmetic

```
1 + 2 * 3   → 7
(4 / 2) ^ 2   → 4
10 % 3   → 1
5!   → 120
```

### Comparisons

```
2 < 3   → true
3 >= 3   → true
2 == 2   → true
```

### Word operators

```
8 times 9   → 72
2 plus 3   → 5
10 minus 3   → 7
6 multiplied by 7   → 42
10 divided by 2   → 5
3 mul 4   → 12
2 hours with 30 minutes   → 2 hours 30 minutes
2 hours without 30 minutes   → 1 hour 30 minutes
```

### Number scales

```
2k   → 2,000
1kk   → 1,000,000
1kkk   → 1,000,000,000
```

### Constants and functions

```
pi   → 3.142…
e   → 2.718…
sqrt(16)   → 4
abs(-7)   → 7
round(2.4)   → 2
ceil(2.1)   → 3
floor(2.9)   → 2
sin(0)   → 0
cos(0)   → 1
log10(1000)   → 3
log(8, 2)   → 3
min(3, 8, 2)   → 2
max(3, 8, 2)   → 8
fact(5)   → 120
ln(e)   → 1
arcsin(1)   → 1.571…
arccos(0)   → 1.571…
arctan(1)   → 0.785…
root(8, 3)   → 2
```

### Rounding

```
1/3 to 2 dp   → 0.33
pi to 5 digits   → 3.142…
5.5 rounded   → 6
5.5 rounded up   → 6
5.5 rounded down   → 5
37 to nearest 10   → 40
21 rounded up to nearest 5   → 25
0.534 to nearest 16th   → 9/16
```

### Percentages

```
20% of 10   → 2
5% on 30   → 31.5
6% off 40   → 37.6
50 as a % of 100   → 50
5% of what is 6   → 120
```

## Variables & references

### Variables

```
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people   → 15
```

### Multi-word names

```
monthly rent = 1500
monthly rent * 12   → 18,000
```

### Functions

```
double = f(x) = x * 2
double(21)   → 42
```

### Objects

```
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax   → 132
```

### References

```
5
line(1) * 2   → 10
```

```
20
prev * 4   → 80
```

```
10
# a comment in between
prev + 1   → 11
```

### Aggregates

`sum`/`total`/`average`/`avg` total the lines above, up to a blank line.

```
10
20
sum   → 30
```

```
4
8
average   → 6
```

```
10
20
sum

1
2
sum   → 3
```

## Groups & tags

### Groups

Wrap lines in `Name:` … `end` to show a subtotal on the header and shade the
block; the inner lines still count in the bottom total.

```
Groceries:   → 10.1
  4.50
  3.20
  2.40
end
```

```
Trip:   → 1.1 m
  10 cm
  1 m
end
```

### Tags

A `#word` labels a row; a line that is only tags totals them.

```
20 #food
30 #food
#food   → 50
```

```
20 #food
30 #food
#food * 2   → 100
```

A row with several tags is split equally between them.

```
burger: 2 * 50 #ana #bob   → 100
#ana   → 50
#bob   → 50
```

```
Budget:   → 1,830
  rent: 1200 #home   → 1,200
  utilities: 150 #home   → 150
  groceries: 480 #living   → 480
end
#home   → 1,350
#living   → 480
#home + #living   → 1,830
```

## Lists & sequences

### Lists

Lists are 1-indexed and capped at 100 items.

```
[1, 2, 3]   → [1, 2, 3]
```

```
n = [10, 20, 30]
n[1]   → 10
```

```
n = [10, 20, 30, 40]
n[2:4]   → [20, 30, 40]
```

```
n = [10, 20, 30]
n[2] = 99   → 99
```

```
[1, 2] + [3, 4]   → [4, 6]
sort([3, 1, 2])   → [1, 2, 3]
concat([1, 2], [3, 4])   → [1, 2, 3, 4]
m = [[1, 2], [3, 4]]
m[2, 1]   → 3
```

### Sequences

```
1:5   → [1, 2, 3, 4, 5]
1:2:10   → [1, 3, 5, 7, 9]
n = 1:5
n[3]   → 3
```

### Iteration

```
double = f(x) = x * 2
double(1:5)   → [2, 4, 6, 8, 10]
```

### Aggregates

```
sum(1:100)   → 5,050
mean(1:5)   → 3
sum([1200, 80, 45])   → 1,325
```

## Units & measures

### Unit conversion

```
1cm to m   → 0.01 m
2h to s   → 7,200 s
5km to m   → 5,000 m
30 degC to degF   → 86 degF
100 lb in kg   → 45.359… kg
500 g to kg   → 0.5 kg
```

### CSS units

```
1 cm in px   → 37.795… px
2 em in px   → 32 px
```

### Cooking & measures

The subject is free-form and optional; a known ingredient uses its density, a
fuel its energy density, media their bitrate, anything else water.

```
300g butter in cups   → 1.317… cups
2 cups flour in grams   → 265 grams
1 cup sugar in grams   → 211.25 grams
300g in cups   → 1.2 cups
300g feathers in cups   → 1.2 cups
1 l petrol in kWh   → 9.5 kWh
2 hours 4k video in GB   → 14.4 GB
```

### Rates

```
90 km / 3 day   → 30 km/day
```

```
30 hours at 10 km/hour   → 300 km
```

```
100 km at 10 km/hour   → 10 hours
```

```
24 km a day for a year   → 8,766 km
```

```
time to upload 3 GB at 10 MB/s   → 300 s
```

```
5 km in 25 min   → 05:00/km
```

## Money

### Currency conversion

Conversions use live European Central Bank rates, cached for offline use.

```
100 USD to EUR
$5 to GBP
R$5 to EUR
50 EUR in BRL
```

### Currency results

Money is written with the currency's symbol where it has one; a rate reads as a
phrase. Money only forms ratios, so `BRL hour` is an error — use a rate instead.

```
350usd          # → US$ 350
100 USD/hour    # → US$ 100 per hour
```

## Dates & time

### Dates

A date can be written as `10 June`, `June 10, 2023`, `2019-04-01` or
`12/02/1988`, and stored in a variable.

```
10 June + 3 weeks   → 1 July
start = March 4, 2025
start + 2 weeks   → 18 March 2025
April 1, 2019 - 3 months 5 days   → 27 December 2018
3 weeks after March 14, 2019   → 4 April 2019
```

### Intervals

```
January 10 - February 5   → 3 weeks 5 days
2019-01-10 - 2020-02-05   → 1 year 3 weeks 5 days
```

### Day counts

```
days until March 14, 2030   → 1,277 days
days since 2025-07-15   → 426 days
days between 2019-03-03 and 2019-05-30   → 88 days
April 1 through April 30 in days   → 30 days
```

The first two count from today.

### Date parts

```
days in February 2020   → 29 days
days in Q3   → 92 days
day number on February 11, 2019   → 42
day of month on March 11, 2019   → 11
week number on March 9, 2024   → 10
```

### Workdays & work hours

Workdays are Monday to Friday and a work day is eight hours; public holidays are
not counted yet.

```
workdays in 3 weeks   → 15
10 March to 17 March in workdays   → 5
5 workdays after March 14, 2019   → 21 March 2019
workdays in June 2026   → 22
work hours in June 2026   → 176
weekday on March 9, 2024   → Saturday
```

### Formatting

```
March 12, 2023 as EEEE, MMM d, yyyy   → Sunday, Mar 12, 2023
```

### Clock times

```
16:00 + 3 hours 12 minutes   → 19:12
7:30am to 8:45pm   → 13 hours 15 minutes
```

`now + 3 hours 15 minutes` also works; its result depends on the current time.
Clock times show in 24-hour by default (**Settings → Clock** switches to 12-hour).

### Timespans

```
5.5 minutes as timespan   → 5 min 30 s
72 days as timespan   → 10 weeks 2 days
3h 5m 10s   → 3 hours 5 minutes 10 seconds
3h 5m 10s in seconds   → 11,110 seconds
12.5 minutes in minutes and seconds   → 12 min 30 s
span = 2 hours
span + 30 minutes   → 2 hours 30 minutes
```

### Unix timestamps

```
fromunix(1446587186)   # → 3 November 2015
unix()                 # → the current Unix timestamp
1 month in days   → 30.438… days
```

## Features beyond calculations

- **Tabs** — separate worksheets; rename by double-clicking, close with `×`,
  add with `+`, reorder by dragging. Switch with `Ctrl+Tab` or `⌘1…9`.
- **Undo / redo** — `⌘Z` / `Ctrl+Z` and `⇧⌘Z` / `Ctrl+Shift+Z`, per tab.
- **Find & replace** — `⌘F` / `Ctrl+F` searches the active sheet with live
  highlighting.
- **Autocomplete** — as you type, or on `Ctrl+Space`; offers variables, `#tags`
  and built-in names.
- **Line numbers** — the left gutter numbers the sheet; click a number to
  comment or uncomment that line.
- **Go to line** — `⌘G` / `Ctrl+G`.
- **Indentation** — `Tab` and `Shift+Tab` indent or outdent the line or
  selection.
- **Comments** — `# ` starts a comment; `Name:` labels a line.
- **Decimal precision** — results show up to 3 decimal places by default
  (**Settings → Decimal precision**); a truncated value ends with `…`.
- **Text size** — the footer's `−` / `+` step the editor between 50% and 200%.
- **Clock format** — 24-hour by default; **Settings → Clock** switches to
  12-hour.
- **Measurement system** — Metric, US customary or Imperial for cooking volume
  units (**Settings → Measurement system**).
- **Language** — the interface, Examples and documentation ship in English,
  Portuguese and Spanish (**Settings → Language**).
- **Export / import** — `⇧⌘E` / `Ctrl+Shift+E` and `⇧⌘I` / `Ctrl+Shift+I`.
- **Share links** — the **Share** button packs the active sheet into the link's
  `#` fragment; nothing is uploaded.
- **Snapshots** — every tab is auto-saved to IndexedDB and recoverable from
  **Settings → Recover**.
- **Offline** — installable PWA with a service worker; works without a network.

The full reference is in the documentation at `/docs`.
