# Primeiros passos

O Math Notes é uma planilha de linhas. Você escreve um cálculo por linha e a resposta aparece à direita, como uma dica esmaecida. Não há botão **=** nem grade de células: a planilha recalcula enquanto você digita.

```calc retorna 2
1 + 1
```

```calc retorna 7
2 * 3 + 1
```

Uma linha pode ser um número simples, uma expressão, uma atribuição, um comentário, ou um rótulo seguido de uma expressão. O resultado da última linha também aparece na barra de total, na parte de baixo.

## A tela

- O **editor** é a área de texto grande. Sua camada fantasma mostra resultados, tags e erros no lugar.
- A **barra de total** fica embaixo do editor e agrega a planilha. Use o menu dela para alternar entre **total**, **média** e **mediana**.
- O **rodapé** tem os controles de tamanho do texto e os botões **Compartilhar**, **Configurações**, **Exemplos** e **Ajuda**.
- A **barra de abas**, no topo, guarda planilhas separadas (veja [Arquivos, compartilhamento & dados](/docs/files/)).

## Resultados

Os resultados são formatados com separadores de milhar e escritos com a unidade ou moeda que carregam.

```calc 1,000,000
1000000
```

```calc 0.01 m
1cm to m
```

Por padrão, um resultado mostra até **3 casas decimais**. Um valor com mais precisão termina com reticências, enquanto o cálculo em si mantém a precisão total. Mude isso em **Configurações → Precisão decimal** (veja [Configurações & aparência](/docs/settings/)).

Quando uma linha não pode ser calculada, o erro aparece na própria linha, em vermelho. Erros nunca impedem que o resto da planilha seja calculado.

## Edição

- **Indentação** — `Tab` indenta a linha atual ou uma seleção de várias linhas, `Shift+Tab` desindenta. A indentação é de dois espaços e não muda como a linha é calculada.
- **Comentar uma linha** — clique no número da linha na calha à esquerda para comentá-la ou descomentá-la. Uma linha que já começa com `##` apenas perde um `#`.
- **Números de linha** — a calha à esquerda numera a planilha e destaca a linha em que o cursor está.
- **Desfazer / refazer** — `⌘Z` / `Ctrl+Z` e `⇧⌘Z` / `Ctrl+Shift+Z`, com um histórico separado para cada aba.
- **Ir para uma linha** — `⌘G` / `Ctrl+G` e digite um número de linha.
- **Localizar e substituir** — `⌘F` / `Ctrl+F` busca na planilha ativa com destaque ao vivo, e substitui uma ou todas as ocorrências.
- **Tamanho do texto** — **−** / **+** no rodapé mudam o editor entre 50% e 200% do tamanho padrão do navegador; **Redefinir tamanho** volta a 100%.

## Autocompletar

Enquanto você digita, um pop-up sugere as variáveis da planilha e as `#tags`, além das funções, palavras-chave, constantes e unidades internas. Pressione `Ctrl+Space` para abri-lo quando quiser. **↑**/**↓** escolhem, **Enter**/**Tab** inserem, **Esc** fecha.

## Primeira visita

A primeira visita abre com uma planilha de **Boas-vindas** em vez de uma página vazia — variáveis, rótulos, `sum`, tags, durações com unidades, porcentagens e datas. Use os botões **Manter conteúdo** / **Limpar conteúdo** para dispensá-la ou esvaziar a planilha.

## Sem conexão

O Math Notes é um PWA instalável. Depois da primeira visita, um service worker mantém o app disponível offline; as taxas de câmbio ficam em cache, então as conversões continuam funcionando. Veja [App & plataforma](/docs/app/).
