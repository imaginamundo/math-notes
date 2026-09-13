# Números & operadores

Math Notes evalúa expresiones con los operadores aritméticos habituales, además de operadores en palabras, escalas numéricas y frases de redondeo que se leen como inglés.

## Operadores

| Operador | Significado |
| --- | --- |
| `+` | Sumar |
| `-` | Restar |
| `*` | Multiplicar |
| `/` | Dividir |
| `^` | Potencia |
| `%` | Resto |
| `!` | Factorial |
| `( )` | Agrupar |

```calc devuelve 4
(4 / 2) ^ 2
```

```calc devuelve 1
10 % 3
```

Hay muchas más funciones y operadores disponibles — consulta la [documentación de mathjs](https://mathjs.org/docs/expressions/syntax.html#operators). La [referencia](/docs/reference/) lista los alias de función que añade Math Notes.

## Operadores en palabras

Los cálculos pueden usar palabras en vez de símbolos:

```calc devuelve 72
8 times 9
```

```calc devuelve 5
2 plus 3
```

```calc devuelve 7
10 minus 3
```

```calc devuelve 42
6 multiplied by 7
```

```calc devuelve 5
10 divided by 2
```

```calc devuelve 12
3 mul 4
```

`with` y `without` combinan y restan duraciones:

```calc devuelve 150 minutes
2 hours with 30 minutes
```

```calc devuelve 90 minutes
2 hours without 30 minutes
```

## Escalas numéricas

Una `k` repetida multiplica por mil: `2k` es 2.000, `1kk` es 1.000.000, `1kkk` es 1.000.000.000.

```calc devuelve 2,000
2k
```

```calc devuelve 1,000,000
1kk
```

```calc devuelve 1,000,000,000
1kkk
```

## Porcentajes

Usa `of`, `on` y `off` con `%`.

```calc devuelve 2
20% of 10
```

```calc devuelve 31.5
5% on 30
```

```calc devuelve 37.6
6% off 40
```

```calc devuelve 50
50 as a % of 100
```

```calc devuelve 120
5% of what is 6
```

## Redondeo

Redondea un resultado con una frase al final de la línea, o llama directamente a `round`, `ceil` o `floor`. El redondeo también funciona con unidades y monedas.

```calc devuelve 0.33
1/3 to 2 dp
```

```calc devuelve 3.14159
π to 5 digits
```

```calc devuelve 6
5.5 rounded
```

```calc devuelve 6
5.5 rounded up
```

```calc devuelve 5
5.5 rounded down
```

```calc devuelve 40
37 to nearest 10
```

```calc devuelve US$ 500
$490 rounded to nearest hundred
```

```calc devuelve 25
21 rounded up to nearest 5
```

```calc devuelve 9/16
0.534 to nearest 16th
```

## Constantes y funciones

`pi` y `π` están disponibles, junto con las funciones estándar de mathjs y estos alias:

| Alias | Significado |
| --- | --- |
| `ln` | Logaritmo natural |
| `fact` | Factorial |
| `arcsin`, `arccos`, `arctan` | Funciones trigonométricas inversas |
| `root(n, x)` | La raíz `x`-ésima de `n` |

```calc devuelve 120
fact(5)
```

```calc devuelve 1
ln(e)
```

```calc devuelve 2
root(8, 3)
```

Consulta [Listas & secuencias](/docs/lists/) para `sum`, `mean` y las demás funciones de agregación, y la [Referencia](/docs/reference/) para la tabla completa.
