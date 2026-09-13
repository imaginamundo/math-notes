# Referência

Uma referência compacta da sintaxe. Cada título aparece na barra lateral para acesso rápido.

## Operadores

| Operador | Significado |
| --- | --- |
| `+` `-` `*` `/` | Somar, subtrair, multiplicar, dividir |
| `^` | Potência |
| `%` | Resto |
| `!` | Fatorial |
| `( )` | Agrupar |
| `=` | Atribuir |
| `[ ]` | Lista ou índice |
| `:` | Intervalo ou passo |

## Operadores em palavras

`plus`, `minus`, `times`, `multiplied by`, `divided by`, `with`, `without`, `mul`.

## Palavras-chave

| Palavra-chave | Significado |
| --- | --- |
| `sum` `total` | Somar as linhas acima (até uma linha em branco) |
| `average` `avg` | Calcular a média das linhas acima |
| `prev` | O resultado anterior |
| `line(n)` | O resultado da linha `n` |
| `end` | Fechar um [grupo](/docs/groups/) |

## Aliases de função

| Alias | Significado |
| --- | --- |
| `ln(x)` | Logaritmo natural |
| `fact(x)` | Fatorial |
| `arcsin` `arccos` `arctan` | Funções trigonométricas inversas |
| `root(n, x)` | A raiz `x`-ésima de `n` |
| `fromunix(t)` | Uma data a partir de um timestamp Unix |
| `unix()` | O timestamp Unix atual |

As funções padrão do mathjs (`sqrt`, `abs`, `round`, `ceil`, `floor`, `sin`, `cos`, `mean`, `sum`, `min`, `max`, `sort`, `concat`, …) também estão disponíveis.

## Constantes

`pi`, `π`, `e`.

## Unidades

Famílias comuns: comprimento (`m`, `cm`, `km`, `in`, `ft`, `mi`), massa (`g`, `kg`, `lb`, `oz`), volume (`l`, `ml`, `cup`, `tbsp`), tempo (`s`, `min`, `h`, `day`, `week`), temperatura (`degC`, `degF`, `K`), dados (`b`, `B`, `kB`, `MB`, `GB`), energia (`J`, `Wh`, `kWh`, `BTU`), potência (`W`, `hp`) e pressão (`Pa`, `psi`, `atm`, `bar`). A lista completa está em [Unidades & medidas](/docs/units/).

## Moedas

`AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`. Veja [Dinheiro & moedas](/docs/money/).

## Calendário

Palavras de data `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`; frases `days until`, `workdays in`, `work hours in`, `weekday on`, `as <padrão>`; horários como `9:45 am`, `16:00`. Veja [Datas & tempo](/docs/dates/).

## Arredondamento

`to n dp`, `to n digits`, `rounded`, `rounded up`, `rounded down`, `to nearest n` (incluindo frações como `to nearest 16th`).

## Atalhos de teclado

| Atalho | Ação |
| --- | --- |
| `⌘Z` / `Ctrl+Z` | Desfazer a última alteração na aba |
| `⇧⌘Z` / `Ctrl+Shift+Z` | Refazer |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Próxima / aba anterior |
| `⌘1…9` / `Ctrl+1…9` | Ir para a enésima aba |
| `⌘F` / `Ctrl+F` | Localizar e substituir na planilha ativa |
| `⌘G` / `Ctrl+G` | Ir para um número de linha |
| `Ctrl+Space` | Mostrar sugestões de autocompletar |
| `Tab` / `Shift+Tab` | Indentar / desindentar a(s) linha(s) |
| `⇧⌘C` / `Ctrl+Shift+C` | Copiar o resultado da linha atual |
| `⇧⌘S` `⇧⌘L` / `Ctrl+Shift+S` | Copiar um link de compartilhamento |
| `⇧⌘E` / `Ctrl+Shift+E` | Exportar a planilha ativa |
| `⇧⌘I` / `Ctrl+Shift+I` | Importar uma planilha |
| `⇧⌘⌫` / `Ctrl+Shift+Backspace` | Limpar a planilha ativa |

## Palavras reservadas

`prev`, `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`, `end`, e qualquer nome que comece com `__` não podem ser usados como variáveis.
