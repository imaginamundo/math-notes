Cálculos prontos. Clique em um para adicioná-lo ao editor e edite os valores.

## Dividir a conta do restaurante

Divida uma conta igualmente, incluindo a gorjeta.

```calc a última linha retorna 33
bill = 120
tip = bill * 10%
people = 4
(bill + tip) / people
```

## Dividir a conta do bar com tags

Divida uma conta de bar entre quatro pessoas. Escreva o valor total de cada item e marque todos que o compartilharam; cada tag recebe uma parte igual, enquanto o total do grupo mantém o preço cheio.

```calc cada #nome retorna o total de uma pessoa
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

## Escalar uma receita

Escale as quantidades dos ingredientes para um número diferente de porções, convertendo entre volume e massa no caminho.

```calc 397.5 g de farinha; ≈ 1.98 cups de manteiga
scale = 6 / 4
scale * 2 cups flour in grams
scale * 300g butter in cups
```

## Horas de trabalho

Pagamento bruto por um número de horas a um valor por hora.

```calc a última linha retorna 1000
hours = 40
rate = 25
hours * rate
```

## Comparação de preço por unidade

Compare dois pacotes pelo preço por 100 g.

```calc 0.798 vs 0.649 — o pacote grande é mais barato
small = 3.99 / 500 * 100
large = 6.49 / 1000 * 100
```

## Desconto percentual

Preço após um desconto percentual.

```calc a última linha retorna 68
price = 80
discount = 15%
price - price * discount
```

## Meta de poupança

Quantos meses para atingir uma meta com um valor mensal fixo.

```calc a última linha retorna 20 months
goal = 5000
monthly = 250
goal / monthly
```

## Juros simples

Juros ganhos sobre um principal ao longo de alguns anos.

```calc a última linha retorna 150
principal = 1000
rate = 5%
years = 3
principal * rate * years
```

## Custo de combustível de uma viagem

Custo do combustível para uma distância, dado o consumo e o preço por litro.

```calc a última linha retorna 40.8
distance = 300
consumption = 8
fuelPrice = 1.7
distance / 100 * consumption * fuelPrice
```

## Ritmo de corrida

Seu ritmo por quilômetro e, depois, o tempo de chegada para uma corrida mais longa nesse ritmo.

```calc 05:00/km, depois 105.5 min
# Pace per km
5 km in 25 min
# Half-marathon at that pace
21.1 km * prev
```

## Tempo de upload

Quanto tempo um arquivo leva para subir a uma determinada velocidade.

```calc 300 s, depois 1,500 s
time to upload 3 GB at 10 MB/s
time to upload 3 GB at 2 MB/s
```

## Índice de Massa Corporal

IMC a partir do peso em kg e da altura em metros.

```calc a última linha retorna ≈ 22.86
weight = 70
height = 1.75
weight / height ^ 2
```

## Idade e tempo decorrido

Meça o intervalo de uma data até hoje — primeiro em anos, meses e dias, depois em número de dias.

```calc idade exata, depois total de dias
1990-04-01 to today
days since 1990-04-01
```

## Contagem regressiva para um aniversário

Dias até a próxima vez que uma data acontece. Mude o mês e o dia para os seus.

```calc dias até o próximo 21 June
birthday = June 21
days until birthday
```

## Custo de combustível com unidades

O consumo e o preço por litro se cancelam até um custo total.

```calc € 41.65
trip = 350 km
economy = 7 l / 100 km
price = 1.70 EUR/l
trip * economy * price
```

## Pagamento de horas extras

Horas normais pelo valor base, mais as horas extras a 1,5 vez.

```calc US$ 1,187.5 por 40 h + 5 h extras
worked = 45
rate = 25 USD/hour
regular = 40 hours * rate
overtime = (worked - 40) hours * rate * 1.5
regular + overtime
```

## Duração da reunião

Some o intervalo de horário de cada reunião e mostre o total como um timespan.

```calc 1 hour 45 minutes no total
standup = 9:00 am to 9:15 am
review = 2:00 pm to 3:30 pm
standup + review as timespan
```

## Lembretes de horário

Obtenha um horário um deslocamento fixo após um horário âncora — útil para alarmes e lembretes.

```calc 07:15 e 14:30
wake = 6:30 am
wake + 45 minutes
wake + 8 hours
```

## Orçamento doméstico por categoria

Marque cada despesa com uma categoria; uma linha que contém apenas a tag soma essa categoria, e as tags também se somam.

```calc cada #tag é um total de categoria; a última soma tudo
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
