## Básico

Digite um cálculo em qualquer linha e o resultado aparece logo ao lado, como uma dica esmaecida. Erros aparecem na própria linha, em vermelho. O **total** na parte de baixo soma todos os resultados numéricos — use o menu dele para alternar para a **média** ou a **mediana** — e os resultados são formatados com separadores de milhar. Os resultados mostram até 3 casas decimais (**Configurações → Precisão decimal**); um valor com mais precisão termina com reticências, enquanto os cálculos mantêm a precisão total.

Os botões **−** / **+** no rodapé mudam o tamanho do texto do editor (50–200%, com **Redefinir tamanho** de volta a 100%). Na primeira visita, uma planilha de **Boas-vindas** demonstra o app; use os botões **Manter conteúdo** / **Limpar conteúdo** para dispensá-la ou esvaziá-la. Enquanto você digita, um pop-up sugere variáveis, **#tags** e nomes internos (ou pressione **Ctrl+Space**): **↑**/**↓** para escolher, **Enter**/**Tab** para inserir, **Esc** para dispensar.

```calc retorna 2
1 + 1
```

```calc retorna 7
2 * 3 + 1
```

```calc retorna 4
(4 / 2) ^ 2
```

```calc retorna 4
sqrt(16)
```

```calc retorna 1
10 % 3
```

```calc retorna 1,000,000
1000000
```

| Operador | Função |
| --- | --- |
| `+` | Somar |
| `-` | Subtrair |
| `*` | Multiplicar |
| `/` | Dividir |
| `^` | Potência |
| `%` | Resto |

