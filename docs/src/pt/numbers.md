# Números & operadores

O Math Notes avalia expressões com os operadores aritméticos usuais, além de operadores em palavras, escalas numéricas e frases de arredondamento que leem como inglês.

## Operadores

| Operador | Significado |
| --- | --- |
| `+` | Somar |
| `-` | Subtrair |
| `*` | Multiplicar |
| `/` | Dividir |
| `^` | Potência |
| `%` | Resto |
| `!` | Fatorial |
| `( )` | Agrupar |

```calc retorna 4
(4 / 2) ^ 2
```

```calc retorna 1
10 % 3
```

Muitas outras funções e operadores estão disponíveis — veja a [documentação do mathjs](https://mathjs.org/docs/expressions/syntax.html#operators). A [referência](/docs/reference/) lista os aliases de função que o Math Notes adiciona.

## Operadores em palavras

Os cálculos podem usar palavras em vez de símbolos:

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

```calc retorna 12
3 mul 4
```

`with` e `without` combinam e subtraem durações:

```calc retorna 150 minutes
2 hours with 30 minutes
```

```calc retorna 90 minutes
2 hours without 30 minutes
```

## Escalas numéricas

Um `k` repetido multiplica por mil: `2k` é 2.000, `1kk` é 1.000.000, `1kkk` é 1.000.000.000.

```calc retorna 2,000
2k
```

```calc retorna 1,000,000
1kk
```

```calc retorna 1,000,000,000
1kkk
```

## Porcentagens

Use `of`, `on` e `off` com `%`.

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

## Constantes e funções

`pi` e `π` estão disponíveis, junto com as funções padrão do mathjs e estes aliases:

| Alias | Significado |
| --- | --- |
| `ln` | Logaritmo natural |
| `fact` | Fatorial |
| `arcsin`, `arccos`, `arctan` | Funções trigonométricas inversas |
| `root(n, x)` | A raiz `x`-ésima de `n` |

```calc retorna 120
fact(5)
```

```calc retorna 1
ln(e)
```

```calc retorna 2
root(8, 3)
```

Veja [Listas & sequências](/docs/lists/) para `sum`, `mean` e as outras funções de agregação, e a [Referência](/docs/reference/) para a tabela completa.
