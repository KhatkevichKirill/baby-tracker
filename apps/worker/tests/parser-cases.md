# Parser Cases (RU)

## Multi-event sentence
Input:
`в 03:20 поела 80 мл смеси, потом спала с 04:00 до 06:10, температура 37.2`

Expected drafts:
- feeding with volume
- sleep with start and end
- symptom with temperature

## Ambiguous sentence
Input:
`кажется сегодня хуже себя чувствует`

Expected draft:
- note or symptom with low confidence

## No direct time
Input:
`утром был жидкий стул`

Expected draft:
- diaper with kind stool and no strict occurredAt
