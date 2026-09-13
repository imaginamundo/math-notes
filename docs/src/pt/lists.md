# Listas & sequências

Listas guardam vários valores. Escreva uma com colchetes, indexe, fatie e use as funções do mathjs para agregar ou transformar. Listas e intervalos são limitados a **100 itens** para que uma sequência descontrolada não trave o editor.

## Listas

As listas são **indexadas a partir de 1**: `n[1]` é o primeiro elemento.

```calc [1, 2, 3]
[1, 2, 3]
```

```calc 10
n = [10, 20, 30]
n[1]
```

Fatie com um intervalo:

```calc [20, 30, 40]
n = [10, 20, 30, 40]
n[2:4]
```

Atribua um elemento:

```calc define o segundo elemento
n = [10, 20, 30]
n[2] = 99
```

A aritmética é elemento a elemento, e as listas se combinam com as funções do mathjs:

```calc [4, 6]
[1, 2] + [3, 4]
```

```calc [1, 2, 3]
sort([3, 1, 2])
```

```calc [1, 2, 3, 4]
concat([1, 2], [3, 4])
```

Matrizes são listas de listas, indexadas com dois subscritos:

```calc 3
m = [[1, 2], [3, 4]]
m[2, 1]
```

## Sequências

Um intervalo `start:end` cria uma lista de números, com um `:step` opcional.

```calc [1, 2, 3, 4, 5]
1:5
```

```calc [1, 3, 5, 7, 9]
1:2:10
```

Um intervalo pode ser nomeado e indexado como qualquer outra lista:

```calc 3
n = 1:5
n[3]
```

## Iteração

Chamar uma função com um intervalo a aplica a cada elemento.

```calc [2, 4, 6, 8, 10]
double = f(x) = x * 2
double(1:5)
```

## Agregações

`sum`, `mean`, `min`, `max` e o resto das funções de agregação do mathjs aceitam uma lista ou um intervalo.

```calc a última linha retorna 1325
expenses = [1200, 80, 45]
sum(expenses)
```

```calc retorna 5050
sum(1:100)
```

```calc retorna 3
mean(1:5)
```

`sum`, `total`, `average` e `avg` também funcionam como palavras-chave isoladas nas linhas acima — veja [Grupos & totais](/docs/groups/).
