import json

summaries = {
  "barons-otherworldly-citadel/champions/feats/champion/rapier-wit.md": "Outwit a target as a cost to perform a feint or demoralize them as part of a quip, and spend martial focus to ignore penalties from previous uses.",
  "barons-otherworldly-citadel/champions/feats/champion/shock-to-senses.md": "End the battered condition on a target as a cost to outwit them.",
  "barons-otherworldly-citadel/might/feats/practitioner/brutal-shatter.md": "Spend martial focus to make a sunder attempt a brutal strike when using a swift action or attack of opportunity.",
  "barons-otherworldly-citadel/might/feats/practitioner/deceptive-boast.md": "Perform a feint against a target as a boast.",
  "barons-otherworldly-citadel/might/feats/practitioner/erratic-vital-strike.md": "Roll a die to determine how many instances of a weapon's base damage dice you gain when using Vital Strike instead of a fixed multiplier.",
  "barons-otherworldly-citadel/might/feats/practitioner/onslaught-conversion.md": "Spend a move action to make a single attack at a -5 penalty if you miss all attacks made as an attack action.",
  "barons-otherworldly-citadel/might/feats/practitioner/opportunistic-vital-strike.md": "Apply Vital Strike to an attack of opportunity once per round, and attempt a free combat maneuver on a critical hit.",
  "barons-otherworldly-citadel/might/feats/practitioner/prescient-reflexes.md": "Gain additional attacks of opportunity equal to your Wisdom bonus and make them while flat-footed.",
  "barons-otherworldly-citadel/might/feats/practitioner/ruthless-sneak.md": "Deal additional damage per sneak attack die when dealing sneak attack damage while maintaining martial focus.",
  "barons-otherworldly-citadel/power/feats/combat/severing-critical.md": "Temporarily prevent a spellcaster from casting spells or using magical abilities when you confirm a critical hit against them.",
  "barons-otherworldly-citadel/power/feats/deck/alternate-win-condition-improved.md": "Increase the aristeia level you may enter using Alternate Win Condition to your normal maximum.",
  "barons-otherworldly-citadel/power/feats/deck/alternate-win-condition.md": "Spend spell points to enter aristeia level 1 by meeting specific niche conditions without spending a hero point.",
  "barons-otherworldly-citadel/power/feats/deck/rainbow-efficiency-improved.md": "Assign a third (and potentially fourth and fifth) color to a magic effect card to further reduce its spell point cost.",
  "barons-secluded-library/champions/feats/champion/amplifying-adjustment.md": "Apply an (amp) talent as part of the same action when applying a (hack) talent to a magic effect or item.",
  "barons-secluded-library/champions/feats/champion/dream-team.md": "Summon magical simulacra known as dream retainers into your dreamspace using authorizations.",
  "barons-secluded-library/champions/feats/champion/long-range-mapping.md": "Reveal a plan to treat yourself as one step more familiar with a target or location when using familiarity-based magic.",
  "barons-secluded-library/champions/feats/champion/raging-lucidity.md": "Ignore the AC penalty from berserking or raging abilities as long as you have a meditation active.",
  "barons-secluded-library/champions/feats/champion/spell-maneuver.md": "Attempt a combat maneuver in place of a weapon attack when using a strike talent, delivering the magic effect on a success.",
  "barons-secluded-library/champions/feats/champion/surefire-coordination.md": "Allow participants in a multi-character technique with this feat to roll on d20s and use the highest result.",
  "barons-secluded-library/champions/feats/champion/theorized-momentum.md": "Spend notions from your current theory in place of momentum points when the effect applies to the subject of your theory."
}

import os
base_path = "/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content"

for rel_path, summary in summaries.items():
    full_path = os.path.join(base_path, rel_path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
    
    with open(full_path, "r") as fp:
        content = fp.read()
        
    parts = content.split('---', 2)
    if len(parts) >= 3:
        frontmatter = parts[1]
        if not frontmatter.endswith('\n'):
            frontmatter += '\n'
        new_frontmatter = frontmatter + f'summary: "{summary}"\n'
        new_content = parts[0] + '---' + new_frontmatter + '---' + parts[2]
        with open(full_path, "w") as fp:
            fp.write(new_content)
        print(f"Injected {rel_path}")

