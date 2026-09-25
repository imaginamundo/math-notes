# Writing a sheet

A sheet is a list of lines evaluated from top to bottom. Each line can define a value, reference something above it, or simply produce a result. Variables live in one scope per sheet and are available to every line below their definition.

## Comments and labels

Everything after a `#` followed by a space is a comment and is ignored.

```calc returns 4
2 + 2 # this is a note
```

A `label:` before an expression names the line without being evaluated. This is handy for reminding yourself what a line means.

```calc returns 15
Price: 10 + 5
```

A single `#` at the very start of a line also works as a comment.

## Tags

With no space after the `#`, a word is a **tag** rather than a comment. Tags label lines so you can total them elsewhere.

```calc last line returns 50
20 #food
30 #food
#food
```

A line that is only tags shows their total, and `sum`/`total`/`average`/`avg` (optionally followed by `of`) does the same. Tagged lines are summed wherever they appear, above or below the request.

```calc last line returns 100
20 #food
30 #food
#food * 2
```

Tags can be used directly in calculations: `#food * 2`, `#food + #other`. Requesting a tag with no tagged lines is reported as an error.

A row with several tags is the **full amount split equally** between them. So `burger: 2 * 50 #ana #bob` gives each tag 50 while the row keeps its full 100.

```calc each tag gets 50
burger: 2 * 50 #ana #bob
#ana
#bob
```

## Variables

Assign a value with `=` and reuse it on later lines.

```calc last line returns 15
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people
```

Variable names can contain spaces. A multi-word name must be consistent: `monthly rent` is one name, not `monthly` and `rent`.

```calc last line returns 18,000
monthly rent = 1500
monthly rent * 12
```

You can store a function with `f(x) = …` and call it later.

```calc last line returns 42
double = f(x) = x * 2
double(21)
```

## Objects

An object groups named values, and a dot reaches a field.

```calc last line returns 132
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax
```

## References

`line(n)` uses the result of line `n`. Only lines above can be referenced, and the value shows in place of the token while the caret is elsewhere (the raw `line(3)` reappears while you edit that line).

```calc last line returns 10
5
line(1) * 2
```

`prev` refers to the most recent result above it. It skips comments and blank lines.

```calc last line returns 80
20
prev * 4
```

```calc last line returns 11
10
# a comment in between
prev + 1
```

## Reserved words

A few names cannot be used as variables:

- `prev` (the previous result)
- `total` (the running-total aggregate)
- `unit` — opens a user-defined unit (`unit widget = 3.5 kg`)
- the unconditional date words `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`
- any name starting with `__` (the editor's internal helpers)
- `end` closes a group

Variables otherwise share one scope with the built-in names, so a variable can shadow a unit or function: after `m = 5`, `2 m` is `2 × m`, not two metres. The other aggregate keywords `sum`, `average` and `avg` can still be shadowed: after `avg = 5`, a later `avg` line reads the variable instead of aggregating.

## Blank lines

A blank line ends the block that `sum`, `average` and the other aggregates look at, and it separates sections of a sheet. Use it to keep aggregates scoped to the lines you mean.
