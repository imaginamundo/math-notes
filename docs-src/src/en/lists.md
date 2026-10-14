# Lists & sequences

Lists hold several values. Write one with square brackets, index it, slice it, and use mathjs functions to aggregate or transform it. Lists and ranges are capped at **100 items** so a runaway sequence cannot freeze the editor. The cap covers everything that builds a list or matrix (`ones`, `zeros`, `identity`, `random`, `concat`, `kron`, …) and assigning past the end of a list (`n[500] = 1`).

## Lists

Lists are **1-indexed**: `n[1]` is the first element.

```calc [1, 2, 3]
[1, 2, 3]
```

```calc 10
n = [10, 20, 30]
n[1]
```

Slice with a range:

```calc [20, 30, 40]
n = [10, 20, 30, 40]
n[2:4]
```

Assign an element:

```calc sets the second element
n = [10, 20, 30]
n[2] = 99
```

`+` and `-` work element by element, and lists combine with the mathjs functions. The plain `*`, `/` and `^` follow matrix rules, so use `.*`, `./` and `.^` to multiply, divide or raise element by element:

```calc [4, 6]
[1, 2] + [3, 4]
```

```calc [3, 8]
[1, 2] .* [3, 4]
```

```calc [1, 2, 3]
sort([3, 1, 2])
```

```calc [1, 2, 3, 4]
concat([1, 2], [3, 4])
```

Matrices are lists of lists, indexed with two subscripts:

```calc 3
m = [[1, 2], [3, 4]]
m[2, 1]
```

## Sequences

A range `start:end` makes a list of numbers, with an optional `:step`.

```calc [1, 2, 3, 4, 5]
1:5
```

```calc [1, 3, 5, 7, 9]
1:2:10
```

A range can be named and indexed like any other list:

```calc 3
n = 1:5
n[3]
```

## Iteration

A function receives the whole list or range it is called with. A body such as `x * 2` or `x + 1` happens to work on every element, but `x * x` is a dot product (so `sq(1:3)` is 14). To apply a function to each element, use `map`.

```calc [2, 4, 6, 8, 10]
double = f(x) = x * 2
double(1:5)
```

```calc [1, 4, 9]
sq = f(x) = x * x
map(1:3, sq)
```

## Aggregates

`sum`, `mean`, `min`, `max` and the rest of the mathjs aggregate functions accept a list or a range.

```calc returns 1,325
expenses = [1200, 80, 45]
sum(expenses)
```

```calc returns 5,050
sum(1:100)
```

```calc returns 3
mean(1:5)
```

`sum`, `total`, `average` and `avg` also work as bare keywords on the lines above — see [Groups & totals](/docs/groups/).
