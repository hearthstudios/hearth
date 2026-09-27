# HEARTH website: redesign, ready for the repo

This folder is a full replacement for the `hearth-main` repo. It keeps your Netlify functions, Supabase project, Airtable tables, Beehiiv connection, press kit, downloads and brand files. It adds 30 new pages built from the approved canvas, plus the existing Circle app (`collab-hub.html`).

## How to ship it

1. In the repo, create a branch (e.g. `redesign`).
2. Delete the old HTML pages listed under **Removed pages** below. `_redirects` sends their URLs to the new pages.
3. Copy everything in this folder into the repo root, replacing existing files when asked. This zip holds only new and changed files. Your images, logos, press kit, `downloads/` zips, `resources/` templates and `netlify/functions/` stay in the repo as they are, and the new pages use them.
4. Push, then open the Netlify **deploy preview**. The environment variables are unchanged (`AIRTABLE_PAT`, `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`).
5. On the preview, send one test through each form (list below). Check that each row shows up in Airtable, Beehiiv or Supabase, then merge.

## Where every form goes

| Form | Page(s) | Destination |
|---|---|---|
| Project inquiry (3 steps) | Work With Us + the 5 service pages | Airtable `appyhjawc9vZ5DfWg / tbl0F7d1Sgor8ZZWj` (the same Client Intake table and field names as today). Timeline, budget and any extra services are added to the project description. |
| Sponsorship (2 steps) | sponsorship.html | The same Client Intake table, with service set to "Sponsorships" and the level added to the description |
| Music submission (4 steps) | submit-music.html | Airtable Music Catalog `appKsSNFxrW7R8nfs / tblJzxn2bQag54qMD`, with the exact column names (including "Primary Steaming Link"). Opting in to The Glow also subscribes them in Beehiiv. |
| The Glow signup | Every page footer, the-glow.html | Beehiiv via `netlify/functions/beehiiv.js` (`utm_campaign` = the page it came from) |
| Program "Get notified" | programs.html, script-labs.html | The Google Form your program pages use today. To move it to Airtable, add `airtable.notify` in `assets/js/config.js`. |
| Join the Circle (3 steps) | join.html | Supabase auth + `profiles` (`full_name`, `location`, `craft`, `portfolio_url`, `status: pending`). This is the same project and table as collab-hub.html. |

All settings live in `assets/js/config.js`. No keys are in the page files.

**Supabase note:** if email confirmation is turned on in Supabase, new members see "Check your inbox to confirm your email, then sign in to finish your profile." Their name is saved on the account right away. They complete the rest of the profile in collab-hub.html after signing in.

## Changes to shared files

- `_headers`: added your Supabase domain to the Content-Security-Policy. The old policy blocked `*.supabase.co`, which would have stopped Circle sign-up and sign-in from working. Added download headers for `/downloads/*.zip`.
- `_redirects`: rewritten. Every old page and every old pretty URL (`/programs/script-labs`, `/events/...`) now 301s to its new page.
- `netlify.toml`: the redirects were moved to `_redirects`, so this file now only holds build and functions settings.
- `collab-hub.html`: kept as-is, except `hello@` is now `operations@`.

## Removed pages (delete these from the repo; they redirect)

`video-production`, `cast-crew-access`, `work-live-events`, `community-screenings`, `storytelling-workshops`, `prog-script-labs`, `prog-music-residencies`, `prog-film-producing`, `prog-youth-in-film`, `prog-mentoring`, `prog-showcases`, `evt-acting-camera`, `evt-annual-hearth`, `evt-breaking-in`, `evt-budgeting`, `evt-film-pitch`, `evt-new-voices`, `evt-songwriting`, `evt-stand-up`, `schedule`, `newsletter`, `blog-founding-story`, `thankyou`, `old_single_page_backup`, `check`, `image-test` (all `.html`).

Also left out: `kiara-headshot.jpg`. Every other image, logo, video and download from the old repo is kept, so links from past Glow issues and social posts still work.

## Pages

| Group | Files |
|---|---|
| Home + Circle | `index.html`, `the-circle.html`, `join.html`, `collab-hub.html` (member app) |
| Work with us | `work-with-us.html`, `video-content.html`, `music-supervision.html`, `cast-crew.html`, `live-events.html`, `media-education.html`, `case-studies.html`, `case-study-alchy.html`, `case-study-batty.html`, `sponsorship.html` |
| Music | `music-artists.html`, `submit-music.html` |
| Programs + events | `programs.html`, `script-labs.html`, `events.html` (Luma embed), `game-night.html` |
| Community | `community.html`, `the-glow.html`, `membership.html`, `resources.html` |
| Studio | `about.html`, `media.html`, `blog.html`, `founding-story.html`, `press.html` |
| Utility | `thank-you.html`, `links.html` |

## Newsletter content on the site

- `community.html`: the A Steady Flame carousel now holds all 7 spotlights from Issues 2–8, each with its role and a one-line summary from the issue. Six show their photo. Delo's photo was never uploaded to Beehiiv, so her slide shows initials.
- The spotlight photos load from your Beehiiv image hosting, the same URLs the issues use. To host them yourself, save them to `assets/img/` and update the six URLs in `community.html`.
- `the-glow.html`: a Recent issues list (Issues 1–8), with each issue's headline, spotlight and Fuel topic, linking to the Beehiiv archive. Issue 9 is left out because it's still a draft (Jamell's photo, quote and sign-off are pending).

## Press kit (rebuilt)

`HEARTH-Press-Kit.pdf` has been rebuilt with the same content and layout. Changes:
- Your pronouns are he/him.
- The Los Angeles operations and the chapbook are removed. "Author" is now "screenwriter."
- The release now calls you "Worrell" instead of "W", the standard way press releases refer to people.

The release still says the launch was **July 4**, but the press page says **July 1**. Tell me which date is right and I'll match both.

## Still open

- `game-night.html`: date, time and venue are TBD for now. Fill them in once they're set.
