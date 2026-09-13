# Escribir una hoja

Una hoja es una lista de líneas evaluadas de arriba abajo. Cada línea puede definir un valor, referenciar algo de arriba, o simplemente producir un resultado. Las variables viven en un único ámbito por hoja y están disponibles para toda línea por debajo de su definición.

## Comentarios y etiquetas

Todo lo que sigue a un `#` y un espacio es un comentario y se ignora.

```calc devuelve 4
2 + 2 # this is a note
```

Una `etiqueta:` antes de una expresión da nombre a la línea sin evaluarse. Esto ayuda a recordar qué significa una línea.

```calc devuelve 15
Price: 10 + 5
```

Un único `#` al principio de la línea también funciona como comentario.

## Tags

Sin espacio después del `#`, una palabra es una **tag**, no un comentario. Las tags marcan líneas para que puedas sumarlas en otro lugar.

```calc la última línea devuelve 50
20 #food
30 #food
#food
```

Una línea que solo tiene tags muestra su total, y `sum`/`total`/`average`/`avg` (opcionalmente `of`) hace lo mismo. Las líneas marcadas se suman donde estén, arriba o abajo del pedido.

```calc la última línea devuelve 100
20 #food
30 #food
#food * 2
```

Las tags también se pueden usar directamente en cálculos: `#food * 2`, `#food + #other`. Pedir una tag que no tiene líneas marcadas es un error.

Una fila con varias tags es el **importe total dividido a partes iguales** entre ellas. Así, `burger: 2 * 50 #ana #bob` da 50 a cada tag mientras la fila conserva los 100 completos.

```calc cada tag recibe 50
burger: 2 * 50 #ana #bob
#ana
#bob
```

## Variables

Asigna un valor con `=` y reutilízalo en líneas posteriores.

```calc la última línea devuelve 15
pizzas = 2
pizzaPrice = 30
people = 4
(pizzas * pizzaPrice) / people
```

Los nombres de variables pueden contener espacios. Un nombre de varias palabras debe ser coherente: `monthly rent` es un solo nombre, no `monthly` y `rent`.

```calc la última línea devuelve 18,000
monthly rent = 1500
monthly rent * 12
```

Puedes guardar una función con `f(x) = …` y llamarla después.

```calc la última línea devuelve 42
double = f(x) = x * 2
double(21)
```

## Objetos

Un objeto agrupa valores con nombre, y un punto accede a un campo.

```calc la última línea devuelve 132
invoice = {subtotal: 120, tax: 12}
invoice.subtotal + invoice.tax
```

## Referencias

`line(n)` usa el resultado de la línea `n`. Solo se pueden referenciar líneas anteriores, y el valor aparece en lugar del token cuando el cursor está en otra línea (el `line(3)` sin procesar reaparece mientras editas esa línea).

```calc la última línea devuelve 10
5
line(1) * 2
```

`prev` se refiere al resultado más reciente por encima. Omite comentarios y líneas en blanco.

```calc la última línea devuelve 80
20
prev * 4
```

```calc la última línea devuelve 11
10
# a comment in between
prev + 1
```

## Palabras reservadas

Algunos nombres no se pueden usar como variables:

- `prev` (el resultado anterior)
- las palabras de fecha incondicionales `today`, `now`, `yesterday`, `tomorrow`, `christmas`, `halloween`
- cualquier nombre que empiece por `__` (los ayudantes internos del editor)
- `end` cierra un grupo

Por lo demás, las variables comparten un ámbito con los nombres integrados, así que una variable puede tapar una unidad o función: tras `m = 5`, `2 m` es `2 × m`, no dos metros. Las palabras clave de agregación `sum`, `total`, `average` y `avg` funcionan igual: tras `total = 5`, una línea `total` posterior lee la variable en vez de agregar.

## Líneas en blanco

Una línea en blanco cierra el bloque que examinan `sum`, `average` y las demás agregaciones, y separa secciones de la hoja. Úsala para ceñir las agregaciones a las líneas que quieres.
