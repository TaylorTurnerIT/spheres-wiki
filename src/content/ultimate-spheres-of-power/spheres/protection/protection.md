---
id: protection
name: "Protection"
system: power
type: sphere
icon: protection
description: "You are a user of the magics of preservation."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Aegis Talents"
        tiers: ["basic"]
        tags: ["aegis"]
      - label: "Ward Talents"
        tiers: ["basic"]
        tags: ["ward"]
      - label: "Succor Talents"
        tiers: ["basic"]
        tags: ["succor"]
      - label: "Protection Talents"
        tiers: ["basic"]
        excludeTags: ["aegis", "ward", "succor"]
      - label: "Advanced Protection Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Protection Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]

---

[Aegis]

[Ward]

### Protection Talent Types

#### Succor

A (succor) talent allows you to create an effect by sacrificing an aegis you created. This is an immediate action that can be performed using any aegis you created that you have line of effect to. The resulting effect occurs to the creature that bore the aegis. These talents require line of sight, but otherwise have unlimited range.
