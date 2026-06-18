---
id: propagandist
name: Propagandist
spheres:
  - war
grants:
  - id: asymmetrical-warfare
    kind: feat
  - id: enhanced-vigilance
    kind: feat
choices:
  - id: propagandist-feat
    label: Propagandist feat
    selector: feat
    min: 1
    max: 1
    options:
      - id: asymmetrical-warfare
        label: Asymmetrical Warfare
        grants:
          - id: asymmetrical-warfare
            kind: feat
      - id: enhanced-vigilance
        label: Enhanced Vigilance
        grants:
          - id: enhanced-vigilance
            kind: feat
---
Only creatures which are under the effects of your glamer (for Asymmetrical Warfare) or your enhancement (for Enhanced Vigilance) can be affected by your Rally ability or be affected by your totems.
