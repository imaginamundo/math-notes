# Datas & tempo

O Math Notes entende datas de calendário, horários e durações. As datas podem ser escritas de várias formas, guardadas em variáveis e combinadas com unidades de tempo.

## Escrevendo datas

Uma data pode ser escrita como `10 June`, `June 10, 2023`, `2019-04-01` ou `12/02/1988`. Datas sem ano resolvem para a ocorrência mais próxima, e uma data pode ser guardada em uma variável:

```calc 18 March 2025
start = March 4, 2025
start + 2 weeks
```

As palavras de data incondicionais `today`, `now`, `yesterday`, `tomorrow`, `christmas` e `halloween` estão sempre disponíveis.

```calc daqui a três semanas
today + 3 weeks
```

```calc daqui a quatro dias
4 days from now
```

## Aritmética de calendário

Some ou subtraia unidades de tempo de uma data, ou fraseie com `after`/`before`.

```calc 1 July
10 June + 3 weeks
```

```calc 27 December 2018
April 1, 2019 - 3 months 5 days
```

```calc 4 April 2019
3 weeks after March 14, 2019
```

## Intervalos

Subtrair uma data de outra dá o intervalo entre elas.

```calc 3 weeks 5 days
January 10 - February 5
```

```calc dias até 25 December
days until Christmas
```

`through … in days`, `midpoint between … and …` e `days since`/`between` também são entendidos. Um ano explícito mantém o intervalo inteiro, então `2019-01-10 - 2020-02-05` não dá a volta.

## Partes de uma data

Peça uma parte específica de uma data com uma frase:

```calc 29 days
days in February 2020
```

```calc 42
day number on February 11, 2019
```

```calc 11
day of month on March 11, 2019
```

```calc 10
week number on March 9, 2024
```

## Dias úteis & horas de trabalho

Dias úteis são de segunda a sexta, e um dia de trabalho completo tem oito horas. Feriados ainda não são contados.

```calc 15 workdays
workdays in 3 weeks
```

```calc 5 workdays
10 March to 17 March in workdays
```

```calc 21 March 2019
5 workdays after March 14, 2019
```

```calc 176 horas de trabalho (dias de 8h)
work hours in June
```

```calc Saturday
weekday on March 9, 2024
```

## Formatando uma data

Use `as` com um padrão para formatar uma data.

```calc Sunday, Mar 12, 2023
March 12, 2023 as EEEE, MMM d, yyyy
```

## Horários

Um horário como `9:45 am`, `1:30` ou `16:00` aceita durações e mede intervalos. Os horários aparecem em 24 horas por padrão; **Configurações → Relógio** alterna para 12 horas.

```calc um horário 3¼ horas depois
16:00 + 3 hours 12 minutes
```

```calc 13 hours 15 minutes
7:30am to 8:45pm
```

```calc um horário 3¼ horas a partir de agora
now + 3 hours 15 minutes
```

## Intervalos de tempo

Mostre uma duração como um timespan de componentes, ou divida-a em duas unidades. Um timespan é uma duração real, então pode ser somado e multiplicado, e convertido para uma única unidade com `to`/`in`/`as`.

```calc 5 min 30 s
5.5 minutes as timespan
```

```calc 10 weeks 2 days
72 days as timespan
```

```calc 3 hours 5 minutes 10 seconds
3h 5m 10s
```

```calc 11,110 seconds
3h 5m 10s in seconds
```

```calc 12 min 30 s
12.5 minutes in minutes and seconds
```

Como um timespan é um valor real, ele pode ser referenciado como qualquer outro:

```calc última linha: 1 hour 5 minutes 30 seconds
5.5 minutes as timespan
line(1) + 1h
```
