# Release process

Use this checklist when publishing a new `@smsflow/smsflow` version.

## Before release

1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Run `npm test`.
4. Run `npm pack --dry-run` and confirm only public files are included.
5. Confirm no credentials, customer data, logs, or private URLs are present.

## Publish

1. Merge to `main` after CI passes.
2. Create a GitHub release named `vX.Y.Z`.
3. The publish workflow publishes `@smsflow/smsflow` to npm.
4. The package smoke workflow installs the published package from npm.

## Token rotation

The npm token is stored as the GitHub Actions secret `NPM_TOKEN`.

Create a new npm granular access token with package read/write permission for the `smsflow` organization and 2FA bypass enabled for CI publishing. Replace the GitHub secret immediately after rotation.

