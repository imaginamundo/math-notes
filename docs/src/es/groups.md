# Grupos & totales

Math Notes agrega de tres formas relacionadas: el total acumulado de la barra inferior, las palabras clave de agregación (`sum`, `average`, …) que escribes en una línea, y los grupos con nombre que muestran un subtotal en su sitio.

## La barra de total

La barra de total debajo del editor agrega todos los resultados numéricos de la hoja. Su menú alterna entre **total** (suma), **media** y **mediana**.

Los números simples se reúnen en una sola unidad; las unidades compatibles (como `cm` y `m`) se funden en la mayor presente; las monedas o dimensiones mixtas caen en la suma numérica simple.

## Palabras clave de agregación

`sum`, `total`, `average` y `avg` agregan las líneas de arriba, hasta una línea en blanco. Una línea en blanco inicia un bloque nuevo, así que puedes mantener varias agregaciones independientes en una hoja.

```calc la última línea devuelve 30
10
20
sum
```

```calc la última línea devuelve 6
4
8
average
```

```calc la última línea devuelve 15
10
20
sum

1
2
sum
```

Las palabras clave también aceptan una tag: `sum #food`, o el atajo `#food` solo en la línea (consulta [Tags](/docs/writing-a-sheet/)).

## Grupos

Abre un grupo con nombre con una etiqueta en su propia línea (como `Groceries:`) y ciérralo con `end`. La cabecera muestra el subtotal del grupo y todo el bloque se sombrea. Las líneas interiores siguen contando en el total de abajo.

```calc la cabecera muestra 10.1
Groceries:
  4.50
  3.20
  2.40
end
```

Los grupos funcionan con unidades también, siguiendo la regla de unidad del total:

```calc la cabecera muestra 1.1 m
Trip:
  10 cm
  1 m
end
```

Las líneas en blanco dentro del grupo se ignoran, y `sum`/`average` dentro de un grupo totalizan ese grupo, no la hoja entera.

## Interacción con `prev` y tags

Un grupo cerrado deja `prev` en el subtotal mostrado en la cabecera, y después continúa desde la línea `end`. Las tags siguen funcionando entre grupos: una fila marcada aporta su parte a la tag, esté en el grupo que esté.

## Errores comunes

- Una cabecera sin `end` es solo una etiqueta, y las líneas siguientes son líneas normales.
- Un `end` sin cabecera abierta se informa como error.
- Los grupos no se anidan: una segunda cabecera dentro de un grupo abierto inicia una nueva etiqueta.
