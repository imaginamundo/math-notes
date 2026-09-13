# Groups & totals

Math Notes aggregates in three related ways: the running total in the bottom bar, the aggregate keywords (`sum`, `average`, …) you write on a line, and named groups that show a subtotal in place.

## The total bar

The total bar under the editor aggregates every numeric result in the sheet. Its dropdown switches between **total** (sum), **average** and **median**.

Plain numbers fold into a single unit; compatible units (such as `cm` and `m`) merge into the largest present; mixed currencies or dimensions fall back to the plain numeric sum.

## Aggregate keywords

`sum`, `total`, `average` and `avg` aggregate the lines above, up to a blank line. A blank line starts a new block, so you can keep several independent aggregates in one sheet.

```calc last line returns 30
10
20
sum
```

```calc last line returns 6
4
8
average
```

```calc last line returns 15
10
20
sum

1
2
sum
```

The keywords can also take a tag: `sum #food`, or the shorthand `#food` on its own line (see [Tags](/docs/writing-a-sheet/)).

## Groups

Open a named group with a label on its own line (like `Groceries:`) and close it with `end`. The header shows the group's subtotal and the whole block is shaded. The inner lines still count in the bottom total.

```calc header shows 10.1
Groceries:
  4.50
  3.20
  2.40
end
```

Groups work with units too, following the total's unit rule:

```calc header shows 1.1 m
Trip:
  10 cm
  1 m
end
```

Blank lines inside a group are ignored, and `sum`/`average` inside a group total that group rather than the whole sheet.

## Interaction with `prev` and tags

A closed group leaves `prev` at the subtotal shown on its header, then continues from the `end` line. Tags still work across groups: a tagged row contributes its share to the tag no matter which group it sits in.

## Mistakes

- A header with no `end` is just a label, and the lines after it are ordinary lines.
- An `end` with no open header is reported as an error.
- Groups do not nest: a second header inside an open group starts a new label.
