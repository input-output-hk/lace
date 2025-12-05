#!/usr/bin/env python3
"""
ClaudeKit Help Command - All-in-one guide with dynamic command discovery.
Scans .claude/commands/ directory to build catalog at runtime.

Usage:
    python ck-help.py                    # Overview with quick start
    python ck-help.py fix                # Category guide with workflow
    python ck-help.py plan:fast          # Command details
    python ck-help.py debug login error  # Task recommendations
    python ck-help.py auth               # Search (unknown word)
"""

import sys
import re
import io
from pathlib import Path

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


# Task keyword mappings for intent detection
TASK_MAPPINGS = {
    "fix": ["fix", "bug", "error", "broken", "issue", "debug", "crash", "fail", "wrong", "not working"],
    "plan": ["plan", "design", "architect", "research", "think", "analyze", "strategy", "how to", "approach"],
    "cook": ["implement", "build", "create", "add", "feature", "code", "develop", "make", "write"],
    "bootstrap": ["start", "new", "init", "setup", "project", "scaffold", "generate", "begin"],
    "test": ["test", "check", "verify", "validate", "spec", "unit", "integration", "coverage"],
    "docs": ["document", "readme", "docs", "explain", "comment", "documentation"],
    "git": ["commit", "push", "pr", "merge", "branch", "pull", "request", "git"],
    "design": ["ui", "ux", "style", "layout", "visual", "css", "component", "page", "responsive"],
    "review": ["review", "audit", "inspect", "quality", "refactor", "clean"],
    "content": ["copy", "text", "marketing", "content", "blog", "seo"],
    "integrate": ["integrate", "payment", "api", "connect", "webhook", "third-party"],
    "skill": ["skill", "agent", "automate", "workflow"],
    "scout": ["find", "search", "locate", "explore", "scan", "where"],
}

# Category workflows and tips
CATEGORY_GUIDES = {
    "fix": {
        "title": "Fixing Issues",
        "workflow": [
            ("Start", "`/fix` \"describe your issue\""),
            ("If stuck", "`/debug` \"more details\""),
            ("Verify", "`/test`"),
        ],
        "tip": "Include error messages for better results",
    },
    "plan": {
        "title": "Planning",
        "workflow": [
            ("Quick plan", "`/plan:fast` \"your task\""),
            ("Deep research", "`/plan:hard` \"complex task\""),
            ("Execute plan", "`/code` (runs the plan)"),
        ],
        "tip": "After /plan, use /code to execute - NOT /cook",
    },
    "cook": {
        "title": "Implementation",
        "workflow": [
            ("Quick impl", "`/cook` \"your feature\""),
            ("Auto mode", "`/cook:auto` \"trust me bro\""),
            ("Test", "`/test`"),
        ],
        "tip": "Cook is standalone - it plans internally. Use /plan → /code for explicit planning",
    },
    "bootstrap": {
        "title": "Project Setup",
        "workflow": [
            ("Quick start", "`/bootstrap:auto:fast` \"requirements\""),
            ("Full setup", "`/bootstrap` \"detailed requirements\""),
        ],
        "tip": "Include tech stack preferences in description",
    },
    "test": {
        "title": "Testing",
        "workflow": [
            ("Run tests", "`/test`"),
            ("Fix failures", "`/fix:test`"),
        ],
        "tip": "Run tests frequently during development",
    },
    "docs": {
        "title": "Documentation",
        "workflow": [
            ("Initialize", "`/docs:init`"),
            ("Update", "`/docs:update`"),
        ],
        "tip": "Keep docs close to code for accuracy",
    },
    "git": {
        "title": "Git Workflow",
        "workflow": [
            ("Commit", "`/git:cm`"),
            ("Push", "`/git:cp`"),
            ("PR", "`/git:pr`"),
        ],
        "tip": "Commit often with clear messages",
    },
    "design": {
        "title": "Design",
        "workflow": [
            ("Quick design", "`/design:fast` \"description\""),
            ("From screenshot", "`/design:screenshot` <path>"),
            ("3D design", "`/design:3d` \"description\""),
        ],
        "tip": "Reference existing designs for consistency",
    },
    "review": {
        "title": "Code Review",
        "workflow": [
            ("Full review", "`/review:codebase`"),
        ],
        "tip": "Review before merging to main",
    },
    "content": {
        "title": "Content Creation",
        "workflow": [
            ("Quick copy", "`/content:fast` \"requirements\""),
            ("Quality copy", "`/content:good` \"requirements\""),
            ("Optimize", "`/content:cro`"),
        ],
        "tip": "Know your audience before writing",
    },
    "integrate": {
        "title": "Integration",
        "workflow": [
            ("Polar.sh", "`/integrate:polar`"),
            ("SePay", "`/integrate:sepay`"),
        ],
        "tip": "Read API docs before integrating",
    },
    "skill": {
        "title": "Skill Management",
        "workflow": [
            ("Create", "`/skill:create`"),
            ("Optimize", "`/skill:optimize`"),
        ],
        "tip": "Skills extend agent capabilities",
    },
    "scout": {
        "title": "Codebase Exploration",
        "workflow": [
            ("Find files", "`/scout` \"what to find\""),
            ("External tools", "`/scout:ext` \"query\""),
        ],
        "tip": "Be specific about what you're looking for",
    },
}


