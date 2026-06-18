---
id: card-casting
name: "Card Casting"
repeat:
  max: 3
choices:
  - id: card-casting-core
    label: Card Casting core modifications
    selector: drawback
    max: 3
    options:
      - id: cooldown
        label: Cooldown
        addsDrawbackValue: 1
      - id: mana-pool
        label: Mana Pool
        addsDrawbackValue: 1
      - id: mana-graveyard
        label: Mana Graveyard
        addsDrawbackValue: 1
        requires:
          all:
            - choice: cooldown
            - choice: mana-pool
  - id: card-casting-secondary
    label: Card Casting secondary modifications
    selector: drawback
    options:
      - id: bleeding-hand
        label: Bleeding Hand
        addsDrawbackValue: 1
      - id: bleeding-hand-2
        label: Bleeding Hand x2
        addsDrawbackValue: 1
        requires:
          choice: bleeding-hand
      - id: deckout
        label: Deckout
        addsDrawbackValue: 1
        requires:
          choice: cooldown
      - id: exposed-grip
        label: Exposed Grip
        addsDrawbackValue: 1
        requires:
          choice: cooldown
      - id: gradual-ramp
        label: Gradual Ramp
        addsDrawbackValue: 1
        requires:
          choice: mana-pool
      - id: lifebound-deck
        label: Lifebound Deck
        addsDrawbackValue: 1
      - id: singleton
        label: Singleton
        addsDrawbackValue: 1
        requires:
          choice: cooldown
      - id: stagnant-pool
        label: Stagnant Pool
        addsDrawbackValue: 1
        requires:
          all:
            - choice: mana-pool
            - not:
                choice: mana-graveyard
      - id: strikable-assets
        label: Strikable Assets
        addsDrawbackValue: 1
      - id: tight-hand
        label: Tight Hand
        addsDrawbackValue: 1
  - id: card-casting-colored-mana
    label: Card Casting colored mana
    selector: drawback
    max: 1
    options:
      - id: colored-mana
        label: Colored Mana
        addsDrawbackValue: 1
        requires:
          all:
            - choice: mana-pool
            - not:
                drawback: prepared-caster
      - id: colored-mana-five-colors
        label: Colored Mana (five colors)
        addsDrawbackValue: 2
        requires:
          all:
            - choice: mana-pool
            - not:
                drawback: prepared-caster
---
You cannot use abilities that cost 1 or more spell points through normal means. Instead, your magical abilities are allocated to you at random, limiting what you are capable of doing at any given moment.

<details><summary>More Information</summary>

For every effect you are capable of creating that costs one or more spell points (every companion you can summon with the Conjuration sphere, every possible destructive blast you can create with the Destruction sphere, every word or consecration you can make with the Fate sphere, every combination of traits you can have with the Alteration sphere, every method of using the Counterspell feat, etc.), write down the effect on a notecard (or assign that effect to a specific card in a deck such that the assignments are known to the whole table) and shuffle as many of these cards as you wish together into a deck. You may choose not to write down certain ability combinations that you don't think you will use, although you may only change what cards make up your deck when you rest to regain spell points. Effects altered only by range or duration (such as those affected by [mass] talents) or by the number of spell points spent (such as charms or increasing the damage of a destructive blast) do not constitute unique effects and talents of this sort can be applied to any appropriate card you draw. Effects modified by metamagic feats are considered distinct effects, so an effect must have any applied metamagic effects determined as part of creating its card.

When you rest to recover your spell points, create a deck composed of the above cards. The deck you create must have a minimum of 20 cards. You can include the same card multiple times in your deck if you wish, but the maximum number of cards in your deck which create an identical effect cannot differ from the lowest number of identical effect cards in the deck by more than your casting ability modifier (for example, if you have a casting ability modifier of 4 and run only a single card which creates a haste effect in your deck, you could not run more than 5 cards which create a slow effect).

When you roll for initiative, you draw a number of cards from the top of your deck equal to 1 + your casting ability modifier (minimum 2). If you wish, you may shuffle your starting hand back into your deck and re-draw it any number of times, drawing 1 fewer card each time you do (you cannot shuffle and re-draw if you have only 1 card in your hand). At the start of every round thereafter, you draw another card. If you have no cards in your deck, you cannot draw any more cards. At the end of the combat encounter, shuffle all cards currently in your hand back into your deck.

