---
description: Ship a new EDVO Bot release (tag, build, sign, publish APK via GitHub Actions)
argument-hint: [version, e.g. 1.1.3] (optional — defaults to next patch)
---

Ship a new EDVO Bot release for `gieson-edvo/edvo-bot`. Repo background: pushing a git tag matching
`v*.*.*` triggers `.github/workflows/release.yml`, which builds a signed release APK (signing secrets
`EDVO_KEYSTORE_BASE64`, `EDVO_KEYSTORE_PASSWORD`, `EDVO_KEY_ALIAS`, `EDVO_KEY_PASSWORD` are already set
on the repo) and publishes it as a GitHub Release with asset `edvo-bot.apk`. Installed apps poll the
GitHub Releases API and prompt employees to update before they can log in.

Steps:

1. Run `git status`. If there are uncommitted changes, stop and ask the user whether to commit them
   first — do not tag a dirty or unrelated working tree.
2. Make sure the local `main` branch is pushed and up to date with `origin/main` (`git push origin main`
   if there are unpushed commits).
3. Figure out the version to ship:
   - If the user passed a version in `$ARGUMENTS`, use it (strip a leading `v` if present).
   - Otherwise, run `git tag --list 'v*.*.*' --sort=-v:refname | head -1` to find the latest tag and bump
     the patch number by 1.
4. Create an annotated tag: `git tag -a vX.Y.Z -m "EDVO Bot vX.Y.Z"`, then `git push origin vX.Y.Z`.
   Never delete or force-move an existing tag — always pick a new version number instead.
5. Find the triggered run with `gh run list --repo gieson-edvo/edvo-bot --limit 1`, then watch it with
   `gh run watch <run-id> --repo gieson-edvo/edvo-bot --exit-status`.
6. If the run fails, pull the failure logs with `gh run view <run-id> --repo gieson-edvo/edvo-bot --log-failed`,
   diagnose and fix the root cause (e.g. a previous run failed on `./gradlew: Permission denied` because
   `gradlew` lost its executable bit — that was fixed by `git update-index --chmod=+x android/gradlew`),
   commit the fix, and ship again under the next patch version (do not reuse the failed tag).
7. On success, confirm with `gh release view vX.Y.Z --repo gieson-edvo/edvo-bot` and report the release
   URL and asset to the user.

Live updates: each release also publishes `edvo-bot-web-min-native-<N>.zip` (the `www/` bundle), which
installed apps at native version ≥ N apply in place without reinstalling the APK. `N` comes from
`native-version.txt`. Before tagging, if this release changes anything native (Capacitor plugins,
`android/`, `capacitor.config.json`), set `native-version.txt` to the version being shipped so older
APKs fall back to the "Update now" APK prompt instead of loading a bundle they can't run.
