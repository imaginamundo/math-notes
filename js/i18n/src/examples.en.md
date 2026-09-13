Ready-made calculations. Click one to add it to the editor and edit the values.

## Restaurant payment split

Split a bill evenly, including the tip.

```calc last line returns 33
bill = 120
tip = bill * 10%
people = 4
(bill + tip) / people
```

## Restaurant bill split with tags

Split a bar bill between four people. Write each item's full amount and tag everyone who shared it; each tag gets an equal share, while the group total keeps the full price.

```calc each #name returns a person's total
At the bar:
potato: 20 #name1 #name2 #name3
burger: 2 * 50 #name1 #name3
beer: 160 #name1 #name2 #name3 #name4
end

#name1
#name2
#name3
#name4
```

## Scale a recipe

Scale ingredient amounts to a different number of servings, converting between volume and mass as you go.

```calc 397.5 g flour; ≈ 1.98 cups butter
scale = 6 / 4
scale * 2 cups flour in grams
scale * 300g butter in cups
```

## Hours of work

Gross pay for a given number of hours at an hourly rate.

```calc last line returns 1000
hours = 40
rate = 25
hours * rate
```

## Unit price comparison

Compare two packs by their price per 100 g.

```calc 0.798 vs 0.649 — the large pack is cheaper
small = 3.99 / 500 * 100
large = 6.49 / 1000 * 100
```

## Percentage discount

Price after a percentage discount.

```calc last line returns 68
price = 80
discount = 15%
price - price * discount
```

## Savings goal

How many months to reach a goal at a fixed monthly amount.

```calc last line returns 20 months
goal = 5000
monthly = 250
goal / monthly
```

## Simple interest

Interest earned on a principal over a number of years.

```calc last line returns 150
principal = 1000
rate = 5%
years = 3
principal * rate * years
```

## Fuel cost for a trip

Cost of fuel for a distance at a given consumption and price per litre.

```calc last line returns 40.8
distance = 300
consumption = 8
fuelPrice = 1.7
distance / 100 * consumption * fuelPrice
```

## Running pace

Your pace per kilometre, then the finish time for a longer race at that pace.

```calc 05:00/km, then 105.5 min
# Pace per km
5 km in 25 min
# Half-marathon at that pace
21.1 km * prev
```

## Upload time

How long a file takes to upload at a given speed.

```calc 300 s, then 1,500 s
time to upload 3 GB at 10 MB/s
time to upload 3 GB at 2 MB/s
```

## Body Mass Index

BMI from weight in kg and height in metres.

```calc last line returns ≈ 22.86
weight = 70
height = 1.75
weight / height ^ 2
```

## Age and elapsed time

Measure the span from a date to today — first as calendar years, months and days, then as a plain day count.

```calc exact age, then total days
1990-04-01 to today
days since 1990-04-01
```

## Countdown to a birthday

Days left until the next time a date comes around. Change the month and day to your own.

```calc days until the next 21 June
birthday = June 21
days until birthday
```

## Fuel cost with units

The consumption and the price per litre cancel down to a total cost.

```calc € 41.65
trip = 350 km
economy = 7 l / 100 km
price = 1.70 EUR/l
trip * economy * price
```

## Overtime pay

Regular hours at the base rate, plus the extra hours at time and a half.

```calc US$ 1,187.5 for 40 h + 5 h overtime
worked = 45
rate = 25 USD/hour
regular = 40 hours * rate
overtime = (worked - 40) hours * rate * 1.5
regular + overtime
```

## Meeting length

Add the clock-time interval of each meeting and show the total as a timespan.

```calc 1 hour 45 minutes total
standup = 9:00 am to 9:15 am
review = 2:00 pm to 3:30 pm
standup + review as timespan
```

## Clock reminders

Get a clock time a fixed offset after an anchor time — handy for alarms and reminders.

```calc 07:15 and 14:30
wake = 6:30 am
wake + 45 minutes
wake + 8 hours
```

## Household budget by category

Tag each expense with a category; a line that is only the tag totals that category, and tags add up too.

```calc each #tag is a category total; the last adds them up
Budget:
rent: 1200 #home
utilities: 150 #home
groceries: 480 #living
transport: 120 #living
end
#home
#living
#home + #living
```