In order to create a magic effect that costs spell points, you must have the card corresponding to that effect in your hand. When you create the effect, you play the card onto the table. This requires the normal action and spell point costs to cast the spell. If that spell has an ongoing effect, the card remains placed on the table for the duration of the effect. When a card's effects have been fully resolved (immediately for a card with an instantaneous effect, or when the effect expires for an ongoing effect) that card is shuffled back into your deck.

While outside of a combat encounter you do not have a hand of cards and you cannot draw cards. Instead, you may search your deck and cast one of those cards by adding 1 minute to the card's normal casting time. Cards with ongoing effects are placed on the table for their duration, as normal.

You may take this Drawback a second time. If you choose to, you gain the effects of either the Cooldown or Mana Pool abilities (see below). If you select it a third time, you gain both. When you gain both the Cooldown and Mana Pool abilities, you can choose to gain the Mana Graveyard ability as well.

Card Casting counts as 1 Drawback for the purposes of boons if taken normally, 2 Drawbacks if taken with either Cooldown or Mana Pool, 3 Drawbacks if taken with both, and 4 Drawbacks if you additionally take the Mana Graveyard ability.

**Cooldown** 
Your card magic is more limited than other card casters, your spent effects requiring effort on your part to recover their effects. When one of your card's effects is resolved, rather than being shuffled into your deck those cards are added to a discard pile. At the end of the combat encounter, shuffle your discard pile into your deck along with your hand. By spending a full-round action, you may shuffle all cards in your discard pile back into your deck. If ever your deck runs out of cards, you may shuffle your discard pile back into your deck as a free action, even if it isn't your turn. If the effects of one of your cards resolves while you are outside of combat, it is shuffled into your deck instead of being added to the discard pile.

**Mana Pool** 
The power to cast your cards must be built up through the course of combat, rather than it coming to you immediately like other card casters. Your ability to play cards from your deck is limited by Mana Point cards. When you create your deck, add as many Mana Point cards to your deck as you wish. Mana Point cards count towards the minimum 20 cards required to create a deck. When you draw a Mana Point card, you immediately place it on the table. At the end of the combat encounter, shuffle your Mana Point cards into your deck along with your hand. To cast a card, you must have at least as many Mana Point cards on the table as its spell point cost. Cards you cast outside of combat are not limited by this ability.

**Mana Graveyard** 
Your cards are even more difficult to play than the most limited of card casters. To cast one of your cards, you must discard Mana Point cards from the table equal to the number of spell points spent on the effect.

Outside of these options, if you have the Card Casting drawback you may select one or more of the following additional modifications if you meet those modification's prerequisites. Each modification you take is treated as if you had selected an additional drawback when determining your boons.

**Bleeding Hand**
**Prerequisite:** none
Whenever you take a standard or full-round action that does not involve playing or discarding a card from your hand, you must discard a card from your hand. You may select this modification a second time, in which case you must discard a card whenever you take a standard, full-round, move, swift, or immediate action that does not involve playing a card from your hand. If you do not possess the Cooldown modification, cards discarded from these modifications are shuffled into your deck.

**Colored Mana**
**Prerequisite:** Mana Pool ability
Your Mana Point Cards are restricted by color. For each mana point card in your deck, assign it a specific color such that you have either three or five colors. For each card in your deck which creates a magic effect, assign it a color. Mana point cards only grant spell points for use with magic effects of a matching color, and provide no spell points for effects of other colors. If you have three colors in your deck, no more than half of your magic effects can be of a single color, and you must have at least one magic effect of each color in your deck. If you have five colors in your deck, no more than one fourth of your magic effects can be of a single color, and you must have at least one magic effect of each color in your deck. 
**Special:** If you select five colors, this modification counts as two drawbacks rather than one when determining your boons.
**Incompatible:** Prepared Caster

**Deckout**
**Prerequisite:** Cooldown ability 
Your deck is connected to your life force, and exhausting it can have fatal consequences. You cannot spend an action to shuffle all cards in your discard pile back into your deck, nor do you shuffle your discard pile back into your deck if your deck runs out of cards. Every turn that you have no cards left in your deck, you take 4 points of Constitution burn, or Charisma burn if you lack a Constitution score. Reduction of either score to 0 immediately kills you.

