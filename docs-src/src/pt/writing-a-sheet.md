# Escrevendo uma planilha

Uma planilha é uma lista de linhas avaliadas de cima para baixo. Cada linha pode definir um valor, referenciar algo acima dela, ou simplesmente produzir um resultado. As variáveis vivem em um único escopo por planilha e ficam disponíveis para toda linha abaixo da definição.

## Comentários e rótulos

Tudo depois de um `#` seguido de um espaço é um comentário e é ignorado.

```calc retorna 4
2 + 2 # this is a note
```

Um `rótulo:` antes de uma expressão nomeia a linha sem ser avaliado. Isso ajuda a lembrar o que uma linha significa.

```calc retorna 15
Price: 10 + 5
```

Um único `#` no início da linha também funciona como comentário.

## Tags

Sem espaço depois do `#`, uma palavra é uma **tag**, não um comentário. As tags marcam linhas para que você possa somá-las em outro lugar.

```calc a última linha retorna 50
20 #food
30 #food
#food
```

Uma linha que contém apenas tags mostra a soma delas, e `sum`/`total`/`average`/`avg` (opcionalmente `of`) faz o mesmo. As linhas marcadas são somadas onde estiverem, acima ou abaixo do pedido.

```calc a última linha retorna 100
20 #food
30 #food
#food * 2
```

Tags também podem ser usadas diretamente em cálculos: `#food * 2`, `#food + #other`. Pedir uma tag que não tem linhas marcadas é um erro.

Uma linha com várias tags é o **valor total dividido igualmente** entre elas. Então `burger: 2 * 50 #ana #bob` dá 50 para cada tag, enquanto a linha mantém os 100 completos.

```calc cada tag recebe 50
burger: 2 * 50 #ana #bob
#ana
#bob
```

## Variáveis

Atribua um valor com `=` e reutilize-o em linhas seguintes.

```calc a última linha retorna 15
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people
```

Nomes de variáveis podem conter espaços. Um nome de várias palavras deve ser consistente: `monthly rent` é um nome só, não `monthly` e `rent`.

```calc a última linha retorna 18,000
monthly rent = 1500
monthly rent * 12
```

Você pode guardar uma função com `f(x) = …` e chamá-la depois.

```calc a última linha retorna 42
double = f(x) = x * 2
double(21)
```

## Objetos

Um objeto agrupa valores nomeados, e um ponto acessa um campo.

```calc a última linha retorna 132
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax
```

## Referências

`line(n)` usa o resultado da linha `n`. Apenas linhas acima podem ser referenciadas, e o valor aparece no lugar do token quando o cursor está em outra linha (o `line(3)` bruto reaparece enquanto você edita aquela linha).

```calc a última linha retorna 10
5
line(1) * 2
```

`prev` se refere ao resultado mais recente acima dele. Ele ignora comentários e linhas em branco.

```calc a última linha retorna 80
20
prev * 4
```

```calc a última linha retorna 11
10
# a comment in between
prev + 1
```

## Palavras reservadas

Alguns nomes não podem ser usados como variáveis:

- `prev` (o resultado anterior)
- `total` (a agregação do total geral)
- `unit` — abre a definição de uma unidade personalizada (`unit widget = 3.5 kg`)
- as palavras de data incondicionais `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`
- qualquer nome que comece com `__` (os auxiliares internos do editor)
- `end` fecha um grupo

Fora isso, as variáveis compartilham um escopo com os nomes internos, então uma variável pode sombrear uma unidade ou função: depois de `m = 5`, `2 m` é `2 × m`, não dois metros. As restantes palavras-chave de agregação `sum`, `average` e `avg` ainda podem ser sombreadas: depois de `avg = 5`, uma linha `avg` posterior lê a variável em vez de agregar.

## Linhas em branco

Uma linha em branco encerra o bloco que `sum`, `average` e as outras agregações examinam, e separa seções da planilha. Use-a para manter as agregações restritas às linhas que você quer.
