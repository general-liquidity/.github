# .github

Organization-level GitHub configuration for [General Liquidity](https://github.com/general-liquidity).

- [`profile/README.md`](profile/README.md) renders on the [organization profile page](https://github.com/general-liquidity).
- [`scripts/update-profile-readme.mjs`](scripts/update-profile-readme.mjs) regenerates the
  repository tables (stars, issues, pull requests) between the `repositories:start` and
  `repositories:end` markers. Repository descriptions live in that script.
- [`.github/workflows/update-readme.yml`](.github/workflows/update-readme.yml) runs the
  generator daily, on demand, and whenever the generator changes.
- [`assets/`](assets) holds the profile banner.

## Notes

For the profile to render, this repository must be created on GitHub as
`general-liquidity/.github` (the special organization configuration repository).

To add or move a repository on the profile, edit the `GROUPS` array in
`scripts/update-profile-readme.mjs` and run it locally with a token, or let the workflow
refresh it:

```
GITHUB_TOKEN=<token> node scripts/update-profile-readme.mjs
```