**Exposed Grip**
**Prerequisites:** Cooldown ability
You do not draw a card at the start of your turn, but may spend a move, swift, or standard action to draw a card. In addition, whenever you are hit with an attack or fail a saving throw, you must discard a card from your hand. If you have no cards in your hand to discard when this effect occurs, you instead take 4 points on Constitution burn.

**Gradual Ramp**
**Prerequisite:** Mana Pool ability
You may only play one Mana Point Card from your hand per round

**Lifebound Deck**
**Prerequisite:** none
Your deck's integrity is tied to your magic. You gain three separate discard piles in addition to your normal discard pile known as the Stun, Wounds, and Death piles. Calculate a value known as your Lifebound value, which is equal to 1/3 your total hit points divided by the number of cards in your deck at the start of the day (minimum 1). Whenever you lose hit points equal to or in excess of your Lifebound value, perform the topmost of the following actions that you are currently capable of performing. For each multiple of your Lifebound value that you lose, repeat the process (for example, if your Lifebound value is 6 and you lose 20 hit points, you perform the process 3 times).
* Move a card from the Wounds pile to the Death Pile
* Move a card from the Stun pile to the Wounds pile
* Move the top card from your deck to the Stun pile
* Move a card from your hand to the Stun pile

Whenever you heal damage equal to or in excess of your Lifebound value, perform the topmost of the following actions that you are currently capable of performing. For each multiple of your Lifebound value that you heal, repeat the process (for example, if your Lifebound value is 6 and you heal 20 damage, you perform the process 3 times).
* Move a card from the Death pile to the Wounds Pile
* Move a card from the Wounds pile to the Stun pile
* Shuffle a card from your Stun pile back into your deck

When you rest to regain spell points, remove all cards from your Stun, Death, and Wounds piles. Effects that allow you to interact with your discard pile or that count cards in your discard pile do not count cards in your Stun, Death, and Wounds piles

**Singleton**
**Prerequisite:** Cooldown ability 
You may only have one copy of each card in your deck, although you may still have multiple copies of mana point cards which are unaffected by the Specialized Mana Cards deck manipulation.

**Stagnant Pool**
**Prerequisite:** Mana Pool ability
The number of Mana Point Cards in play is the number of spell points you may spend each round. For every spell point you spend, turn one of these Mana Point Cards sideways, indicating that it has been used for the round and no longer counts towards the number of spell points you may spend. Turn all of these cards back to normal at the start of your next turn.
**Incompatible:** Mana Graveyard

**Strikable Assets**
**Prerequisites:** none
Your hand of cards, deck, and discard pile all manifest as physical objects on your person that can be attacked as if they were worn items. Any damage dealt to any of these targets is instead dealt to you, and successful attacks made against these targets also reveal information. Whenever you are successfully attacked or fail a saving throw, one of the effects below triggers randomly (with the discard pile effect not triggering if you have no discard pile).
* If an attack is successfully made against your hand of cards, you reveal one card from your hand at random to all hostile creatures in the encounter.
* If an attack is successfully made against your deck, reveal the top card of your deck to all hostile creatures in the encounter.
* If an attack is successfully made against your discard pile, reveal the cards of your discard pile to all hostile creatures in the encounter.

**Tight Hand**
**Prerequisites:** none
Your maximum hand size is reduced to 3. If you have 3 cards in hand, you cannot draw any more cards. If you would draw cards such that you would have more than 3 cards in hand, you instead draw until you have 3 cards in hand. For each time you select the Loaded Hand deck manipulation, the number of cards you may have in your hand increases by 1.

**Card Casting and Temporary Talents**
If you have the Card Casting Drawback and would gain temporary magic talents, you create any number of new cards detailing the effects that can be created using that temporary talent. If you are in combat, you immediately add one of these cards of your choice to your hand, and shuffle the remainder into your deck. 

Outside of combat, you add those cards to your deck. Additionally, if the duration of the temporary talent is 1 minute or less you may cast one of those cards without increasing its casting time by 1 minute.

When the temporary talent is lost, search your deck and hand for the cards that include the effects of the temporary talent, remove them from your deck and hand, and then shuffle your deck.

