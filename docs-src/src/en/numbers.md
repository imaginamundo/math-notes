# Numbers & operators

Math Notes evaluates expressions with the usual arithmetic operators, plus a set of word operators, number scales and rounding phrases that read like English.

## Operators

| Operator | Meaning |
| --- | --- |
| `+` | Add |
| `-` | Subtract |
| `*` | Multiply |
| `/` | Divide |
| `^` | Power |
| `%` | Remainder |
| `!` | Factorial |
| `( )` | Group |

```calc returns 4
(4 / 2) ^ 2
```

```calc returns 1
10 % 3
```

Many more functions and operators are available — see the [mathjs documentation](https://mathjs.org/docs/expressions/syntax.html#operators). The [reference](/docs/reference/) lists the function aliases Math Notes adds.

## Word operators

Calculations can use words instead of symbols:

```calc returns 72
8 times 9
```

```calc returns 5
2 plus 3
```

```calc returns 7
10 minus 3
```

```calc returns 42
6 multiplied by 7
```

```calc returns 5
10 divided by 2
```

```calc returns 12
3 mul 4
```

`with` and `without` combine and subtract durations:

```calc returns 150 minutes
2 hours with 30 minutes
```

```calc returns 90 minutes
2 hours without 30 minutes
```

## Number scales

A repeated `k` multiplies by a thousand: `2k` is 2,000, `1kk` is 1,000,000, `1kkk` is 1,000,000,000.

```calc returns 2,000
2k
```

```calc returns 1,000,000
1kk
```

```calc returns 1,000,000,000
1kkk
```

## Percentages

Use `of`, `on` and `off` with `%`.

```calc returns 2
20% of 10
```

```calc returns 31.5
5% on 30
```

```calc returns 37.6
6% off 40
```

```calc returns 50
50 as a % of 100
```

```calc returns 120
5% of what is 6
```

## Rounding

Round a result with a phrase at the end of the line, or call `round`, `ceil` or `floor` directly. Rounding works with units and currencies too.

```calc returns 0.33
1/3 to 2 dp
```

```calc returns 3.14159
π to 5 digits
```

```calc returns 6
5.5 rounded
```

```calc returns 6
5.5 rounded up
```

```calc returns 5
5.5 rounded down
```

```calc returns 40
37 to nearest 10
```

```calc returns US$ 500
$490 rounded to nearest hundred
```

```calc returns 25
21 rounded up to nearest 5
```

```calc returns 9/16
0.534 to nearest 16th
```

## Constants and functions

`pi` and `π` are available, along with the standard mathjs functions and these aliases:

| Alias | Meaning |
| --- | --- |
| `ln` | Natural logarithm |
| `fact` | Factorial |
| `arcsin`, `arccos`, `arctan` | Inverse trigonometric functions |
| `root(n, x)` | The `x`-th root of `n` |

```calc returns 120
fact(5)
```

```calc returns 1
ln(e)
```

```calc returns 2
root(8, 3)
```

See [Lists & sequences](/docs/lists/) for `sum`, `mean` and the other aggregate functions, and [Reference](/docs/reference/) for the full table.
