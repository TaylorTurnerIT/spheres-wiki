---
id: spellscourged
name: Spellscourged
magicType: custom
cam:
  mode: choose-one
  abilities: [cha, con]
drawbacks:
  - id: center-of-power
  - id: draining-casting
  - id: substantial-magic
  - id: unstable-storage
  - id: witchmarked
sphereDrawbacks: []
boons: []
choices:
  - id: spellscourged-boon
    label: Spellscourged boon
    selector: boon
    min: 1
    max: 1
    options:
      - id: empowered-abilities
        label: Empowered Abilities
        grants:
          - id: empowered-abilities
            kind: boon
      - id: fortified-casting
        label: Fortified Casting
        grants:
          - id: fortified-casting
            kind: boon
notes:
  - "+1 spell point"
  - "+1 per 1.5 levels in a casting class"
---
Those that are spellscourged often carry a strange mutation of magic that causes it to manifest physically on the caster's body, often leading to physical exhaustion. A side effect of this mutation that is seen as both a boon and a curse is that the physical manifestation on the caster's body grows larger with each expenditure of magical energy, leaving them physically drained, but more magically potent as the mutation grows.
