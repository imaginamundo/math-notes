# Dinheiro & moedas

Converta entre moedas usando códigos ISO de 3 letras ou símbolos. As taxas vêm do [Banco Central Europeu](https://www.ecb.europa.eu) via [Frankfurter](https://frankfurter.dev) e ficam em cache local para que as conversões continuem funcionando offline.

## Convertendo

```calc converte USD para EUR
100 USD to EUR
```

```calc converte para GBP
$5 to GBP
```

```calc converte para EUR
R$5 to EUR
```

```calc converte para BRL
50 EUR in BRL
```

## Como os resultados são escritos

Os resultados usam o símbolo da moeda quando ela tem um (`350usd` vira `US$ 350`); moedas sem símbolo mantêm o código ISO. Uma taxa lê como uma frase: `100 USD/hour` vira `US$ 100 per hour`.

```calc US$ 100 per hour
100 USD/hour
```

## Dinheiro só forma razões

Uma moeda pode ser dividida por outra unidade para formar uma taxa (`USD/hour`, `USD/km`, `USD/kg`), mas não pode ser multiplicada por uma unidade não relacionada. `BRL hour` é reportado como erro, não como uma unidade combinada estranha — use uma taxa.

## Códigos suportados

`AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`.

Para os símbolos de moeda que o app reconhece, digite um símbolo como `$`, `€`, `£` ou `R$` e deixe o app sugerir o código correspondente.
