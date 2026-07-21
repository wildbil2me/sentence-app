# Security & privacy

## What Sentence Forge does with data

Nothing leaves the browser. There is no server, no account, no analytics, and no
network request of any kind: the app is static HTML/CSS/JS, and every lesson is
stored in the browser's own `localStorage` on the machine it was created on.

Consequences worth knowing before you use it with students:

- **A lesson lives on one browser profile.** Clearing site data, using a
  different browser, or a school image that wipes profiles between sessions will
  take the lessons with it. Use **Export JSON** to keep anything you care about.
- **A shared classroom machine shares lessons.** Anyone using that browser
  profile sees the same lesson library.
- **Quiz results are not recorded anywhere.** Practice mode shows a score on the
  results screen and forgets it. There is no gradebook, and by design no way to
  see what an individual student answered.
- **Imported JSON is treated as data, never as code.** It's parsed with
  `JSON.parse`; unknown labels, bad spans, and unknown sentence types are skipped
  with a warning rather than executed or trusted.

Because no student information is collected, transmitted, or stored off-device,
using Sentence Forge does not create a student-data record to manage. Confirm that
against your own district's policy before a class-wide rollout.

## Reporting a vulnerability

Email **wildbil2me@gmail.com** with "Sentence Forge security" in the subject.
Please don't open a public issue for anything exploitable.

Things worth reporting: any way an imported lesson file could execute script
(XSS through a lesson `title`, `note`, or sentence `text`), or any code path that
sends data off the device.

Expect a reply within a week. This is a side project maintained by a teacher, so
there is no formal SLA and no bounty.

## Supported versions

The deployed GitHub Pages site, built from `main`. There are no releases to
back-port to.
