---
name: "Illusion"
icon: illusion
description: "You may craft images and impressions of things that are not there."
tags: []
sectionDefinitions:
  - label: "Talents"
    categories:
      - label: "Sensory Talents"
        tiers: ["basic"]
        tags: ["sensory"]
      - label: "Glamer Talents"
        tiers: ["basic"]
        tags: ["glamer"]
      - label: "Illusion Talents"
        tiers: ["basic"]
        excludeTags: ["sensory", "glamer"]
      - label: "Advanced Illusion Talents"
        tiers: ["advanced"]
  - label: "Feats"
    categories:
      - label: "Illusion Feats"
        tiers: ["feat"]
        excludeTags: ["combat","dual-sphere","surreal"]
      - label: "Combat Feats"
        tiers: ["feat"]
        tags: ["combat"]
      - label: "Dual Sphere Feats"
        tiers: ["feat"]
        tags: ["dual-sphere"]
      - label: "Surreal Feats"
        tiers: ["feat"]
        tags: ["surreal"]
---

[Illusion]

[Trick]

Illusion sphere abilities have a range of close, and unless stated otherwise, creatures who interact with an Illusion sphere ability may attempt a Will save to disbelieve.

All Illusion sphere effects are either a figment or a glamer.

**Figment:** Illusions or tricks cast on an area are called figments and are transparent when disbelieved. You may choose to believe or disbelieve your own figments at will. Figments are not subject to spell resistance. A figment may shed as much normal light as a torch and may cast a shadow.

A figment may be created anywhere within your maximum illusion range without the need of line of sight nor line of effect, but requires line of sight to be moved, directed, or have its appearance altered after creation. Figments can be moved at a speed of 20 feet + 5 feet per 5 caster levels per round and must remain within your maximum illusion range.

**Glamer:** Illusions or tricks cast on a creature or object are called glamers, and change the way the creature or object looks, smells, tastes, or otherwise interacts with the senses of others. The recipient of a glamer can see through the glamer and ignore its effects. Unwilling targets may attempt a Will save to resist a glamer being placed upon them, and glamers are subject to spell resistance.

Glamers remain on the creature or object they are placed upon regardless of how quickly the target moves or distance between them and the caster.

### Special Considerations

**Disbelief and Interaction:** When a creature interacts with an illusion, they may attempt a Will save to disbelieve. Generally speaking, simply observing an illusion is not enough; in order to 'interact' with an illusion a creature may spend a move action to carefully study the illusion. Additionally, any action that requires at least a move action and similarly engages directly with the illusion counts as interaction.

For example, if there were a figment of a dragon, a character who tried to attack the dragon would receive a saving throw to disbelieve, as would a character who spent 1 minute attempting a Diplomacy check on the dragon. A character who just traded witty banter with the dragon as a free action would not, nor would a character who simply cast spells on herself or her allies and never directly confronted the illusory dragon.

For a glamer, interacting generally works the same as for a figment, except that the interaction must be limited to something the glamer affects. For instance, grabbing a creature's ear would be an interaction for a human using disguise self to appear as an elf, but not for someone using a glamer to change their hair color. Similarly, visually studying someone would not grant a save against a glamer that purely changed their voice.

Additionally, if you or a creature who has made their saving throw against one of your illusions declares that the illusion is, indeed, an illusion, other creatures so informed gain an automatic saving throw against the illusion. While multiple declarations from multiple creatures can produce multiple saving throws, only one saving throw can be generated per illusion by any single creature; if a declaration was unconvincing, the same person simply insisting again is not helpful.

**Sustained Disbelief:** Allies do not automatically disbelieve your illusions, but if they have been informed about and are familiar with your particular artistry and illusion style they gain a +5 circumstance bonus to all saves made to disbelieve your illusions. You may suppress this bonus by changing your personal style if you so desire.

Creatures who successfully identify a sphere effect as belonging to the Illusion sphere as it is being cast, such as with a Spellcraft check or detect magic spell (or similar ability), also gain this +5 circumstance bonus to any Will saves made to disbelieve that illusion.

If the GM feels it is appropriate, a creature who has interacted with multiple illusions in a day (especially if they have come from the same illusionist), might gain this bonus as well, to reflect how they are looking for patterns and checking and double-checking everything in front of them to avoid being fooled 'again'. This bonus would not apply when taking 10, taking 20, and would disallow checking a location multiple times in a row; double-checking is reflected in the bonus.

**Multiple Senses:** By default, the only sense that can be affected by a basic illusion is sight. However, certain talents marked with (sensory) allow the caster to create illusions that also produce illusionary sound, taste, smell, or even touch.