**Note:** It is advisable to have cards for temporary talents pre-prepared to not slow the game down. This can be most easily done by having blank but otherwise marked cards (such as blank cards marked 1 through 10) that you can add to your deck, and then writing the effects of each of those cards on a notecard each time you gain a temporary talent.

###### Creating and Using a Deck
Card Casting poses a unique challenge for Pathfinder by introducing an element to the game which normally isn't utilized, that being a deck of cards on which the character bases their abilities. There are number of different solutions which can be implemented depending on the specific needs of the player and table, with a few options presented below.

**Corresponding Cards:** The quickest and easiest solution for creating a card casting deck is taking an existing deck of cards (real or virtual) and having each card in the deck correspond to a specific Card Casting effect, writing down each correspondence on a separate notesheet and altering the number of cards in the deck to match the number in your character's Card Casting deck. For example, you could write that the Jack of Diamonds corresponds to a Spell Ward aegis, the Queen of Clubs corresponds to a Mana Point Card with Mana Rock, and the Two of Spades corresponds to a destructive blast that uses Explosive Orb and Reverberating Blast in conjunction with the Empower Spell metamagic feat. Abilities that allow you to draw, play, or discard cards from your Card Casting deck would be matched by you doing the same with this corresponding deck.

**Notecards:** Assembling a deck's worth of notecards and writing down appropriate Card Casting effects on each notecard is another option. The notecards can be shuffled and manipulated in the same manner of normal cards, and can be swapped out or rewritten as needed as a character's deck changes over the course of a campaign.

**Virtual Custom Decks:** A number of collectible card game fans have created tools for making custom cards, and resources like MTGNexus and Magic Set Editor allow for the easy creation of cards for Card Casting. These cards can then be imported into most virtual tabletops, allowing for their use in online tables. Importing these custom card images into flash card apps or card game simulator apps similarly allows for their use at a physical table through a phone or laptop.  

**Physical Custom Decks:** Players who wish for custom physical decks for their card casting character have plenty of options, depending on how much money they wish to spend. Placing pieces of paper with written text in a card sleeve with an existing card is a classic strategy for "proxying", while websites such as makeplayingcards.com allow for the printing and delivery of custom playing cards. For more reusable physical cards that don't rely on proxying, dry-erase or wet-erase blank cards can be used for a Card Casting deck and adjusted as needed.

**Contents of a Magic Effect Card**
When creating a magic effect card for a Card Casting deck, there are certain key points of information which need to be written on the card to denote the effect. The following section lists the relevant info for a card and provides templates and examples for creating magic effect cards

**Vital Information**
This information is the most important to the magic effect card's function 
* **Spell Point Cost:** the amount of spell points which the ability on the card costs, or the range of the spell point costs if decisions made during the casting can alter the number of spell points spent. This listed amount does not necessarily need to list additional expenditures from (mass) talents or other effects which can be applied as part of casting.
* **Talents/Feats/Class Abilities used:** any abilities which are incorporated as part of the card's effects when the card is made. This section does not necessarily need to list additional effects such as (range) talents, expenditures from (mass) talents, or other effects which can be applied as part of casting
* **Color/Colors:** If a character uses the Colored Mana drawback, they must write down the color or colors of the effect.

**Helpful Information**
This information isn't necessary, but may prove useful to players
* **Spell Point Expenditures:** An index of where the spell point costs of the effect all come from, used to more easily determine the cost.
* **Caster Level:** The effect's caster level, for easier calculation. May not be applicable in situations where the card's caster level may be variable, such as when cards are used as part of the Multi-Headed Play feat.
* **DCs:** Writing down DCs for skill checks, MSB checks, or saving throws related to a card's effects may prove useful, although these are subject to the same stipulations as caster level.
* **Number of Targets**
* **Casting Time:** Writing down the casting time or any potential casting time modifications can make an effect card easier to use.

**Flavorful Information**
Players may wish to add additional information to their cards for flair, potentially replicating styles from existing cards
* **Effect Name:** A utilitarian or stylish name for the effect
* **Image:** A picture which depicts or evokes the effect
* **Flavor Text:** Some extra text which describes the effect's origins or impact

</details>
