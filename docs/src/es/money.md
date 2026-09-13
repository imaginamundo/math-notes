# Dinero & monedas

Convierte entre monedas usando códigos ISO de 3 letras o símbolos. Las tasas vienen del [Banco Central Europeo](https://www.ecb.europa.eu) vía [Frankfurter](https://frankfurter.dev) y se guardan en caché local para que las conversiones sigan funcionando sin conexión.

## Convertir

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

## Cómo se escriben los resultados

Los resultados usan el símbolo de la moneda cuando lo tienen (`350usd` pasa a `US$ 350`); las monedas sin símbolo conservan su código ISO. Una tasa se lee como una frase: `100 USD/hour` pasa a `US$ 100 per hour`.

```calc US$ 100 per hour
100 USD/hour
```

## El dinero solo forma razones

Una moneda se puede dividir por otra unidad para formar una tasa (`USD/hour`, `USD/km`, `USD/kg`), pero no se puede multiplicar por una unidad no relacionada. `BRL hour` se informa como error, no como una unidad combinada extraña — usa una tasa.

## Códigos admitidos

`AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`.

Para los símbolos de moneda que reconoce la app, escribe un símbolo como `$`, `€`, `£` o `R$` y deja que la app sugiera el código correspondiente.