def detect_prefix(commands_dir: Path) -> str:
    """Detect if commands use /ck: prefix based on directory structure."""
    ck_commands_dir = commands_dir / "ck"
    return "ck:" if ck_commands_dir.exists() and ck_commands_dir.is_dir() else ""


def parse_frontmatter(file_path: Path) -> dict:
    """Parse YAML frontmatter from a markdown file."""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return {}

    # Check for frontmatter
    if not content.startswith('---'):
        return {}

    # Find closing ---
    end_idx = content.find('---', 3)
    if end_idx == -1:
        return {}

    frontmatter = content[3:end_idx].strip()
    result = {}

    for line in frontmatter.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            result[key.strip()] = value.strip()

    return result


def discover_commands(commands_dir: Path, prefix: str) -> dict:
    """Scan .claude/commands/ and build command catalog."""
    commands = {}
    categories = {}

    if not commands_dir.exists():
        return {"commands": commands, "categories": categories}

    # Scan all .md files
    for md_file in commands_dir.rglob("*.md"):
        # Skip non-command files
        rel_path = md_file.relative_to(commands_dir)
        parts = rel_path.parts

        # Get command name from path
        # e.g., fix/fast.md -> fix:fast, plan.md -> plan
        if len(parts) == 1:
            # Root command: plan.md -> plan
            cmd_name = parts[0].replace('.md', '')
            category = "core"
        else:
            # Nested command: fix/fast.md -> fix:fast
            category = parts[0]
            cmd_name = ':'.join([p.replace('.md', '') for p in parts])

        # Parse frontmatter
        fm = parse_frontmatter(md_file)
        description = fm.get('description', '')

        # Skip if no description (not a real command)
        if not description:
            continue

        # Clean description (remove emoji indicators)
        clean_desc = re.sub(r'^[^\w\s]+\s*', '', description).strip()

        # Format command name with prefix
        formatted_name = f"/{prefix}{cmd_name}" if prefix else f"/{cmd_name}"

        # Add to commands
        if category not in commands:
            commands[category] = []

        commands[category].append({
            "name": formatted_name,
            "description": clean_desc,
            "category": category,
        })

        # Track categories
        if category not in categories:
            categories[category] = category.title()

    # Sort commands within each category
    for cat in commands:
        commands[cat].sort(key=lambda x: x["name"])

    return {"commands": commands, "categories": categories}


def detect_intent(input_str: str, categories: list) -> str:
    """Smart auto-detection of user intent."""
    if not input_str:
        return "overview"

    input_lower = input_str.lower()

    # Check if it's a known category
    if input_lower in [c.lower() for c in categories]:
        return "category"

    # Check if it looks like a command (has colon)
    if ':' in input_str:
        return "command"

    # Multiple words = task description
    if len(input_str.split()) >= 2:
        return "task"

    return "search"


def show_overview(data: dict, prefix: str) -> None:
    """Display overview with quick start guide."""
    commands = data["commands"]
    categories = data["categories"]
    total = sum(len(cmds) for cmds in commands.values())
    help_cmd = f"/{prefix}ck-help" if prefix else "/ck-help"

    print("# ClaudeKit Commands")
    print()
    print(f"{total} commands across {len(categories)} categories.")
    print()
    print("**Quick Start:**")
    print(f"- `/{prefix}cook` - Implement features (standalone)")
    print(f"- `/{prefix}plan` + `/{prefix}code` - Plan then execute")
    print(f"- `/{prefix}fix` - Fix bugs intelligently")
    print(f"- `/{prefix}test` - Run and analyze tests")
    print()
    print("**Categories:**")
    for cat_key in sorted(categories.keys()):
        count = len(commands.get(cat_key, []))
        print(f"- `{cat_key}` ({count})")
    print()
    print("**Usage:**")
    print(f"- `{help_cmd} <category>` - Category guide with workflow")
    print(f"- `{help_cmd} <command>` - Command details")
    print(f"- `{help_cmd} <task description>` - Recommendations")


def show_category_guide(data: dict, category: str, prefix: str) -> None:
    """Display category guide with workflow and tips."""
    categories = data["categories"]
    commands = data["commands"]

    # Find matching category (case-insensitive)
    cat_key = None
    for key in categories:
        if key.lower() == category.lower():
            cat_key = key
            break

    if not cat_key:
        print(f"Category '{category}' not found.")
        print()
        print("Available: " + ", ".join(f"`{c}`" for c in sorted(categories.keys())))
        return

    cmds = commands.get(cat_key, [])
    guide = CATEGORY_GUIDES.get(cat_key, {})

    print(f"# {guide.get('title', cat_key.title())}")
    print()

    # Workflow first (most important)
    if "workflow" in guide:
        print("**Workflow:**")
        for step, cmd in guide["workflow"]:
            print(f"- {step}: {cmd}")
        print()

    # Commands list
    print("**Commands:**")
    for cmd in cmds:
        print(f"- `{cmd['name']}` - {cmd['description']}")

    # Tip at the end
    if "tip" in guide:
        print()
        print(f"*Tip: {guide['tip']}*")