Muitas outras funções e operadores estão disponíveis — veja a [documentação do mathjs](https://mathjs.org/docs/expressions/syntax.html#operators).

## Abas

Use as abas no topo para manter planilhas separadas. Cada aba é salva automaticamente enquanto você digita.

-   **Trocar** — clique em uma aba (ou use `←`/`→` com ela focada, ou `Ctrl+Tab`).
-   **Reordenar** — clique e arraste uma aba para uma nova posição.
-   **Renomear** — clique duas vezes no nome da aba.
-   **Fechar** — clique no `×` (você deverá confirmar).
-   **Adicionar** — clique na aba `+`.
-   **Exportar / Importar** — use os botões na janela de **Configurações** para baixar a planilha ativa como texto ou carregar uma de um arquivo.
-   **Compartilhar** — o botão **Compartilhar** copia um link que carrega a planilha ativa dentro dele. Quem abrir será perguntado se quer abrir a planilha em uma nova aba; ele nunca substitui o que a pessoa já tem. Nada é enviado: a planilha viaja no fragmento `#` do link, que os navegadores nunca enviam a um servidor.

## Comentários, rótulos & tags

Tudo depois de um `#` seguido de um espaço é ignorado (um comentário). Um `rótulo:` antes de uma expressão nomeia a linha sem ser calculado.

```calc retorna 4
2 + 2 # this is a note
```

```calc retorna 15
Price: 10 + 5
```

Sem espaço, `#palavra` é uma **tag**. Uma linha que contém apenas tags mostra a soma delas, e `sum`/`total`/`average`/`avg` (opcionalmente `of`) antes da tag também funcionam. As linhas marcadas acima são somadas, onde quer que estejam. Uma linha com várias tags é o valor total dividido igualmente entre elas, então cada tag recebe sua parte enquanto a linha e o total do grupo mantêm o preço cheio. Tags também podem ser usadas em cálculos: `#food * 2`, `#food + #other`. Pedir uma tag que não tem linhas marcadas mostra um erro.

```calc a última linha retorna 50
20 #food
30 #food
#food
```

```calc a última linha retorna 100
20 #food
30 #food
#food * 2
```

**Dica:** clique no número de uma linha na calha à esquerda para comentar ou descomentar essa linha — útil para desligar um cálculo sem apagá-lo. Uma linha que já começa com `##` apenas perde um `#`.

## Variáveis

Atribua um valor com `=` e reutilize-o em linhas seguintes. Use `prev` para o resultado mais recente acima — ele ignora comentários e linhas em branco. `sum`/`total`/`average`/`avg` agregam as linhas acima até uma linha em branco, que inicia um novo bloco.

```calc a última linha retorna 15
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people
```

```calc a última linha retorna 80
20
prev * 4
```

```calc a última linha retorna 11
10
# a comment in between
prev + 1
```

```calc a última linha retorna 30
10
20
sum
```

```calc a última linha retorna 6
4
8
average
```

Objetos agrupam valores nomeados; acesse um campo com um ponto.

```calc a última linha retorna 132
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax
```

Nomes de variáveis podem conter espaços.

```calc a última linha retorna 18,000
monthly rent = 1500
monthly rent * 12
```

Referencie o resultado de uma linha acima com `line(n)`. A referência mostra o valor na própria linha (o `line(n)` bruto permanece visível enquanto você edita essa linha) e apenas linhas acima podem ser referenciadas.

```calc a última linha retorna 10
5
line(1) * 2
```

## Grupos

Abra um grupo nomeado com um rótulo em sua própria linha (como `Groceries:`) e feche-o com `end`. O cabeçalho mostra o subtotal do grupo e o grupo inteiro é sombreado como uma caixa; as linhas internas ainda contam no total de baixo. Linhas em branco dentro do grupo são ignoradas, e `sum`/`average` dentro de um grupo somam esse grupo. Um cabeçalho sem `end` é apenas um rótulo, e um `end` sem cabeçalho é um erro.

```calc o cabeçalho mostra 10.1
Groceries:
4.50
3.20
2.40
end
```

```calc o cabeçalho mostra 1.1 m
Trip:
10 cm
1 m
end
```

## Funções

Armazene uma função com `f(x) = …` e chame-a depois. Aliases no estilo Numi também estão disponíveis: `ln`, `fact`, `arcsin`, `arccos`, `arctan`, `root`.

```calc a última linha retorna 42
double = f(x) = x * 2
double(21)
```

```calc retorna 120
fact(5)
```

```calc retorna 1
ln(e)
```

```calc retorna 2
root(8, 3)
```

## Listas

Escreva uma lista com colchetes. As listas são **indexadas a partir de 1**: `n[1]` é o primeiro elemento. Fatie com um intervalo, atribua elementos, faça aritmética elemento a elemento e combine listas com as funções do mathjs. As listas são limitadas a 100 itens.

```calc [1, 2, 3]
[1, 2, 3]
```

```calc 10 (primeiro elemento)
n = [10, 20, 30]
n[1]
```

```calc [20, 30, 40]
n = [10, 20, 30, 40]
n[2:4]
```

```calc define o segundo elemento
n = [10, 20, 30]
n[2] = 99
```

```calc [4, 6]
[1, 2] + [3, 4]
```

```calc a última linha retorna 1325
expenses = [1200, 80, 45]
sum(expenses)
```

```calc retorna 5.5
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

## Sequências & iteração

Um intervalo `start:end` (com um `:step` opcional) cria uma lista de números, e chamar uma função com um intervalo a aplica a cada elemento. Listas podem ser nomeadas e indexadas como qualquer outra variável. Os intervalos são limitados a 100 itens.

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

```calc retorna 5050
sum(1:100)
```

```calc retorna 3
mean(1:5)
```

## Porcentagens

Use `of`, `on` e `off` com `%` para cálculos de porcentagem.

```calc retorna 2
20% of 10
```

```calc retorna 31.5
5% on 30
```

```calc retorna 37.6
6% off 40
```

```calc retorna 50
50 as a % of 100
```

```calc retorna 120
5% of what is 6
```

## Arredondamento

Arredonde um resultado com uma frase no fim da linha, ou chame `round`, `ceil` ou `floor` diretamente. O arredondamento funciona com unidades e moedas também.

```calc retorna 0.33
1/3 to 2 dp
```

```calc retorna 3.14159
π to 5 digits
```

```calc retorna 6
5.5 rounded
```

```calc retorna 6
5.5 rounded up
```

```calc retorna 5
5.5 rounded down
```

```calc retorna 40
37 to nearest 10
```

```calc retorna US$ 500
$490 rounded to nearest hundred
```

```calc retorna 25
21 rounded up to nearest 5
```

```calc retorna 9/16
0.534 to nearest 16th
```

## Operadores & escalas

Operadores em palavras e escalas numéricas funcionam naturalmente: `plus`, `minus`, `times`, `multiplied by`, `divided by`, `with`, `without` e `mul`.

```calc retorna 72
8 times 9
```

```calc retorna 5
2 plus 3
```

```calc retorna 7
10 minus 3
```

```calc retorna 42
6 multiplied by 7
```

```calc retorna 5
10 divided by 2
```

```calc retorna 150 minutes
2 hours with 30 minutes
```

```calc retorna 90 minutes
2 hours without 30 minutes
```

```calc retorna 12
3 mul 4
```

```calc retorna 2,000
2k
```

```calc retorna 1,000,000
1kk
```

```calc retorna 1,000,000,000
1kkk
```

## Conversão de unidades

Converta unidades com `to`, `in` ou `as`. Unidades CSS também são suportadas: `px`, `em` e `point`. As unidades de volume de cozinha seguem o sistema de medidas em **Configurações → Sistema de medidas** — Métrico (padrão), Americano ou Imperial — que define `cup` (250 / 236.6 / 284.1 ml), `tsp`, `tbsp`, `fl oz`, `pint`, `quart` e `gallon`.

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

```calc retorna ≈ 37.8 px
1 cm in px
```

```calc retorna 32 px
2 em in px
```

| Base | Unidade |
| --- | --- |
| Comprimento | meter (m), inch (in), foot (ft), yard (yd), mile (mi), link (li), rod (rd), chain (ch), angstrom, mil |
| Área de superfície | m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare |
| Volume | m3, litre (l, L, lt, liter), cc, cuin, cuft, cuyd, teaspoon, tablespoon |
| Volume líquido | minim (min), fluiddram (fldr), fluidounce (floz), gill (gi), cup (cp), pint (pt), quart (qt), gallon (gal), beerbarrel (bbl), oilbarrel (obl), hogshead, drop (gtt) |
| Ângulos | rad (radian), deg (degree), grad (gradian), cycle, arcsec (arcsecond), arcmin (arcminute) |
| Tempo | second (s, secs, seconds), minute (mins, minutes), hour (h, hr, hrs, hours), day (days), week (weeks), month (months), year (years), decade (decades), century (centuries), millennium (millennia) |
| Frequência | hertz (Hz) |
| Massa | gram(g), tonne, ton, grain (gr), dram (dr), ounce (oz), poundmass (lbm, lb, lbs), hundredweight (cwt), stick, stone |
| Corrente elétrica | ampere (A) |
| Temperatura | kelvin (K), celsius (degC), fahrenheit (degF), rankine (degR) |
| Quantidade de matéria | mole (mol) |
| Intensidade luminosa | candela (cd) |
| Força | newton (N), dyne (dyn), poundforce (lbf), kip |
| Energia | joule (J), erg, Wh, BTU, electronvolt (eV) |
| Potência | watt (W), hp |
| Pressão | Pa, psi, atm, torr, bar, mmHg, mmH2O, cmH2O |
| Eletricidade e magnetismo | ampere (A), coulomb (C), watt (W), volt (V), ohm, farad (F), weber (Wb), tesla (T), henry (H), siemens (S), electronvolt (eV) |
| Binário | bits (b), bytes (B) |

Veja a [referência de unidades do mathjs](https://mathjs.org/docs/datatypes/units.html#reference) para a lista completa.

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

Uma taxa é uma unidade por outra. O mathjs faz a aritmética; estas frases facilitam escrever taxas.

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

## Conversão de moeda

Converta entre moedas usando códigos ISO de 3 letras ou símbolos. Os resultados são escritos com o símbolo da moeda quando ela tem um (`350usd` vira `US$ 350`); moedas sem símbolo mantêm o código. Dinheiro só forma razões (`USD/hour`, `USD/km`), então multiplicar uma moeda por outra unidade (`BRL hour`) é um erro — use uma taxa. As taxas vêm do Banco Central Europeu (via frankfurter.dev) e ficam em cache local para uso offline.

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

```calc US$ 100 per hour
100 USD/hour
```

**Códigos suportados:** `AUD`, `BRL`, `CAD`, `CHF`, `CNY`, `CZK`, `DKK`, `EUR`, `GBP`, `HKD`, `HUF`, `IDR`, `ILS`, `INR`, `ISK`, `JPY`, `KRW`, `MXN`, `MYR`, `NOK`, `NZD`, `PHP`, `PLN`, `RON`, `SEK`, `SGD`, `THB`, `TRY`, `USD`, `ZAR`.

## Datas

Converta timestamps unix com `fromunix`, obtenha a hora atual com `unix()` e use unidades de data diretamente.

```calc Jan 1, 1970…
fromunix(0)
```

```calc Nov 3, 2015…
fromunix(1446587186)
```

```calc timestamp atual
unix()
```

```calc 30.4375 days
1 month in days
```

## Calendário

Some ou subtraia tempo de uma data, meça o intervalo entre datas e formate uma data com um padrão. As datas podem ser escritas como `10 June`, `June 10, 2023`, `2019-04-01` ou `12/02/1988`. Uma data pode ser salva em uma variável e reutilizada (`start = March 4`, depois `start + 2 weeks`). Horários (`9:45 am`, `1:30`) somam durações e medem intervalos, mostrados em 24 horas por padrão (**Configurações → Relógio**). Dias úteis são de segunda a sexta (feriados ainda não são contados).

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

```calc daqui a três semanas
today + 3 weeks
```

```calc daqui a quatro dias
4 days from now
```

```calc um horário 3¼ horas depois
16:00 + 3 hours 12 minutes
```

```calc 13 hours 15 minutes
7:30am to 8:45pm
```

```calc um horário 3¼ horas a partir de agora
now + 3 hours 15 minutes
```

```calc 3 weeks 5 days
January 10 - February 5
```

```calc dias até 25 December
days until Christmas
```

```calc 15 workdays
workdays in 3 weeks
```

```calc 176 horas de trabalho (dias de 8h)
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

## Intervalos de tempo

Mostre uma duração como um timespan de componentes, ou divida-a em duas unidades. Um timespan é uma duração real, então pode ser somado e multiplicado, e convertido para uma única unidade com `to`/`in`/`as` (`as minutes`). Unidades de tempo podem ser escritas curtas (`3h 5m 10s`) ou longas.

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

```calc última linha: 1 hour 5 minutes 30 seconds
5.5 minutes as timespan
line(1) + 1h
```

## Atalhos & arquivos

A planilha ativa pode ser exportada e importada pela janela de **Configurações** ou pelos atalhos abaixo.

| Atalho | Ação |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Desfazer a última alteração na aba |
| `⇧⌘Z` `Ctrl+Shift+Z` | Refazer |
| `Ctrl+Tab` `Ctrl+⇧Tab` | Próxima / aba anterior |
| `⌘1…9` `Ctrl+1…9` | Ir para a enésima aba |
| `⌘F` `Ctrl+F` | Localizar e substituir na planilha ativa |
| `⌘G` `Ctrl+G` | Ir para um número de linha |
| `Tab` | Indentar a linha ou a seleção |
| `⇧Tab` | Desindentar a linha ou a seleção |
| `⇧⌘C` `Ctrl+Shift+C` | Copiar o resultado da linha atual |
| `⇧⌘S` `⇧⌘L` | Copiar um link de compartilhamento da planilha ativa |
| `⇧⌘E` `Ctrl+Shift+E` | Exportar a planilha ativa |
| `⇧⌘I` `Ctrl+Shift+I` | Importar uma planilha |
| `⇧⌘⌫` `Ctrl+Shift+Backspace` | Limpar a planilha ativa |

## Sobre

O Math Notes é uma calculadora em linha no navegador, inspirada no [Numi](https://numi.app) e no [Soulver](https://soulver.app). Seu código é aberto — veja o [repositório no GitHub](https://github.com/imaginamundo/math-notes).

Os cálculos rodam no [mathjs](https://mathjs.org), uma biblioteca de matemática extensível para JavaScript, e as taxas de câmbio vêm do [Banco Central Europeu](https://www.ecb.europa.eu) via [Frankfurter](https://frankfurter.dev).

Suas planilhas ficam no seu dispositivo: são salvas no armazenamento do navegador e nunca são enviadas a um servidor.
