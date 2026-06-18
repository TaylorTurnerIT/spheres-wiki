---
id: morose-essentialist
name: Morose Essentialist
magicType: psychic
cam:
  mode: fixed
  abilities: [wis]
drawbacks:
  - id: focus-casting
    option: a skull, body part, or undead creature under your control
  - id: mental-focus
  - id: verbal-casting
sphereDrawbacks: []
boons: []
choices:
  - id: morose-essentialist-boon
    label: Variable boon
    selector: boon
    min: 1
    max: 1
    options:
      - id: deathful-magic
        label: Deathful Magic
        grants:
          - id: deathful-magic
            kind: boon
      - id: easy-focus
        label: Easy Focus
        grants:
          - id: easy-focus
            kind: boon
notes:
  - "+1 spell point"
  - "+1 per six levels in casting classes"
---
A morose essentialist possesses a grim, pensive mindset to their applications of magic, often using undead they create or the treated, preserved bones of those they respect.
