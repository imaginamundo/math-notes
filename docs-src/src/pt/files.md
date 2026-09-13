# Arquivos, compartilhamento & dados

O Math Notes guarda seu trabalho no seu dispositivo. Não há conta nem servidor: as planilhas são salvas no navegador, copiadas em um armazenamento local versionado, e compartilhadas apenas quando você escolhe.

## Abas

Use as abas no topo para manter planilhas separadas. Cada aba é salva automaticamente enquanto você digita.

- **Trocar** — clique em uma aba (ou use `←`/`→` com ela focada, ou `Ctrl+Tab`).
- **Reordenar** — clique e arraste uma aba para uma nova posição.
- **Renomear** — clique duas vezes no nome da aba.
- **Fechar** — clique no `×` (você deverá confirmar).
- **Adicionar** — clique na aba `+`.

## Exportar e importar

Use **Configurações → Arquivos** para baixar a planilha ativa como um arquivo de texto, ou carregar uma de um arquivo. As mesmas ações estão em `⇧⌘E` / `Ctrl+Shift+E` (exportar) e `⇧⌘I` / `Ctrl+Shift+I` (importar).

## Links de compartilhamento

O botão **Compartilhar** copia um link que carrega a planilha ativa dentro dele. Quem abrir é perguntado se quer abrir a planilha em uma nova aba; ele nunca substitui o que a pessoa já tem.

Nada é enviado. A planilha viaja no fragmento `#` do link, que os navegadores nunca enviam a um servidor — ele não aparece em logs de acesso nem é encaminhado em um cabeçalho `Referer`.

## Cópias automáticas

As edições de cada aba são copiadas para o IndexedDB como snapshots versionados. Abra **Configurações → Recuperar** para ver o histórico e restaurar um snapshot, ou use **Restaurar tudo do backup mais recente** para trazer todas as abas de volta. Os snapshots são armazenados comprimidos para ocupar pouco espaço.

Se o localStorage estiver indisponível ou corrompido, as planilhas são reconstruídas automaticamente a partir dos backups.

## Redefinir

**Configurações → Redefinir → Redefinir dados** limpa o tema, as abas e todos os dados salvos, voltando aos padrões. Exporte o que quiser manter antes.

## Privacidade

As planilhas ficam no seu dispositivo. A única requisição de rede que o app faz é para as taxas de câmbio, e elas ficam em cache para uso offline. Veja [Sobre](/docs/about/) para as bibliotecas envolvidas.
