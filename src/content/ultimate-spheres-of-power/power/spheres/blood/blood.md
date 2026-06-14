---
name: "Blood"
icon: blood
description: "You can manipulate blood and its properties."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Blood Art Talents"
        tiers: ["basic"]
        tags: ["blood-art"]
      - label: "Quicken/Still Talents"
        tiers: ["basic"]
        tags: ["quicken", "still"]
      - label: "Blood Talents"
        tiers: ["basic"]
        excludeTags: ["blood-art","still","quicken"]
      - label: "Advanced Blood Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Blood Feats"
        tiers: ["feat"]
        excludeTags: ["dual-sphere"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
---

[Blood Control]

[Bleed]

[Coagulate]

### Blood Talent Types

The Blood and Portents handbook introduces a new set of Blood sphere talents marked (blood art). These talents grant a Blood sphere caster the ability to cast blood arts, which briefly manipulate or transfigure blood.

You may use blood as a catalyst to create effects known as blood arts. Casting a blood art is a standard action, unless otherwise stated, and has a range of close. As part of casting any blood art, either the caster’s or the target’s blood is briefly manipulated, causing that creature to suffer a small amount of damage known as “blood loss”.

Blood loss is inflicted on the creature whose blood is manipulated by a blood art in addition to but separate from any of the blood art’s normal effects. A creature who suffers blood loss takes untyped damage equal to 1/2 the blood art caster’s Blood sphere caster level (minimum 1). This damage cannot be prevented and bypasses any temporary hit points the target may possess.

A creature who cannot suffer blood loss cannot be the target of a blood art. Targets that gain immunity to bleed damage from their creature type, subtype, or a template cannot suffer blood loss. Creatures that gain immunity to bleed damage from other sources are susceptible to blood loss, but still benefit from their immunity against bleed damage. Some creatures that are normally immune to bleed damage but that frequently feed on blood may be susceptible to blood loss. Any creature that has used the blood drain universal monster ability in the previous hour or any creature composed largely of blood (such as a blood golem) may suffer blood loss. Other appropriate creatures may also suffer blood loss, at the GM’s discretion.

----

### Blood Arts 

The Blood and Portents handbook introduces a new set of Blood sphere talents marked (blood art). These talents grant a Blood sphere caster the ability to cast blood arts, which briefly manipulate or transfigure blood.

You may use blood as a catalyst to create effects known as blood arts. Casting a blood art is a standard action, unless otherwise stated, and has a range of close. As part of casting any blood art, either the caster’s or the target’s blood is briefly manipulated, causing that creature to suffer a small amount of damage known as “blood loss”.

Blood loss is inflicted on the creature whose blood is manipulated by a blood art in addition to but separate from any of the blood art’s normal effects. A creature who suffers blood loss takes untyped damage equal to 1/2 the blood art caster’s Blood sphere caster level (minimum 1). This damage cannot be prevented and bypasses any temporary hit points the target may possess.

A creature who cannot suffer blood loss cannot be the target of a blood art. Targets that gain immunity to bleed damage from their creature type, subtype, or a template cannot suffer blood loss. Creatures that gain immunity to bleed damage from other sources are susceptible to blood loss, but still benefit from their immunity against bleed damage. Some creatures that are normally immune to bleed damage but that frequently feed on blood may be susceptible to blood loss. Any creature that has used the blood drain universal monster ability in the previous hour or any creature composed largely of blood (such as a blood golem) may suffer blood loss. Other appropriate creatures may also suffer blood loss, at the GM’s discretion.

#### Author's Note: "What Exactly Is Blood Loss"

Blood loss is an additional "cost" associated with a blood art. It is damage, but it is not the sphere effect's damage. It cannot be modified, increased or interacted with like a sphere effect's regular damage or effects. Metamagic contingent on an effect dealing damage to a target, such as the Dazing Spell metamagic, would not consider or treat the blood loss mechanic as the sphere effect's damage. Suffering blood loss as part of casting a blood art does not force the caster to make a concentration check.

---

<details>
<summary>Optional Rules</summary>

#### Blood as a Spell Component or Focus
Using a portion of a creature’s blood as an additional spell component creates a bond between the caster and the target, making the effect harder for the target to resist. Gathering sufficient blood, one vial’s worth, requires inflicting 1 point of Constitution damage to a willing or helpless creature as a full-round action. When used as an additional spell component, the save DC of the spell or sphere effect is increased by +1 per vial used (to a maximum of +4) against the creature whose blood was used, though any other creatures making a save against the spell or sphere effect has the DC reduced by an equal amount.

When used as a focus component, the duration of any Divination sphere effect or spell of the Divination school that would locate or contact the creature whose blood is used has its duration doubled per the Extend metamagic feat and its area increased as the Widen Spell metamagic feat, if applicable. These increases stack with the increases from those metamagic feats. Alternatively, the caster may reduce the casting time of such a spell or sphere effect by 1 step, to a minimum of 1 round.

Blood does not last indefinitely, losing its potency after 1d6 hours. A successful DC10 Heal check made as a full-round action can determine the number of hours remaining.

Particularly hot conditions may reduce this time, while particularly cold ones may extend it, at the GM’s discretion. The most common method for preserving a sample of blood is placing it in a vial prepared with a small dose of unguent of timelessness (a vial of unguent of timelessness is sufficient to prepare 75 vials). This is sufficient to preserve the sample for 1 year. Pre-prepared vials may be purchased for 3 gp. Once used, the vial is a normal glass vial with no special properties.

#### Blood Alchemy
The blood of certain creatures can be used when crafting alchemical items to reduce the required material cost. By inflicting 1 point of Constitution damage on a willing or helpless creature of either the correct race or subtype, or that possesses the necessary ability, you may reduce the cost of crafting a single corresponding alchemical item by half. See the following table for suggestions on what races and types correspond to each alchemical item. Other races and items may be appropriate at the GM’s discretion.
| Alchemical Item | Race or Creature | Creature Subtype | Universal Monster Ability |
|---|---|---|---|
| Acid flask | Oread | Earth | - |
| Alchemist fire | Ifrit | Fire | Burn |
| Brewed reek | Troglodyte | - | Stench |
| Elemental breath | Sylph | Air | - |
| Fury drops | Half-orc, orc | Orc | Blood rage, ferocity |
| Gel, fire ward | Undine | Cold, water | Immunity (fire), resistance (fire) |
| Gel, frost ward | Ifrit | Fire | Burn, immunity (cold), resistance (cold) |
| Ifrit’s blood | Ifrit | Fire | Burn |
| Ink (glowing) | Aasimar | Angel, archon | - |
| Powder (rusting) | Rust monster | - | - |
| Smoke pellet | Fetchling | Dark folk | - |
| Smoke stick | Fetchling | Dark folk | - |
| Thunderstone | Sylph | Air | - |
| Troll oil | Troll | - | Fast healing, regeneration |
| Woundweal | - | - | Poison |

</details>
