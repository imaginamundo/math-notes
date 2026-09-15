Cálculos ya hechos. Haz clic en uno para añadirlo al editor y edita los valores.

## Dividir la cuenta del restaurante

Divide una cuenta a partes iguales, incluida la propina.

```calc la última línea devuelve 33
bill = 120
tip = bill * 10%
people = 4
(bill + tip) / people
```

## Dividir la cuenta del bar con tags

Divide una cuenta de bar entre cuatro personas. Escribe el importe total de cada artículo y etiqueta a todos los que lo compartieron; cada tag recibe la misma parte, mientras que el total del grupo conserva el precio completo.

```calc cada #nombre devuelve el total de una persona
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

## Escalar una receta

Escala las cantidades de los ingredientes para un número distinto de raciones, convirtiendo entre volumen y masa sobre la marcha.

```calc 397.5 g de harina; ≈ 1.98 cups de mantequilla
scale = 6 / 4
scale * 2 cups flour in grams
scale * 300g butter in cups
```

## Horas de trabajo

Pago bruto por un número de horas a una tarifa por hora.

```calc la última línea devuelve 1000
hours = 40
rate = 25
hours * rate
```

## Comparación de precio por unidad

Compara dos paquetes por su precio por 100 g.

```calc 0.798 vs 0.649 — el paquete grande es más barato
small = 3.99 / 500 * 100
large = 6.49 / 1000 * 100
```

## Descuento porcentual

Precio tras un descuento porcentual.

```calc la última línea devuelve 68
price = 80
discount = 15%
price - price * discount
```

## Meta de ahorro

Cuántos meses para alcanzar una meta con un importe mensual fijo.

```calc la última línea devuelve 20 months
goal = 5000
monthly = 250
goal / monthly
```

## Interés simple

Interés ganado sobre un capital durante varios años.

```calc la última línea devuelve 150
principal = 1000
rate = 5%
years = 3
principal * rate * years
```

## Coste de combustible de un viaje

Coste del combustible para una distancia con un consumo y un precio por litro dados.

```calc la última línea devuelve 40.8
distance = 300
consumption = 8
fuelPrice = 1.7
distance / 100 * consumption * fuelPrice
```

## Ritmo de carrera

Tu ritmo por kilómetro y, después, el tiempo de llegada para una carrera más larga a ese ritmo.

```calc 05:00/km, luego 105.5 min
# Pace per km
5 km in 25 min
# Half-marathon at that pace
21.1 km * prev
```

## Tiempo de subida

Cuánto tarda un archivo en subirse a una velocidad dada.

```calc 5 min, luego 25 min
time to upload 3 GB at 10 MB/s
time to upload 3 GB at 2 MB/s
```

## Índice de Masa Corporal

IMC a partir del peso en kg y la altura en metros.

```calc la última línea devuelve ≈ 22.86
weight = 70
height = 1.75
weight / height ^ 2
```

## Edad y tiempo transcurrido

Mide el intervalo desde una fecha hasta hoy — primero en años, meses y días, y luego en número de días.

```calc edad exacta, luego total de días
1990-04-01 to today
days since 1990-04-01
```

## Cuenta atrás para un cumpleaños

Días que faltan hasta la próxima vez que llega una fecha. Cambia el mes y el día por los tuyos.

```calc días hasta el próximo 21 June
birthday = June 21
days until birthday
```

## Coste de combustible con unidades

El consumo y el precio por litro se cancelan hasta un coste total.

```calc € 41.65
trip = 350 km
economy = 7 l / 100 km
price = 1.70 EUR/l
trip * economy * price
```

## Pago de horas extra

Horas normales a la tarifa base, más las horas extra a tiempo y medio.

```calc US$ 1,187.5 por 40 h + 5 h extra
worked = 45
rate = 25 USD/hour
regular = 40 hours * rate
overtime = (worked - 40) hours * rate * 1.5
regular + overtime
```

## Duración de la reunión

Suma el intervalo horario de cada reunión y muestra el total como un timespan.

```calc 1 hour 45 minutes en total
standup = 9:00 am to 9:15 am
review = 2:00 pm to 3:30 pm
standup + review as timespan
```

## Recordatorios de hora

Obtén una hora con un desfase fijo respecto a una hora de referencia — útil para alarmas y recordatorios.

```calc 07:15 y 14:30
wake = 6:30 am
wake + 45 minutes
wake + 8 hours
```

## Presupuesto del hogar por categoría

Etiqueta cada gasto con una categoría; una línea que solo tiene la tag totaliza esa categoría, y las tags también se suman.

```calc cada #tag es un total de categoría; la última las suma
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
