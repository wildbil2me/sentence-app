# Deploying

Grammar Lab has no build step, so "deploying" means **serving the repository
root**. `index.html` is at the root; every path in it is relative.

- [First-time GitHub Pages setup](#first-time-github-pages-setup)
- [The two workflows](#the-two-workflows)
- [Release checklist](#release-checklist)
- [Other ways to host it](#other-ways-to-host-it)
- [Things that would break the deploy](#things-that-would-break-the-deploy)

---

## First-time GitHub Pages setup

1. Push the repository to GitHub with `main` as the default branch.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   Not "Deploy from a branch" — [`pages.yml`](../../.github/workflows/pages.yml)
   uploads the root as an artifact and deploys it.
3. Push to `main` (or run the workflow manually from the Actions tab).
4. The site appears at `https://<user>.github.io/<repo>/`. The workflow prints
   the URL on the `deployment` step.
5. Add the URL to the repo's **About** sidebar (tick "Use your GitHub Pages
   website"), and replace the placeholders described below.

### Replace the placeholders

The docs ship with `YOUR-GITHUB-USERNAME` and a repo name of `grammar-lab` in
every link that has to point at the live site or the issue tracker. One pass
fixes them all:

```bash
grep -rl "YOUR-GITHUB-USERNAME" --include="*.md" --include="*.yml" . \
  | xargs sed -i "s/YOUR-GITHUB-USERNAME/<your-user-or-org>/g"
```

If the repository isn't named `grammar-lab`, replace that too. The placeholder
appears in `README.md`, `CONTRIBUTING.md`, `docs/product/pilot.md`,
`docs/product/teacher-guide.md`, and `.github/ISSUE_TEMPLATE/config.yml`.

`.nojekyll` at the root tells Pages to serve files as-is rather than running them
through Jekyll. Nothing here starts with an underscore today, but the file costs
nothing and prevents a mystifying 404 later.

No `CNAME`, no custom domain, no environment configuration. The site is static
files and hash routes.

## The two workflows

**[`ci.yml`](../../.github/workflows/ci.yml)** — on every push and PR:

| Job | What it does |
|---|---|
| `smoke-test` | `node tools/smoke-test.js`, then `node tools/gen-docs.js --check`, then fails if `samples/` came back dirty (the smoke test regenerates it — see [testing.md](testing.md)). |
| `dom-check` | Dumps `tools/dom-check.html` through headless Chrome and fails on any `FAIL` line, or on an empty dump. |

**[`pages.yml`](../../.github/workflows/pages.yml)** — on push to `main`: checks
that `index.html` and `.nojekyll` exist, uploads `.` as a Pages artifact, and
deploys. Concurrency is set to let a running deploy finish and queue at most one
more, so rapid pushes don't cancel a half-finished publish.

The two are independent on purpose: a red CI run does **not** block the deploy.
That's the right tradeoff for a static classroom tool during a pilot — a stale
generated doc shouldn't keep a bug fix off the projector — but it means you
should watch the checks rather than assume green.

## Release checklist

There are no releases, tags, or versions; `main` is what teachers get. Before
pushing anything to `main` during the pilot:

- [ ] `node tools/smoke-test.js` passes and `samples/` is committed.
- [ ] `node tools/gen-docs.js --check` is clean.
- [ ] `tools/dom-check.html` opened in a browser — no FAIL lines.
- [ ] The manual pass in [testing.md](testing.md#manual-pass).
- [ ] **Opened `index.html` from `file://`** — the deploy can't catch this
      regression but a teacher on a USB stick will.
- [ ] If the lesson format changed: an **old** exported lesson still imports.
      This is the one true breaking change available to us — a teacher's saved
      lessons live only in their browser and in files they exported.
- [ ] If `localStorage` keys changed: existing lessons survive. The keys are
      `grammarLab.lessons.v1`, `grammarLab.theme`, and `grammarLab.seeded`.

That last pair is the whole backward-compatibility story. There is no server to
migrate and no way to reach a teacher's browser, so **a format break during the
pilot silently destroys someone's prep.** Keep changes additive; see
[lesson-json.md](lesson-json.md#compatibility).

## Other ways to host it

Anything that serves static files works, unchanged:

```bash
python -m http.server 8000     # then http://localhost:8000
npx serve .                    # or any static server
```

Or none at all — double-click `index.html`. Or copy the folder onto a shared
drive, a USB stick, or a school LMS file area. That portability is a feature
worth protecting; see the constraints in
[architecture.md](architecture.md#the-five-constraints).

## Things that would break the deploy

- **An absolute path** anywhere (`/css/styles.css`) — works at the domain root,
  404s under `/<repo>/`. Keep every path relative.
- **A `fetch()` of a local file** — works when served, fails from `file://`.
  This is why examples are JavaScript rather than JSON.
- **ES modules** (`type="module"`) — blocked under `file://` by CORS.
- **Any external resource** — a CDN script, a Google Font, a remote image. It
  breaks offline use, adds a tracking surface, and contradicts
  [SECURITY.md](../../SECURITY.md).
- **A file or folder starting with `_`** without `.nojekyll` present.
