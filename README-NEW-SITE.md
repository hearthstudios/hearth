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
- `the-glow.html`: a Recent issues list (Issues 1–8), with each issue's headline, spotlight and Fuel topic, each linking to that issue on Beehiiv (the spotlight links on community.html do too). Issue 9 is left out because it's still a draft (Jamell's photo, quote and sign-off are pending).

## Press kit (rebuilt)

`HEARTH-Press-Kit.pdf` has been rebuilt with the same content and layout. Changes:
- Your pronouns are he/him.
- The Los Angeles operations and the chapbook are removed. "Author" is now "screenwriter."
- The release now calls you "Worrell" instead of "W", the standard way press releases refer to people.

The release still says the launch was **July 4**, but the press page says **July 1**. Tell me which date is right and I'll match both.

## The Circle member area (collab-hub.html) — rebuilt

`collab-hub.html` is now the new signed-in member area in the warm room design, built from the approved mock-ups. It keeps the same URL, the same Supabase project, and the same `profiles` and `connections` tables, so existing accounts, profiles and connections carry over.

- **Signed out:** a sign-in card with "Forgot password?". The reset link returns here and asks for a new password; the old page never had that step. New members are sent to `join.html`.
- **Home:** counts for connections, requests waiting on you, and members in the directory. You can accept or decline pending requests right there, and it shows the newest members. On the side: profile status (live, in review, or needs a revision) with how complete it is, the template library, and what's coming soon.
- **Directory:** approved profiles only. You can search and filter by city, availability, skill level and craft. Craft filters are built from the crafts members actually list. Connect, Requested, Connected and Accept all work from each card.
- **Connections:** tabs for Waiting on you, Your network, and Sent. Each has accept, decline or cancel. Only portfolio links are shown; emails are never shared.
- **My Profile:** the same fields as before, with a live preview of your directory card. Members can now pick more than one craft. Saving works as before: status goes back to `pending` for review.
- **First sign-in:** anyone without a profile name yet goes straight to My Profile.
- **Header:** when signed in, the header shows the member's initials and first name in place of "Join the Circle".
- All code is in `assets/js/circle.js`, with no inline scripts.

## Homepage loop + Time Lock premiere

- The hero is your own silent loop, with the audio track removed and the letterbox bars cropped out. It comes in MP4 (Safari, iPhone, Chrome, Edge) and WebM (a backup format for browsers without MP4 support), with smaller 720p versions for phones in `assets/video/`. It restarts at the end even if a browser ignores looping. If a phone blocks autoplay (e.g. iPhone Low Power Mode), it starts on the first tap or scroll. No YouTube embed remains anywhere on the site.
- Every "Watch Time Lock" link now says it **premieres October 15** and links to The Glow signup. After the premiere, replace those links (homepage hero, media.html, programs.html, links.html) with the film link.

## Join form fixes

- Error messages now appear on the step you're on. Before, step 2 errors showed on the hidden step 1, so the form looked frozen.
- Links typed without `https://` (e.g. `instagram.com/you`) are accepted and fixed automatically.
- Choosing **Elsewhere** asks where they're based, and that answer is saved as their location. Choosing **Other** asks for their craft, and that answer is saved in place of "Other." My Profile in the member area works the same way.

## Signed-in state across the site

- The site now remembers who's signed in on every page, not just the Circle. The header button becomes a round badge with the member's initials that links to their Circle. Signed-in members who land on `join.html` go straight to the Circle.
- Every "Join the Circle" link becomes "Go to the Circle." Sign-in links are hidden. `join.html` shows "You're already in" instead of the sign-up form.
- The check reads the Supabase login that's already saved in the browser, so there's no extra loading on normal pages. Signing out in the Circle switches everything back to "Join the Circle."

## Hero video

- Browsers now pick the video file themselves, MP4 first then WebM. Safari was being handed a WebM file it couldn't play, which is why it showed a still.
- The hero matches the film's widescreen frame, so nothing is cropped. On phones, the full frame shows and the caption sits below it.

## Circle routing (checked on every page, signed in and signed out)

| Link | Signed out | Signed in |
|---|---|---|
| Header button | "Join the Circle" → join.html | Initials badge → collab-hub.html |
| Menu Circle card | "Explore the Circle" → the-circle.html | "Go to the Circle" → collab-hub.html |
| Any "Join the Circle" / "Join free" button | → join.html | "Go to the Circle" → collab-hub.html |
| "Join to see who's here" (directory preview) | → join.html | "Open the directory" → collab-hub.html#directory |
| Homepage Circle section | Sign-up pitch with a locked directory preview | "Welcome back, [name]" with the 4 newest approved members, your pending requests, and your profile status (loaded live from Supabase) |
| "Sign in" links | → collab-hub.html | Hidden |
| join.html | Sign-up form | Sends you straight to collab-hub.html |
| Resources template rows | → join.html | Download directly |
| Circle page / Membership note | Guest copy ("How joining works", "two minutes") | Member copy |

To add a new Circle link anywhere: point it at `join.html` and it switches automatically. For custom wording when signed in, add `data-member-text="..."` and/or `data-member-href="..."`.

## Caching (why updates weren't showing)

The old `_headers` told browsers to keep every file in `/assets/` for a week, so browsers kept running old styles and scripts after a deploy. Now:
- Style and script links carry a version stamp (e.g. `hearth.css?v=4370512c`) that changes whenever the file changes.
- `_headers` makes browsers re-check CSS and JS on every visit.

If you ever edit `hearth.css` or `hearth.js` by hand, the stamp won't update itself: bump the `?v=` value in the pages, or ask me to rebuild.

## Two Supabase settings to make (5 minutes)

**1. Let reset-password links come back to the Circle.** In Supabase, go to Authentication → URL Configuration:
- **Site URL:** `https://buildyourhearth.studio`
- **Redirect URLs:** add `https://buildyourhearth.studio/collab-hub.html*`, plus your Netlify preview domain if you test there (e.g. `https://*--your-site.netlify.app/**`).

Without this, Supabase sends reset links to the homepage, which just signs people in. The site now catches that case too. When someone arrives from a reset link, the Circle always asks for a new password first. If the link has expired, it says so and offers to send a new one.

**2. Let connected members see each other's profiles.** Right now members can only see *approved* profiles. So if you connect with someone whose profile is still in review, they show up as "Member in review" with no name. To show connected members to each other whatever their review status, run this once in the SQL Editor:

```sql
create policy "Connected members can view each other"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.connections c
    where (c.requester_id = auth.uid() and c.recipient_id = profiles.id)
       or (c.recipient_id = auth.uid() and c.requester_id = profiles.id)
  )
);
```

This also lets you see the profile of anyone who sends you a request, so you know who's asking before you accept.

## Member profiles in the Circle

Every member's name is now clickable: in the directory, on Home, and in Connections. It opens their profile, showing craft, city, experience, availability, portfolio and social links, and a connect button. There are no profile photos yet; members show as initials. Photos need a storage bucket and one new column in Supabase, which I can set up next.

## Still open

- `game-night.html`: date, time and venue are TBD for now. Fill them in once they're set.

## Music submissions, easier to find

Before, artists could only reach the submission form through Music Supervision, then Music Artists. Now it's linked from:
- **Menu:** a new "For artists" column on every page, with Submit your music, How placement works, Artist FAQ and Sync Camp.
- **Homepage:** a "For artists · Free to submit" band just above Featured work.
- **Footer:** a "Submit your music" link on every page.
- **The Circle for artists:** the For artists menu column ends with "Join the Circle". The Music Artists page has a Circle band ("Directors, editors and producers in the Circle are looking for music"). After submitting music, artists are invited to join. Signed-in members see "Go to the Circle" and "Update your profile" instead.
