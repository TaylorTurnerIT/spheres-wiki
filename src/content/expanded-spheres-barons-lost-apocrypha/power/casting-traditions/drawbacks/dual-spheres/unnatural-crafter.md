---
id: unnatural-crafter
name: Unnatural Crafter
spheres:
  - creation
grants:
  - id: kinetic-creation
    kind: feat
  - id: shape-quintessence
    kind: feat
choices:
  - id: unnatural-crafter-feat
    label: Unnatural Crafter feat
    selector: feat
    min: 1
    max: 1
    options:
      - id: kinetic-creation
        label: Kinetic Creation
        grants:
          - id: kinetic-creation
            kind: feat
      - id: shape-quintessence
        label: Shape Quintessence
        grants:
          - id: shape-quintessence
            kind: feat
---
You may not create objects out of normal matter, being able only to create items out of force (if you take the Kinetic Creation feat) or quintessence (if you take the Shape Quintessence feat).