The more complex an illusion is, the more talents it requires to be convincing, with the chart below serving as a guideline and the GM serving as the final arbiter for what talents are required to create a specific illusion. Creating an illusion without the necessary (sensory) talents often leads to disbelief; whenever a creature interacts with an illusion in a way that requires a (sensory) talent it does not possess, they may attempt a Will save to disbelieve with a +5 bonus. This bonus is cumulative for each missing (sensory) talent. This is in addition to simply learning the sensory experience is not there (for example, if a creature walks through an illusionary wall they will learn they can pass through that wall whether or not they discover the reason why is that the wall is illusionary).

If the GM deems it appropriate, certain other situations might allow a target to gain a similar +5 bonus to their Will saves (for example, a creature being damaged by illusionary 'fire' that is normally immune to fire damage).

**Table: Example Illusions**

| Example of Illusion | Additional Required Talents |
|---|---|
| An illusionary wall | Illusionary Touch (if felt) |
| A glen full of trees | Complex Illusion |
| A warrior blocking the target's way | Illusionary Sound, Illusionary Touch (to engage in combat with target) |
| A table laden with food | Illusionary Odor, Illusionary Touch (if consumed by target) |
| A room filled with fire | Illusionary Sound, Illusionary Touch |
| An army of orcs chasing the target | Complex Illusion, Illusionary Sound, Illusionary Touch (to engage in combat with target) |

**Cover and Concealment:** Figments and glamers provide concealment if they block line of sight. A figment of a wall, for example, would grant total concealment unless the attacker disbelieved the illusion, whereas a figment of fog would only grant partial concealment.

Glamers that are used to change the size of a creature to appear larger than it is grants a 10% miss chance for each size increase due to concealment. If a creature is glamered to appear larger and its larger size would provide a cover bonus to another target, it instead grants this same concealment bonus to miss chance.

Glamers and figments with the shadow descriptor which grant a miss chance or concealment also grant soft cover.

**Illusionary Creatures:** If creating an illusionary creature, your illusion has an attack bonus equal to your caster level + your casting ability modifier, and an AC and touch AC equal to 10 + its size modifier + 1/2 your caster level + your casting ability modifier. An illusionary creature may provide a flanking bonus against targets who fail to disbelieve it. Any creature who strikes an illusionary creature in combat (unless augmented by Illusionary Touch) receives the standard +5 circumstance bonus to disbelieve it, and any creature struck by the illusionary creature receives the same bonus (unless augmented by Illusionary Touch 2x). All actions that an illusionary creature performs must be contained within the figment of the illusion that created it, regardless of the size of the illusionary creature itself.

**Powerful Senses:** Senses such as see in darkness, x-ray vision, mistsight, or greensight that are designed to penetrate specific sorts of occlusion or display vision differently do not automatically interact with illusions the way they do unaltered reality, and thus tricking a character with such a sense is a difficult task, but not impossible. For example, when creating an illusionary wall to fool a creature with x-ray vision, one could create an illusion that 'looks' like a wall being looked through with x-ray vision. However, creating an illusion that would trick such senses can create obvious signs of trickery with those that do not possess that sight (for example, the illusion of a forest would look suspicious to a character with greensight if he could not see through it, but making the illusionary forest transparent would look suspicious to any of their allies who do not possess greensight). The Selective Illusions talent can be helpful in overcoming this problem in certain situations.

**Complex and Exotic Senses:** Illusions can foil all forms of perception, even unusual forms that a creature might possess.

Use the following list when dealing with unusual senses.

- **Blindsense:** Illusionary Odor and Illusionary Sound
- **Blindsight:** Illusionary Odor, Illusionary Sound, and Illusionary Touch
- **Detect Magic:** Manipulate Aura
- **Echolocation:** Illusionary Sound through air, Illusionary Touch through water
- **Scent or Keen Scent:** Illusionary Odor
- **Lifesense:** Manipulate Aura, Illusionary Touch
- **Thoughtsense or Detect Thoughts:** Implausible Deniability feat
- **Tremorsense:** Illusionary Touch

For figments, if you do not possess all of the indicated (sensory) talents required to convincingly create the illusion, creatures with that sense are automatically treated as interacting with your figment the first time the figment comes within range of that sense, and any Will save made to disbelieve the figment while within range of that sense is made with the standard +5 circumstance bonus for each missing talent.

For glamers, every sensory talent you lack to fool the listed sense causes the creature affected by that glamer to suffer a -2 penalty to any skill bonus or Disguise check granted by that glamer vs. that creature, and reduces any miss chance granted by the glamer by 10%. If the skill bonus or miss chance is reduced to zero, the creature may ignore all other effects of the glamer.

For Suppressions, if all senses that make up the complex sense are suppressed by the effect, the complex sense fails to penetrate that area.

### Illusion Talent Types

Some talents are marked (sensory). These talents allow you to create illusions that affect senses beyond sight, such as sound, taste, smell, or touch.
