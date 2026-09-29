# App & plataforma

O Math Notes é um progressive web app: instala como um app nativo, funciona offline e respeita as preferências do seu sistema.

## Instalar

Abra o app em um navegador moderno e use a ação **Instalar** ou **Adicionar à tela de início** do navegador. Depois de instalado, ele abre em sua própria janela, sem barra de endereço nem interface do navegador.

## Sem conexão

Um service worker mantém o app disponível offline. Depois da primeira visita, a estrutura e o código do app são servidos do cache; uma nova versão é instalada em segundo plano e assume em uma visita posterior, quando todas as abas estiverem fechadas, então uma página aberta nunca mistura versões.

As taxas de câmbio também ficam em cache, então as conversões continuam funcionando offline com as taxas mais recentes que o app viu.

## Atalhos de teclado

Toda ação tem um atalho; a lista completa está na [Referência](/docs/reference/). Os mais comuns:

| Atalho | Ação |
| --- | --- |
| `⌘Z` `Ctrl+Z` | Desfazer |
| `⇧⌘Z` `Ctrl+Shift+Z` | Refazer |
| `⌘F` `Ctrl+F` | Localizar e substituir |
| `⌘G` `Ctrl+G` | Ir para uma linha |
| `Ctrl+Space` | Autocompletar |
| `Tab` `Shift+Tab` | Indentar / desindentar |
| `⇧⌘C` `Ctrl+Shift+C` | Copiar o resultado da linha atual |
| `⇧⌘S` `Ctrl+Shift+S` | Copiar um link de compartilhamento |

## Acessibilidade

- O controle de tamanho do texto parte do tamanho padrão do navegador, então honra sua preferência de sistema.
- O editor tem um rótulo acessível, a barra de status anuncia o estado com `aria-live`, e o resultado da linha ativa é anunciado por uma região viva separada.
- O autocompletar é exposto como combobox (`aria-expanded`, `aria-controls`, `aria-activedescendant`), e as abas podem ser renomeadas pelo teclado (`F2`) ou por toque (pressione e segure).
- As janelas são elementos `<dialog>` nativos com cabeçalho rotulado e botão de fechar alcançável pelo teclado, e fechá-las devolve o foco ao botão que as abriu.
- A agregação da barra de total é um `<select>` rotulado.
- A documentação que você está lendo é HTML estático com link de pular para o conteúdo, marcos e uma barra lateral alcançável pelo teclado.
