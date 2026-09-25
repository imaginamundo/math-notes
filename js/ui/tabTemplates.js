// Starter sheets for the new-tab menu. Each entry is a small, working sheet so
// a new tab opens with something to edit instead of an empty page. Names are
// localized; the sheets themselves use the calculator's own language.
import { t } from '../i18n/index.js';

const TEMPLATES = [
  {
    id: 'budget',
    name: 'template.budget',
    content: [
      '# Monthly budget',
      'income = 3200',
      '',
      'Housing: 1200 + 150',
      'Food: 480 + 160',
      'Transport: 120',
      'Savings: 400',
      '',
      'sum',
      'income - sum',
    ],
  },
  {
    id: 'trip',
    name: 'template.trip',
    content: [
      '# Trip cost',
      'distance = 350 km',
      'economy = 7 l / 100 km',
      'fuelPrice = 1.70 EUR/l',
      '',
      'fuel = distance * economy * fuelPrice',
      'hotel = 3 days * 95 EUR/day',
      'food = 4 days * 35 EUR/day',
      '',
      'fuel + hotel + food',
    ],
  },
  {
    id: 'invoice',
    name: 'template.invoice',
    content: [
      '# Invoice',
      'hours = 12 hours',
      'rate = 85 USD/hour',
      'taxRate = 8.5%',
      '',
      'subtotal = hours * rate',
      'tax = subtotal * taxRate',
      'total = subtotal + tax',
      '',
      'subtotal',
      'tax',
      'total',
    ],
  },
  {
    id: 'savings',
    name: 'template.savings',
    content: ['# Savings goal', 'goal = 5000', 'monthly = 250', '', 'goal / monthly'],
  },
  {
    id: 'split',
    name: 'template.split',
    content: [
      '# Split a bill',
      'bill = 120',
      'tip = bill * 10%',
      'people = 4',
      '',
      '(bill + tip) / people',
    ],
  },
];

// Built fresh each call so the names follow the active language.
function getTabTemplates() {
  return TEMPLATES.map((template) => ({
    id: template.id,
    name: t(template.name),
    content: template.content.join('\n'),
  }));
}

export { getTabTemplates };
