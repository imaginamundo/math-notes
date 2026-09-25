# Reference

A compact reference for the syntax. Every heading links from the sidebar for quick access.

## Operators

| Operator | Meaning |
| --- | --- |
| `+` `-` `*` `/` | Add, subtract, multiply, divide |
| `^` | Power |
| `%` | Remainder |
| `!` | Factorial |
| `( )` | Group |
| `=` | Assign |
| `[ ]` | List or index |
| `:` | Range or step |

## Word operators

`plus`, `minus`, `times`, `multiplied by`, `divided by`, `with`, `without`, `mul`.

## Keywords

| Keyword | Meaning |
| --- | --- |
| `sum` `total` | Sum the lines above (until a blank line) |
| `average` `avg` | Average the lines above |
| `prev` | The previous result |
| `line(n)` | The result of line `n` |
| `end` | Close a [group](/docs/groups/) |

## Function aliases

| Alias | Meaning |
| --- | --- |
| `ln(x)` | Natural logarithm |
| `fact(x)` | Factorial |
| `arcsin` `arccos` `arctan` | Inverse trigonometric functions |
| `root(n, x)` | The `x`-th root of `n` |
| `fromunix(t)` | A date from a Unix timestamp |
| `unix()` | The current Unix timestamp |

The standard mathjs functions (`sqrt`, `abs`, `round`, `ceil`, `floor`, `sin`, `cos`, `mean`, `sum`, `min`, `max`, `sort`, `concat`, …) are also available.

## Constants

`pi`, `π`, `e`.

## Units

Common families: length (`m`, `cm`, `km`, `in`, `ft`, `mi`), mass (`g`, `kg`, `lb`, `oz`), volume (`l`, `ml`, `cup`, `tbsp`), time (`s`, `min`, `h`, `day`, `week`), temperature (`degC`, `degF`, `K`), data (`b`, `B`, `kB`, `MB`, `GB`), energy (`J`, `Wh`, `kWh`, `BTU`), power (`W`, `hp`) and pressure (`Pa`, `psi`, `atm`, `bar`). The full list is on [Units & measures](/docs/units/).

## Currencies

`AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`. See [Money & currencies](/docs/money/).

## Calendar

Date words `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`; phrases `days until`, `workdays in`, `work hours in`, `weekday on`, `as <pattern>`; clock times such as `9:45 am`, `16:00`. See [Dates & time](/docs/dates/).

## Rounding

`to n dp`, `to n digits`, `rounded`, `rounded up`, `rounded down`, `to nearest n` (including fractions such as `to nearest 16th`).

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘Z` / `Ctrl+Z` | Undo the last change in the tab |
| `⇧⌘Z` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `⌘1…9` / `Ctrl+1…9` | Jump to the nth tab |
| `⌘F` / `Ctrl+F` | Find & replace in the active sheet |
| `⌘G` / `Ctrl+G` | Jump to a line number |
| `Ctrl+Space` | Show autocomplete suggestions |
| `Tab` / `Shift+Tab` | Indent / outdent the line(s) |
| `⇧⌘C` / `Ctrl+Shift+C` | Copy the current line's result |
| `⇧⌘S` `⇧⌘L` / `Ctrl+Shift+S` | Copy a share link |
| `⇧⌘E` / `Ctrl+Shift+E` | Export the active sheet |
| `⇧⌘I` / `Ctrl+Shift+I` | Import a sheet |
| `⇧⌘⌫` / `Ctrl+Shift+Backspace` | Clear the active sheet |

## Reserved words

`prev`, `total`, `unit`, `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`, `end`, and any name starting with `__` cannot be used as variable names. `unit` opens a [custom unit](/docs/units/#custom-units).
