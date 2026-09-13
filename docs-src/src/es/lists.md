# Listas & secuencias

Las listas guardan varios valores. Escribe una con corchetes, indexa, corta y usa las funciones de mathjs para agregar o transformar. Las listas y los rangos están limitados a **100 elementos** para que una secuencia descontrolada no bloquee el editor.

## Listas

Las listas están **indexadas desde 1**: `n[1]` es el primer elemento.

```calc [1, 2, 3]
[1, 2, 3]
```

```calc 10
n = [10, 20, 30]
n[1]
```

Corta con un rango:

```calc [20, 30, 40]
n = [10, 20, 30, 40]
n[2:4]
```

Asigna un elemento:

```calc define el segundo elemento
n = [10, 20, 30]
n[2] = 99
```

La aritmética es elemento a elemento, y las listas se combinan con las funciones de mathjs:

```calc [4, 6]
[1, 2] + [3, 4]
```

```calc [1, 2, 3]
sort([3, 1, 2])
```

```calc [1, 2, 3, 4]
concat([1, 2], [3, 4])
```

Las matrices son listas de listas, indexadas con dos subíndices:

```calc 3
m = [[1, 2], [3, 4]]
m[2, 1]
```

## Secuencias

Un rango `start:end` crea una lista de números, con un `:step` opcional.

```calc [1, 2, 3, 4, 5]
1:5
```

```calc [1, 3, 5, 7, 9]
1:2:10
```

Un rango se puede nombrar e indexar como cualquier otra lista:

```calc 3
n = 1:5
n[3]
```

## Iteración

Llamar a una función con un rango la aplica a cada elemento.

```calc [2, 4, 6, 8, 10]
double = f(x) = x * 2
double(1:5)
```

## Agregaciones

`sum`, `mean`, `min`, `max` y el resto de las funciones de agregación de mathjs aceptan una lista o un rango.

```calc la última línea devuelve 1325
expenses = [1200, 80, 45]
sum(expenses)
```

```calc devuelve 5050
sum(1:100)
```

```calc devuelve 3
mean(1:5)
```

`sum`, `total`, `average` y `avg` también funcionan como palabras clave sueltas en las líneas de arriba — consulta [Grupos & totales](/docs/groups/).
