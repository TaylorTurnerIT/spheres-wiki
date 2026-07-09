import os
import re
import sys

summaries = {
    "advanced-tactics.md": "Roll 1d6 instead of 1d4 when using change tactics, with a chance to not expend skill leverage on success and guaranteed retention on failure.",
    "catchy-tune.md": "Delay the effects of a lyric for up to 1 hour per rank in Perform.",
    "deific-icon.md": "Create an artwork honoring your deity that grants bonuses to saving throws and skill checks, and potentially shares Obedience feat benefits.",
    "detailed-charting.md": "Analyze an area or target and apply pathing to a location in that area with the same standard action.",
    "dual-pathing.md": "Apply two pathing talents to an area at once.",
    "earthly-aptitude.md": "Automatically predict natural weather and gain immediate Knowledge checks to notice natural hazards or secret openings; add new methods and breakthroughs to theories.",
    "exceptional-discipline.md": "Permanently gain the effects of a single (control) talent, which can be suppressed or reactivated as a free action.",
    "extra-conspiracy-feature.md": "Gain the features of a class conspiracy that you do not have but already possess the base sphere for.",
    "extra-courser-venture.md": "Gain an additional courser venture.",
    "extra-envoy-flair.md": "Gain an additional envoy flair.",
    "extra-mastermind-trick.md": "Gain an additional mastermind trick.",
    "extra-skill-leverage.md": "Increase your skill leverage maximum by 2.",
    "extra-skill-talent.md": "Gain an additional skill sphere or skill talent.",
    "harmonizing-lyrics.md": "Allow your lyrics to stack with lyrics from other sources, and allow affected allies to impart lyric benefits to another creature for 1 round.",
    "improved-planning.md": "Have 2 additional plans available at once.",
    "industrious-engineer.md": "Use Field Repair as a swift action without tools or provoking attacks of opportunity for temporary hit points that last a limited duration, and allow Field Repair to heal constructs.",
    "instant-defensive-hack.md": "Outwit a creature to use hack magic as an immediate action to alter a magical effect that targets you or includes you in its area.",
    "judge-jury-executioner.md": "Substitute your Profession (barrister) ranks for your base attack bonus against a creature determined guilty by your crime sense, and deal bonus damage on your first hit each day against them.",
    "lingering-opening.md": "Dealing discerning strike or expose vulnerability damage leaves an opening, allowing you to deal extra precision damage on subsequent triggers in the same round.",
    "mystical-aptitude.md": "Begin a theory as a free action when identifying a magical technique or planar origin, and gain new methods and breakthroughs to theories.",
    "nebulous-preparation.md": "Leave a spell slot or extract unprepared as a plan to later finish preparing it as a full-round action.",
    "practiced-refinement.md": "Have an additional refined component active if it came from a favored enemy, and combine creature types during refinement.",
    "prepared-hacking.md": "Take a move action to prepare yourself to hack a magic effect, item, or trap as it activates.",
    "single-strike-mastery.md": "Once per round, increase the sneak attack damage dice by one size when using a standard attack action.",
    "societal-aptitude.md": "Recall a source of information when failing a Knowledge check, and gain new methods and breakthroughs to theories related to society and history.",
    "speculative-analysis.md": "Begin a theory as a free action when successfully analyzing a target, and gain an insight bonus to analyze checks against the subject based on the number of notions.",
    "terrain-adaptation.md": "Treat an analyzed area as your favored terrain, receiving the maximum bonuses your favored terrain feature grants.",
    "thaumic-retention.md": "Create an artwork that stores a magical sphere ability or spell, which is cast upon any creature that engages with the artwork.",
    "tug-the-heartstrings.md": "Impose a penalty to saves and checks on creatures that share a motivation you chose when creating an artwork or using a performance ability.",
    "utilitarian-dilettante.md": "Gain two bonus skill talents with the [utility] tag."
}

directory = "/home/taylort3450/ComputerScience/SpheresRemaster3/spheres-wiki/.worktrees/feat-summaries/src/content/spheres-of-guile/guile/feats/operative/"

for filename, summary in summaries.items():
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "summary:" in content:
        print(f"Summary already exists in {filename}")
        continue
        
    # Find the closing ---
    # The frontmatter is between the first --- and the second ---
    parts = content.split('---')
    if len(parts) >= 3:
        # parts[0] is empty or whitespace before the first ---
        # parts[1] is the frontmatter
        # parts[2] and beyond is the rest of the file
        
        # Add summary to frontmatter
        frontmatter = parts[1]
        
        # Avoid double quotes in the summary breaking the YAML string if any exist
        safe_summary = summary.replace('"', '\\"')
        
        # Check if it ends with a newline
        if not frontmatter.endswith('\n'):
            frontmatter += '\n'
            
        frontmatter += f'summary: "{safe_summary}"\n'
        
        # Reconstruct the file
        new_content = parts[0] + '---' + frontmatter + '---' + '---'.join(parts[2:])
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filename}")
    else:
        print(f"Could not parse frontmatter in {filename}")

