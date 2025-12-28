# NPM Publishing Guide for @adverant-nexus Packages

**Last Updated:** December 2024
**Version:** 3.0.1

This guide documents how to publish updates to the @adverant-nexus npm packages using GitHub Actions with OIDC trusted publishing.

---

## Overview

The nexus-cli monorepo contains three npm packages:

| Package | Description | npm Status |
|---------|-------------|------------|
| `@adverant-nexus/cli` | Main CLI application | Published |
| `@adverant-nexus/sdk` | Plugin development SDK | Not yet published |
| `@adverant-nexus/types` | Shared TypeScript types | Not yet published |

## Authentication Method: OIDC Trusted Publishing

We use npm OIDC (OpenID Connect) trusted publishing, which bypasses token-based authentication entirely. This means:
- No npm tokens needed in GitHub secrets
- No 2FA/OTP prompts during publishing
- Provenance attestation for supply chain security

### Prerequisites (One-Time Setup)

For each package, configure trusted publisher on npmjs.com:

1. Go to https://www.npmjs.com/package/@adverant-nexus/cli/access
2. Under "Publishing access", click "Add trusted publisher"
3. Configure with:
   - **Owner:** `adverant`
   - **Repository:** `Adverant-Nexus-CLI`
   - **Workflow:** `release.yml`

---

## How to Publish Updates

### Step 1: Make Your Changes

Edit the code in the appropriate package:
- CLI code: `packages/cli/src/`
- SDK code: `packages/sdk/src/`
- Types: `packages/types/src/`

### Step 2: Update Version

Bump the version in the package's `package.json`:

```bash
# Example: Update CLI version
vim packages/cli/package.json
# Change: "version": "3.0.1" → "version": "3.0.2"
```

### Step 3: Update README (If Needed)

**Important:** npm displays the README from `packages/cli/README.md`, NOT the root `README.md`.

If you need to update the npm page content, edit `packages/cli/README.md` and use absolute GitHub URLs:

```markdown
<!-- Images -->
<img src="https://raw.githubusercontent.com/adverant/Adverant-Nexus-CLI/main/docs/images/logo.svg" />

<!-- Links -->
[Contributing](https://github.com/adverant/Adverant-Nexus-CLI/blob/main/CONTRIBUTING.md)
```

### Step 4: Commit and Push

```bash
git add .
git commit -m "feat: your change description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push origin main
```

### Step 5: Create Version Tag

The release workflow triggers on version tags:

```bash
git tag v3.0.2
git push origin v3.0.2
```

### Step 6: Monitor the Workflow

Check the GitHub Actions workflow:
- https://github.com/adverant/Adverant-Nexus-CLI/actions

Or via API:
```bash
curl -s "https://api.github.com/repos/adverant/Adverant-Nexus-CLI/actions/runs?per_page=3"
```

### Step 7: Verify Publication

```bash
npm view @adverant-nexus/cli versions --json
# Should show your new version
```

---

## Workflow Configuration

The release workflow (`.github/workflows/release.yml`) is configured as follows:

### Key Permissions

```yaml
permissions:
  id-token: write    # Required for npm OIDC trusted publishing
  contents: write    # Required for creating GitHub releases
```

### Node.js Version

OIDC requires:
- Node.js 22.x
- npm 11.5+ (installed via `npm install -g npm@latest`)

### Publish Commands

```yaml
- name: Publish @adverant-nexus/cli to NPM (OIDC)
  working-directory: packages/cli
  run: npm publish --access public --provenance
```

The `--provenance` flag enables OIDC trusted publishing.

---

## Build Order

Packages must be built in dependency order:

```
1. @adverant-nexus/types   (no dependencies)
2. @adverant-nexus/sdk     (depends on types)
3. @adverant-nexus/cli     (depends on types and sdk)
```

This is handled by the root `package.json` build script:

```json
{
  "scripts": {
    "build": "npm run build --workspace=@adverant-nexus/types && npm run build --workspace=@adverant-nexus/sdk && npm run build --workspace=@adverant-nexus/cli"
  }
}
```

---

## Troubleshooting

### Error: EOTP (One-Time Password Required)

This happens when using token-based auth instead of OIDC. Ensure:
1. `id-token: write` permission is set
2. `--provenance` flag is used
3. Trusted publisher is configured on npmjs.com
4. npm version is 11.5+

### Error: Package Not Found (404)

For new packages (`types` and `sdk`), the first publish requires manual authentication with OTP. After the first publish, OIDC can be configured.

### Error: Build Failed - Types Not Found

Ensure build order is sequential (types → sdk → cli), not parallel.

### README Not Updating on npm

npm caches READMEs. Bump the version to publish a new package with updated README.

---

## Package Scope Note

We use `@adverant-nexus` scope because:
- `@adverant` scope requires a paid npm organization
- `@adverant-nexus` is a free scope where we already have published packages

All internal dependencies use `"*"` for local resolution:

```json
{
  "dependencies": {
    "@adverant-nexus/types": "*",
    "@adverant-nexus/sdk": "*"
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.0.1 | Dec 2024 | Updated README for npm display |
| 3.0.0 | Dec 2024 | Initial public release with OIDC publishing |
| 2.0.1 | Earlier | Previous private version |
| 2.0.0 | Earlier | Previous private version |
