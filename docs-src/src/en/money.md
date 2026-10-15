# Money & currencies

Convert between currencies using 3-letter ISO codes or symbols. Rates come from the [European Central Bank](https://www.ecb.europa.eu) via [Frankfurter](https://frankfurter.dev) and are cached locally so conversions keep working offline. While a window stays open the rates are re-checked every hour; if a check fails or takes longer than 10 seconds, the cached rates are used and a short notice says so.

## Converting

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

## How results are written

Results use the currency's symbol where it has one (`350usd` becomes `US$ 350`); currencies without a symbol keep their ISO code. A rate reads as a phrase: `100 USD/hour` becomes `US$ 100 per hour`.

```calc US$ 100 per hour
100 USD/hour
```

## Money only forms ratios

A currency can be divided by another unit to make a rate (`USD/hour`, `USD/km`, `USD/kg`), but it cannot be multiplied by an unrelated unit. `BRL hour` is reported as an error rather than as a strange combined unit — use a rate instead.

A symbol and a code together (`$30 CAD`, `€5 EUR`) mean the code's currency.

## Supported codes

`AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`.

A currency symbol such as `$`, `€`, `£` or `R$` works wherever a code does, including as the target of a conversion (`$5 to €`, `5 EUR in R$`). Autocomplete completes a code from its first letters.
