// Portuguese (Brazil) UI strings. Key set must match en.js.
export default {
  'app.name': 'Math Notes',

  'editor.label': 'Entrada da calculadora',
  'editor.placeholder':
    'Digite seus cálculos…\nOs resultados aparecem ao lado\nVeja a Documentação para tudo o que ele entende',

  'total.label': 'Agregação do total',
  'total.sum': 'total',
  'total.average': 'média',
  'total.median': 'mediana',

  'loading.sr': 'Calculando',
  'loading.dots': 'Carregando',

  'font.group': 'Tamanho do texto',
  'font.decrease': 'Diminuir o tamanho do texto',
  'font.increase': 'Aumentar o tamanho do texto',
  'font.reset': 'Redefinir tamanho',

  'footer.share': 'Compartilhar',
  'footer.settings': 'Configurações',
  'footer.examples': 'Exemplos',
  'footer.docs': 'Docs',

  'modal.examples': 'Exemplos',
  'modal.settings': 'Configurações',
  'modal.closeExamples': 'Fechar os exemplos',
  'modal.closeSettings': 'Fechar as configurações',

  'status.ratesCached': 'cotações: em cache',
  'status.ratesLive': 'cotações: ao vivo',
  'status.ratesUnavailable': 'cotações indisponíveis',

  'share.buildFailed': 'Não foi possível criar um link para esta planilha',
  'share.copiedLong': 'Link copiado — é longo, alguns apps podem cortá-lo',
  'share.copied': 'Link copiado',
  'share.copyFailed': 'Não foi possível copiar — o link está na barra de endereços',
  'share.unreadable': 'Não foi possível ler esse link',
  'share.openConfirm': 'Abrir a planilha compartilhada "{name}" em uma nova aba?',
  'share.opened': 'Aberto "{name}"',
  'share.defaultName': 'Planilha compartilhada',

  'io.importConfirm': 'A importação substituirá o conteúdo da aba atual. Continuar?',

  'tabs.list': 'Planilhas',
  'tabs.rename': 'Clique duas vezes para renomear',
  'tabs.close': 'Fechar aba',
  'tabs.new': 'Nova aba',
  'tabs.defaultName': 'Aba {n}',
  'tabs.closeConfirm': 'Fechar "{name}"? O conteúdo será perdido.',

  'find.placeholder': 'Localizar na planilha',
  'find.matchCase': 'Diferenciar maiúsculas',
  'find.previous': 'Ocorrência anterior (Shift+Enter)',
  'find.next': 'Próxima ocorrência (Enter)',
  'find.close': 'Fechar (Escape)',
  'find.replacePlaceholder': 'Substituir por',
  'find.replace': 'Substituir',
  'find.replaceHint': 'Substituir a ocorrência atual (Enter)',
  'find.all': 'Tudo',
  'find.replaceAll': 'Substituir todas as ocorrências',

  'goto.label': 'Ir para a linha',
  'goto.lineNumber': 'Número da linha',

  'starter.group': 'Ações do conteúdo de exemplo',
  'starter.keep': '✓ Manter conteúdo',
  'starter.keepTitle': 'Manter este conteúdo de exemplo',
  'starter.clear': '× Limpar conteúdo',
  'starter.clearTitle': 'Esvaziar esta aba',
  'starter.name': 'Boas-vindas',
  'starter.welcomeComment': '# Boas-vindas! Cada linha é calculada; o resultado aparece à direita.',
  'starter.labelComment': '# Um rótulo nomeia a linha; `sum` soma o bloco acima:',
  'starter.tagComment': '# Tags nomeiam linhas; uma #tag sozinha soma todas elas:',

  'autocomplete.label': 'Sugestões',
  'example.addTitle': 'Clique para adicionar ao editor',

  'settings.files': 'Arquivos',
  'settings.filesBody': 'Exporte a planilha ativa como texto ou importe uma de um arquivo.',
  'settings.export': 'Exportar',
  'settings.import': 'Importar',
  'settings.theme': 'Tema',
  'settings.themeBody': 'Escolha um tema.',
  'settings.measurement': 'Sistema de medidas',
  'settings.measurementBody':
    'Usado para unidades de volume na cozinha. O padrão é o sistema métrico.',
  'settings.precision': 'Precisão decimal',
  'settings.precisionBody':
    'Casas decimais mostradas nos resultados. Um resultado truncado termina com reticências; os cálculos mantêm a precisão total.',
  'settings.precisionLabel': 'Casas decimais',
  'settings.clock': 'Relógio',
  'settings.clockBody': 'Como os horários são escritos. O padrão é o formato de 24 horas.',
  'settings.language': 'Idioma',
  'settings.languageBody': 'O idioma da interface. Por padrão, detectado do seu sistema.',
  'settings.recover': 'Recuperar',
  'settings.recoverBody':
    'Snapshots salvos automaticamente de cada aba ficam no IndexedDB. Restaure um para recuperar o trabalho perdido.',
  'settings.restoreAll': 'Restaurar tudo do último backup',
  'settings.noSnapshots':
    'Ainda não há snapshots. Eles aparecem alguns segundos depois que você edita uma aba.',
  'settings.restore': 'Restaurar',
  'settings.reset': 'Redefinir',
  'settings.resetBody': 'Redefine o tema, as abas e todos os dados salvos para os padrões.',
  'settings.resetButton': 'Redefinir dados',
  'settings.resetConfirm': 'Isso redefinirá o tema, as abas e todos os dados salvos. Continuar?',
  'settings.restoreConfirm': 'Restaurar "{name}" de {ago}? Isso substitui o conteúdo atual.',
  'settings.restoreAllConfirm':
    'Substituir todas as abas pelo snapshot mais recente de cada uma? Isso descarta as abas atuais.',

  'time.justNow': 'agora mesmo',
  'time.minutesAgo': 'há {n} min',
  'time.hoursAgo': 'há {n} h',
  'time.daysAgo': 'há {n} d',

  'apply.theme': 'Aplicar {name}',
  'apply.measurement': 'Usar unidades de volume {name}',
  'apply.clock': 'Mostrar horários no formato {name}',
  'apply.language': 'Usar {name}',

  'measurement.metric': 'Métrico',
  'measurement.us': 'Americano',
  'measurement.imperial': 'Imperial',
  'clock.24': '24 horas',
  'clock.12': '12 horas',
  'language.en': 'English',
  'language.pt': 'Português',
  'language.es': 'Español',
};
