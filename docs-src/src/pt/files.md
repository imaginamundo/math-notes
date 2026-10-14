# Arquivos, compartilhamento & dados

O Math Notes guarda seu trabalho no seu dispositivo. Não há conta nem servidor: as planilhas são salvas no navegador, copiadas em um armazenamento local versionado, e compartilhadas apenas quando você escolhe.

## Abas

Use as abas no topo para manter planilhas separadas. Cada aba é salva automaticamente enquanto você digita.

- **Trocar** — clique em uma aba (ou use `←`/`→` com ela focada, ou `Ctrl+Tab`).
- **Reordenar** — clique e arraste uma aba para uma nova posição.
- **Renomear** — clique duas vezes no nome da aba (ou pressione `F2` com a aba focada; em uma tela de toque, pressione e segure).
- **Fechar** — clique no `×`, ou pressione `Delete` / `Backspace` com a aba em foco (você deverá confirmar). Fechar a última aba abre uma nova.
- **Adicionar** — clique na aba `+`, ou no `⌄` ao lado para começar a partir de um modelo (orçamento, custo da viagem, fatura, meta de poupança, dividir a conta).

## Exportar e importar

Use **Configurações → Arquivos** para baixar a planilha ativa como um arquivo de texto, ou carregar uma de um arquivo (`.txt`, `.numi` ou texto simples, até 1 MB). Importar **substitui o conteúdo da planilha ativa**, pedindo confirmação se a planilha não estiver vazia; não abre uma nova aba. As exportações se chamam `math-notes-AAAA-MM-DD.txt`. As mesmas ações estão em `⇧⌘E` / `Ctrl+Shift+E` (exportar) e `⇧⌘I` / `Ctrl+Shift+I` (importar).

## Links de compartilhamento

O botão **Compartilhar** copia um link que carrega a planilha ativa dentro dele. Quem abrir é perguntado se quer abrir a planilha em uma nova aba; ele nunca substitui o que a pessoa já tem. O link é comprimido, e você é avisado se ele passar de cerca de 8000 caracteres, porque alguns apps cortam links longos; um link que descompacta para mais de 256 KB é recusado.

Nada é enviado. A planilha viaja no fragmento `#` do link, que os navegadores nunca enviam a um servidor — ele não aparece em logs de acesso nem é encaminhado em um cabeçalho `Referer`.

## Cópias automáticas

As edições de cada aba são copiadas para o IndexedDB como snapshots versionados. Abra **Configurações → Recuperar** para ver todos os snapshots, agrupados por aba, e restaurar qualquer um deles, ou use **Restaurar tudo do backup mais recente** para trazer todas as abas de volta. Cada aba guarda os seus 10 snapshots mais recentes, salvos alguns segundos depois que você para de digitar. Fechar uma aba também remove os seus snapshots. Os snapshots são armazenados comprimidos para ocupar pouco espaço.

Se o app parar enquanto calcula uma planilha, os resultados dela ficam em pausa quando a página recarrega (um aviso informa isso), então uma única linha problemática não deixa você de fora. Edite a planilha para calculá-la de novo, ou feche a aba.

Se o localStorage estiver indisponível ou corrompido, as planilhas são reconstruídas automaticamente a partir dos backups, e um valor corrompido é copiado à parte em vez de ser perdido.

## Redefinir

**Configurações → Redefinir → Redefinir dados** limpa o tema, as abas e todos os dados salvos, voltando aos padrões, e então abre uma nova folha **Boas-vindas** e reinicia o contador de abas. Exporte o que quiser manter antes.

## Privacidade

As planilhas ficam no seu dispositivo. A única requisição de rede que o app faz é para as taxas de câmbio, e elas ficam em cache para uso offline. Veja [Sobre](/docs/about/) para as bibliotecas envolvidas.