def show_command(data: dict, command: str, prefix: str) -> None:
    """Display command details."""
    commands = data["commands"]

    # Normalize search term
    search = command.lower().replace("/ck:", "").replace("/", "").replace(":", "")

    found = None
    for cmds in commands.values():
        for cmd in cmds:
            # Normalize command name for comparison
            name = cmd["name"].lower().replace("/ck:", "").replace("/", "").replace(":", "")
            if name == search:
                found = cmd
                break
        if found:
            break

    if not found:
        print(f"Command '{command}' not found.")
        print()
        do_search(data, command.replace(":", " "), prefix)
        return

    print(f"# `{found['name']}`")
    print()
    print(found['description'])
    print()
    print(f"**Category:** {found['category']}")
    print()
    print(f"**Usage:** `{found['name']} <your-input>`")

    # Show related commands (same category)
    cat = found['category']
    if cat in commands:
        related = [c for c in commands[cat] if c['name'] != found['name']][:3]
        if related:
            related_names = ", ".join(f"`{r['name']}`" for r in related)
            print()
            print(f"**Related:** {related_names}")


def do_search(data: dict, term: str, prefix: str) -> None:
    """Search commands by keyword."""
    commands = data["commands"]
    term_lower = term.lower()
    matches = []

    for cmds in commands.values():
        for cmd in cmds:
            if term_lower in cmd["name"].lower() or term_lower in cmd["description"].lower():
                matches.append(cmd)

    if not matches:
        print(f"No commands found for '{term}'.")
        print()
        print("Try browsing categories: " + ", ".join(f"`{c}`" for c in sorted(data["categories"].keys())))
        return

    print(f"# Search: {term}")
    print()
    print(f"Found {len(matches)} matches:")
    for cmd in matches[:8]:
        print(f"- `{cmd['name']}` - {cmd['description']}")


def recommend_task(data: dict, task: str, prefix: str) -> None:
    """Recommend commands for a task description."""
    commands = data["commands"]
    task_lower = task.lower()

    # Score categories by keyword matches
    scores = {}
    for cat, keywords in TASK_MAPPINGS.items():
        score = sum(1 for kw in keywords if kw in task_lower)
        if score > 0:
            scores[cat] = score

    if not scores:
        print(f"Not sure about: {task}")
        print()
        print("Try being more specific, or browse categories: " + ", ".join(f"`{c}`" for c in sorted(data["categories"].keys())))
        return

    sorted_cats = sorted(scores.items(), key=lambda x: -x[1])
    top_cat = sorted_cats[0][0]
    guide = CATEGORY_GUIDES.get(top_cat, {})

    print(f"# Recommended for: {task}")
    print()

    # Show workflow first (most actionable)
    if "workflow" in guide:
        print("**Workflow:**")
        for step, cmd in guide["workflow"][:3]:
            print(f"- {step}: {cmd}")
        print()

    # Show relevant commands
    print("**Commands:**")
    shown = 0
    for cat, _ in sorted_cats[:2]:
        if cat in commands:
            for cmd in commands[cat][:2]:
                print(f"- `{cmd['name']}` - {cmd['description']}")
                shown += 1
                if shown >= 4:
                    break
        if shown >= 4:
            break

    if "tip" in guide:
        print()
        print(f"*Tip: {guide['tip']}*")


def main():
    # Find .claude/commands directory
    script_path = Path(__file__).resolve()
    claude_dir = script_path.parent.parent  # .claude/scripts -> .claude
    commands_dir = claude_dir / "commands"

    if not commands_dir.exists():
        print("Error: .claude/commands/ directory not found.")
        sys.exit(1)

    # Detect prefix and discover commands
    prefix = detect_prefix(commands_dir)
    data = discover_commands(commands_dir, prefix)

    if not data["commands"]:
        print("No commands found in .claude/commands/")
        sys.exit(1)

    # Parse input
    args = sys.argv[1:]
    input_str = " ".join(args).strip()

    # Detect intent and route
    intent = detect_intent(input_str, list(data["categories"].keys()))

    if intent == "overview":
        show_overview(data, prefix)
    elif intent == "category":
        show_category_guide(data, input_str, prefix)
    elif intent == "command":
        show_command(data, input_str, prefix)
    elif intent == "task":
        recommend_task(data, input_str, prefix)
    else:
        do_search(data, input_str, prefix)


if __name__ == "__main__":
    main()
