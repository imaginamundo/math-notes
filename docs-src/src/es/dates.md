# Fechas & tiempo

Math Notes entiende fechas de calendario, horas y duraciones. Las fechas se pueden escribir de varias formas, guardar en variables y combinar con unidades de tiempo.

## Escribir fechas

Una fecha se puede escribir como `10 June`, `June 10, 2023`, `2019-04-01` o `12/02/1988`. Las fechas sin año se resuelven a su ocurrencia más cercana, y una fecha se puede guardar en una variable:

```calc 18 March 2025
start = March 4, 2025
start + 2 weeks
```

Las palabras de fecha incondicionales `today`, `now`, `yesterday`, `tomorrow`, `christmas` y `halloween` están siempre disponibles.

```calc dentro de tres semanas
today + 3 weeks
```

```calc dentro de cuatro días
4 days from now
```

## Aritmética de calendario

Suma o resta unidades de tiempo a una fecha, o fraséalo con `after`/`before`.

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

Restar una fecha de otra da el intervalo entre ellas.

```calc 3 weeks 5 days
January 10 - February 5
```

```calc días hasta el 25 December
days until Christmas
```

También se entienden `through … in days`, `midpoint between … and …` y `days since`/`between`. Un año explícito conserva el intervalo entero, así que `2019-01-10 - 2020-02-05` no da la vuelta.

## Partes de una fecha

Pide una parte concreta de una fecha con una frase:

```calc 29
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

## Días laborables & horas de trabajo

Los días laborables son de lunes a viernes, y una jornada completa tiene ocho horas. Los festivos aún no se cuentan.

```calc 15 workdays
workdays in 3 weeks
```

```calc 5 workdays
10 March to 17 March in workdays
```

```calc 21 March 2019
5 workdays after March 14, 2019
```

```calc 176 horas de trabajo (jornadas de 8h)
work hours in June
```

```calc Saturday
weekday on March 9, 2024
```

## Dar formato a una fecha

Usa `as` con un patrón para dar formato a una fecha.

```calc Sunday, Mar 12, 2023
March 12, 2023 as EEEE, MMM d, yyyy
```

## Horas

Una hora como `9:45 am`, `1:30` o `16:00` acepta duraciones y mide intervalos. Las horas se muestran en formato de 24 horas por defecto; **Ajustes → Reloj** cambia a 12 horas.

```calc una hora 3¼ horas después
16:00 + 3 hours 12 minutes
```

```calc 13 hours 15 minutes
7:30am to 8:45pm
```

```calc una hora 3¼ horas desde ahora
now + 3 hours 15 minutes
```

## Intervalos de tiempo

Muestra una duración como un timespan de componentes, o divídela en dos unidades. Un timespan es una duración real, así que se puede sumar y multiplicar, y convertir a una sola unidad con `to`/`in`/`as`.

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

Como un timespan es un valor real, se puede referenciar como cualquier otro:

```calc última línea: 1 hour 5 minutes 30 seconds
5.5 minutes as timespan
line(1) + 1h
```
