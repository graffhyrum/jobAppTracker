---
description: Sync changelog with git history using changesets
---

# Changelog Sync with Changesets

You are tasked with updating the project changelog based on git history using the changesets tool.

## Prerequisites Check

**IMPORTANT**: First, verify that the `@changesets/cli` package is installed:

1. Check if `@changesets/cli` exists in `package.json` devDependencies
2. Verify the `.changeset` directory exists with a `config.json` file
3. If either is missing, display this error message and STOP:

```
ERROR: Changesets CLI is not installed or initialized.

To set up changesets, run:
  bun add -D @changesets/cli
  bun changeset init

After initialization:
1. Review the generated .changeset/config.json
2. Ensure package.json has a "version" field
3. Re-run this command to sync the changelog

For more information, visit: https://github.com/changesets/changesets
```

## Task Overview

Your goal is to:
1. Analyze the existing changelog (CHANGELOG.md) or note if it doesn't exist
2. Cross-reference git history on the main branch
3. Identify commits that represent user-facing changes needing documentation
4. Create appropriate changeset files for undocumented changes
5. Run `changeset version` to update the changelog and bump package versions

## Step-by-Step Process

### Step 1: Read Current State

1. Read `CHANGELOG.md` if it exists (note if it doesn't)
2. Read `package.json` to get the current version
3. Read `.changeset/config.json` to understand the changeset configuration

### Step 2: Analyze Git History

1. Get the git log from the main branch:
   ```bash
   git log origin/main --pretty=format:"%H|%s|%b|%an|%ae|%ad" --date=iso
   ```

2. If a CHANGELOG exists, identify the last documented release date or version tag
3. Filter commits since the last release, or if no changelog exists, get recent commits (e.g., last 20-30 commits)

### Step 3: Categorize Changes

Analyze each commit and categorize by semver bump type. Consider:

**PATCH (Bug fixes, minor changes):**
- Bug fixes that don't change the API
- Documentation updates
- Internal refactoring without user-facing changes
- Performance improvements
- Dependency updates (patch versions)

**MINOR (New features, backwards-compatible):**
- New features that don't break existing functionality
- New API endpoints or methods
- Enhancements to existing features
- Deprecation warnings (without removal)
- Dependency updates (minor versions)

**MAJOR (Breaking changes):**
- Breaking API changes
- Removal of deprecated features
- Significant architectural changes
- Changes that require user migration
- Dependency updates (major versions)

**SKIP (No changelog entry needed):**
- Merge commits
- Build/CI configuration changes (unless user-facing)
- Test-only changes
- Development tooling updates
- Work-in-progress commits

### Step 4: Create Changesets

For each commit that needs documentation:

1. Create a changeset file using the format:
   ```bash
   # For interactive creation (preferred):
   bun changeset add

   # Or create manually in .changeset/ directory
   ```

2. Each changeset file should:
   - Have a unique, random filename (e.g., `brave-foxes-dance.md`)
   - Contain YAML front matter with packages and bump types
   - Include a clear, user-focused summary

Example changeset structure:
```markdown
---
"jobapptracker": minor
---

Add data visualization page with interactive charts for tracking application metrics over time
```

### Step 5: Review and Consolidate

1. List all created changesets
2. Check for duplicate entries
3. Ensure semver bump types are appropriate
4. Verify summaries are clear and user-focused (not git commit messages)

### Step 6: Generate Changelog

1. Run the version command:
   ```bash
   bun changeset version
   ```

2. This will:
   - Consume all changeset files
   - Update package.json version
   - Generate/update CHANGELOG.md
   - Update dependency versions if needed

3. Review the generated changes:
   - Read the updated CHANGELOG.md
   - Verify the new version in package.json
   - Check that changeset files were deleted

### Step 7: Report Results

Provide a summary including:
- Previous version and new version
- Number of changesets created
- Breakdown by semver type (major/minor/patch)
- Preview of new CHANGELOG entries
- Any commits that were skipped and why

## Error Handling

If you encounter issues:

**Missing package.json version field:**
```
ERROR: package.json must have a "version" field for changesets to work.
Add: "version": "0.0.0" (or appropriate starting version)
```

**Git errors:**
- If `origin/main` doesn't exist, try `main` or `master`
- If no git history, explain that changesets require a git repository

**Changeset CLI errors:**
- Display the full error message from the changeset command
- Suggest checking .changeset/config.json for configuration issues
- Remind user to check changesets documentation: https://github.com/changesets/changesets/tree/main/docs

## Best Practices

1. **User-facing focus**: Only create changesets for changes that affect users/consumers of the package
2. **Clear summaries**: Write changelog entries in plain language, not technical jargon
3. **Appropriate semver**: Be conservative with breaking changes, liberal with patches
4. **Consolidate related changes**: Group related commits into a single changeset when appropriate
5. **Skip noise**: Don't create changesets for internal changes, WIP commits, or merge commits

## Output Format

After completion, provide:
```markdown
## Changelog Sync Complete

**Version Update**: vX.Y.Z → vA.B.C

**Changesets Created**: N
- Major: N
- Minor: N
- Patch: N

**New Changelog Entries**:
[Preview the new entries from CHANGELOG.md]
**Next Steps**:
1. Review the changes in CHANGELOG.md
2. Commit the updated files:
   - package.json
   - CHANGELOG.md
   - .changeset/ (deleted changeset files)
3. Create a git tag: git tag vA.B.C
4. Push changes and tags: git push && git push --tags
5. (Optional) Publish: bun changeset publish
```

## References

- Changesets Documentation: https://github.com/changesets/changesets/tree/main/docs
- Intro to Changesets: https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md
- Command Line Options: https://github.com/changesets/changesets/blob/main/docs/command-line-options.md
- Semantic Versioning: https://semver.org/
