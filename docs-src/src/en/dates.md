# Dates & time

Math Notes understands calendar dates, clock times and durations. Dates can be written in several styles, stored in variables, and combined with time units.

## Writing dates

A date can be written as `10 June`, `June 10, 2023`, `2019-04-01` or `12/02/1988`. Yearless dates resolve to their nearest occurrence, and a date can be saved in a variable:

```calc 18 March 2025
start = March 4, 2025
start + 2 weeks
```

The unconditional date words `today`, `now`, `yesterday`, `tomorrow`, `christmas` and `halloween` are always available.

```calc three weeks from today
today + 3 weeks
```

```calc four days from now
4 days from now
```

## Calendar arithmetic

Add or subtract time units from a date, or phrase it with `after`/`before`.

```calc 1 July
10 June + 3 weeks
```

```calc 27 December 2018
April 1, 2019 - 3 months 5 days
```

```calc 4 April 2019
3 weeks after March 14, 2019
```

## Intervals

Subtracting one date from another gives the interval between them.

```calc 3 weeks 5 days
January 10 - February 5
```

```calc days until 25 December
days until Christmas
```

`through … in days`, `midpoint between … and …` and `days since`/`between` are also understood. An explicit year keeps the whole interval, so `2019-01-10 - 2020-02-05` does not wrap.

## Date parts

Ask for a single part of a date with a phrase:

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

## Workdays & work hours

Workdays are Monday to Friday, and a full work day is eight hours. Public holidays are not counted yet.

```calc 15 workdays
workdays in 3 weeks
```

```calc 5 workdays
10 March to 17 March in workdays
```

```calc 21 March 2019
5 workdays after March 14, 2019
```

```calc 176 work hours (8h days)
work hours in June
```

```calc Saturday
weekday on March 9, 2024
```

## Formatting a date

Use `as` with a pattern to format a date.

```calc Sunday, Mar 12, 2023
March 12, 2023 as EEEE, MMM d, yyyy
```

## Clock times

A clock time such as `9:45 am`, `1:30` or `16:00` takes durations and measures intervals. Clock times show in 24-hour by default; **Settings → Clock** switches to 12-hour.

```calc a clock time 3¼ hours later
16:00 + 3 hours 12 minutes
```

```calc 13 hours 15 minutes
7:30am to 8:45pm
```

```calc a clock time 3¼ hours from now
now + 3 hours 15 minutes
```

## Timespans

Show a duration as a timespan of components, or split it into two units. A timespan is a real duration, so it can be added and multiplied, and converted to a single unit with `to`/`in`/`as`.

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

Because a timespan is a real value, it can be referenced like any other:

```calc last line: 1 hour 5 minutes 30 seconds
5.5 minutes as timespan
line(1) + 1h
```
