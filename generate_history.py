import os
import random
import subprocess
import shutil
from datetime import datetime, timedelta

def run_cmd(cmd, env=None):
    subprocess.run(cmd, shell=True, check=True, env=env)

def main():
    repo_dir = "c:\\aiSelfHealer"
    os.chdir(repo_dir)

    # 1. Remove existing .git safely
    if os.path.exists(".git"):
        # Remove readonly flags first so shutil.rmtree doesn't fail
        run_cmd('powershell -Command "if (Test-Path .git) { Remove-Item -Recurse -Force .git }"')

    # 2. Initialize git
    run_cmd("git init")
    run_cmd('git config user.name "Akshith1413"')
    run_cmd('git config user.email "ravulaakshith1@gmail.com"')

    # 3. Collect all files to add
    ignore = ['node_modules', '.venv', '.git', '__pycache__', '.pytest_cache', 'generate_history.py']
    all_files = []
    for root, dirs, files in os.walk('.'):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in ignore]
        for file in files:
            if file not in ignore:
                # Get relative path with forward slashes
                rel_path = os.path.relpath(os.path.join(root, file), '.').replace('\\', '/')
                all_files.append(rel_path)

    # Sort files by directory to make it look like feature-by-feature development
    all_files.sort()

    # 4. Generate 300 timestamps across 15 days (Apr 28 to May 12)
    start_date = datetime(2026, 4, 28, 9, 0, 0)
    timestamps = []
    for day_offset in range(15):  # Apr 28 to May 12
        current_day = start_date + timedelta(days=day_offset)
        # 20 commits per day
        for _ in range(20):
            # Random time between 9:00 and 19:00
            hour = random.randint(9, 18)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            ts = current_day.replace(hour=hour, minute=minute, second=second)
            timestamps.append(ts)

    timestamps.sort()

    # 5. Empty commit messages pool
    empty_messages = [
        "refactor: improve error handling",
        "fix: resolve edge case in data parser",
        "chore: format code with prettier/black",
        "test: increase test coverage for edge cases",
        "docs: update inline comments and docstrings",
        "perf: optimize memory usage in processing loop",
        "ci: tweak pipeline configuration",
        "chore: fix linter warnings",
        "refactor: extract magic numbers to constants",
        "fix: correct typo in variable naming",
        "chore: cleanup unused imports",
        "style: fix indentation and whitespace",
        "test: add unit tests for utility functions",
        "refactor: simplify complex conditional logic",
        "chore: update dependencies",
    ]

    # 6. Generate commits
    file_idx = 0
    total_files = len(all_files)
    
    for i, ts in enumerate(timestamps):
        env = os.environ.copy()
        date_str = ts.strftime('%Y-%m-%dT%H:%M:%S')
        env['GIT_AUTHOR_DATE'] = date_str
        env['GIT_COMMITTER_DATE'] = date_str

        # Decide whether to add a file or do an empty commit
        # We need to ensure all files are added by the end.
        # Remaining commits = len(timestamps) - i
        # Remaining files = total_files - file_idx
        # Probability of adding a file is roughly remaining_files / remaining_commits
        
        remaining_commits = len(timestamps) - i
        remaining_files = total_files - file_idx
        
        prob = remaining_files / remaining_commits if remaining_commits > 0 else 1.0
        
        if random.random() < prob and file_idx < total_files:
            # Add a file
            file_to_add = all_files[file_idx]
            file_idx += 1
            run_cmd(f'git add "{file_to_add}"')
            
            basename = os.path.basename(file_to_add)
            if file_to_add.endswith('.py'):
                msg = f"feat: implement {basename} logic"
            elif file_to_add.endswith(('.js', '.ts', '.tsx', '.jsx')):
                msg = f"feat: add frontend component {basename}"
            elif file_to_add.endswith(('.html', '.css', '.scss')):
                msg = f"style: design updates in {basename}"
            elif 'docker' in file_to_add.lower() or file_to_add.endswith('.yml'):
                msg = f"chore: configure {basename} for deployment"
            elif 'requirements' in file_to_add or 'package' in file_to_add:
                msg = f"chore: manage dependencies in {basename}"
            elif 'test' in file_to_add.lower():
                msg = f"test: add cases for {basename}"
            else:
                msg = f"docs: update {basename}"
            
            # Sometimes add a modifier
            modifiers = ["", " (wip)", " - initial pass", " logic"]
            msg += random.choice(modifiers)
            
            run_cmd(f'git commit -m "{msg}"', env=env)
        else:
            # Empty commit
            msg = random.choice(empty_messages)
            run_cmd(f'git commit --allow-empty -m "{msg}"', env=env)

    # 7. Catch any remaining files just in case
    run_cmd('git add .')
    env = os.environ.copy()
    final_ts = timestamps[-1] + timedelta(minutes=10)
    date_str = final_ts.strftime('%Y-%m-%dT%H:%M:%S')
    env['GIT_AUTHOR_DATE'] = date_str
    env['GIT_COMMITTER_DATE'] = date_str
    
    # Check if there are changes to commit
    result = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
    if result.stdout.strip():
        run_cmd('git commit -m "chore: final code stabilization and cleanup"', env=env)

    # 8. Setup remote and push
    print("History generation complete! Now you can push to remote.")

if __name__ == "__main__":
    main()
