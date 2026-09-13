# Grupos & totais

O Math Notes agrega de três formas relacionadas: o total acumulado na barra de baixo, as palavras-chave de agregação (`sum`, `average`, …) que você escreve em uma linha, e os grupos nomeados que mostram um subtotal no lugar.

## A barra de total

A barra de total embaixo do editor agrega todos os resultados numéricos da planilha. O menu dela alterna entre **total** (soma), **média** e **mediana**.

Números simples se reúnem em uma única unidade; unidades compatíveis (como `cm` e `m`) se fundem na maior presente; moedas ou dimensões mistas caem na soma numérica simples.

## Palavras-chave de agregação

`sum`, `total`, `average` e `avg` agregam as linhas acima, até uma linha em branco. Uma linha em branco inicia um novo bloco, então você pode manter várias agregações independentes em uma planilha.

```calc a última linha retorna 30
10
20
sum
```

```calc a última linha retorna 6
4
8
average
```

```calc a última linha retorna 3
10
20
sum

1
2
sum
```

As palavras-chave também aceitam uma tag: `sum #food`, ou o atalho `#food` sozinho na linha (veja [Tags](/docs/writing-a-sheet/)).

## Grupos

Abra um grupo nomeado com um rótulo em sua própria linha (como `Groceries:`) e feche-o com `end`. O cabeçalho mostra o subtotal do grupo e o bloco inteiro é sombreado. As linhas internas ainda contam no total de baixo.

```calc o cabeçalho mostra 10.1
Groceries:
  4.50
  3.20
  2.40
end
```

Grupos funcionam com unidades também, seguindo a regra de unidade do total:

```calc o cabeçalho mostra 1.1 m
Trip:
  10 cm
  1 m
end
```

Linhas em branco dentro do grupo são ignoradas, e `sum`/`average` dentro de um grupo somam esse grupo, não a planilha toda.

## Interação com `prev` e tags

Um grupo fechado deixa `prev` no subtotal mostrado no cabeçalho, e depois continua a partir da linha `end`. As tags continuam funcionando entre grupos: uma linha marcada contribui com sua parte para a tag, não importa em qual grupo esteja.

## Erros comuns

- Um cabeçalho sem `end` é apenas um rótulo, e as linhas depois dele são linhas comuns.
- Um `end` sem cabeçalho aberto é reportado como erro.
- Grupos não se aninham: um segundo cabeçalho dentro de um grupo aberto inicia um novo rótulo.
