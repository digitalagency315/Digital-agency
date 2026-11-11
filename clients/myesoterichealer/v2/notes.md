# My Esoteric Healer v2: build notes

Folder: `clients/myesoterichealer/v2/`. This is a static multi-page site with shared `assets/style.css` and `assets/main.js`. Fonts come from Google Fonts (Caudex, the live site's font, plus Jost for small labels). GSAP 3.12.2 and ScrollTrigger 3.12.2 load from cdnjs. Nothing has been published, deployed or emailed.

The first draft (`../index.html`) is untouched.

## Pages built (same names and nav order as the live site)
| New file | Original page | Notes |
|---|---|---|
| `index.html` | `/` Home | Hero, Your Session (6 steps with the original 6 artworks), About me with Marina's portrait, CTA |
| `testimonials.html` | `/testimonials` | Stella Todan and Serena Geddes, verbatim |
| `blog.html` | `/blog` | 32 post cards with local cover images. Each card links to the live post |
| `book-online.html` | `/book-online` | Quantum Healing Hypnosis, 5 hr, $350. Book Now goes to the live booking calendar |
| `quantum-healing-hypnosis.html` | `/service-page/quantum-healing-hypnosis` | Reached from Book Online ("Service details"), as on the live site |

Nav: Home, Testimonials, Blog, Book Online, plus a gold "Book a session" button. All booking buttons point to the live calendar at https://www.myesoterichealer.com/booking-calendar/quantum-healing-hypnosis. No links were invented. External links used: the live booking calendar, live blog posts, `tel:0431964308` and `mailto:marinalezos@protonmail.com`.

Not rebuilt, on purpose:
- **33 blog posts.** The cards link to the live posts. The posts are long first-person articles, and several make therapy-outcome statements (for example "Hypnotherapy works by helping you... heal old emotional wounds and trauma bonds"). Republishing them needs a content review with the client first.
- **Booking calendar.** This is a Wix Bookings widget, so it stays live.
- **Search page.** This is a Wix utility. The new nav has no search box. If the site is rebuilt off Wix, add search back or drop it.

## Design
- Palette from the live site's computed styles: black ground, cream text #E7DFD3, earth-brown footer #684938 (with the wavy top edge the original has), and a warm gold taken from the artwork. The site has clear brand colours, so the midnight/violet fallback was not needed. There is only a faint violet glow in the background.
- 3D and motion:
  - The hero image sits in a 3D "orb" frame with orbiting rings and follows the pointer.
  - Cards tilt in 3D with a light sheen on pointer devices.
  - Photos use GSAP ScrollTrigger parallax, and sections reveal on scroll.
- `prefers-reduced-motion`: all JS motion is skipped (no reveal class is added) and CSS animations are disabled.
- Mobile: hamburger button with a full-screen menu. It sets aria-expanded, closes on Escape, and has 48px touch targets.

## Images
47 unique images were downloaded at original resolution to `assets/img/`, plus the favicon. Pages use the web-sized copies in `assets/img/web/`, which total 3.3 MB.

Used:
- `home-hero-quantum-hypnosis` for the home hero, as on the original. It is also the CTA band background.
- The 6 `session-*` artworks, in the same order and pairing as the original (Interview, Hypnosis, Debrief, Questions, Recording, Conclusion).
- `marina-portrait` in About me on the home page, where it appears on the original.
- `service-quantum-healing-hypnosis` on Book Online and the service page, as on the original.
- `session-hypnosis-past-lives`, reused as artwork on Testimonials. The original testimonials page has no photo apart from the footer quote.
- `favicon-snake-spirit`, which is the live favicon. It is used as the favicon and the small brand mark.
- 32 of the 33 `blog-*` covers on the Blog page.

Not used:
- `dolores-cannon-quote.jpg`, the footer image on every live page. Its text reads "I have found that everything can be cured, if the person is willing to release it." That is a cure claim.
- `blog-how-hypnotherapy-can-help-with-depression.png`, because that post is omitted (see below).
- The 4 `post-*` inline images, because the posts were not rebuilt.

## Text changed or omitted
The text is the live text, lightly edited for flow, with no facts changed.
- **Omitted: Ed Lyons testimonial.** It credits the session with ending osteoarthritis shoulder pain, which is a medical outcome claim.
- **Omitted from the blog grid: "How Hypnotherapy Can Help with Depression"** (live URL `/post/unlock-your-potential-qhht-hypnotherapy-sessions-with-marina`). The title claims a treatment benefit for a medical condition. The client should review the post itself.
- Home intro: "help us cope with pain, stress, and traumas" became "how we might make sense of pain, stress and trauma". This avoids an implied therapeutic claim.
- Session overview: "The aim is to clear and heal your main concerns in one session" became "The intention is to explore your main concerns in depth in a single session".
- Conclusion of session: "the positive changes will continue to resonate... the positive effects of today's session will continue to develop" was softened to "Insights often keep unfolding after a session". This avoids promising outcomes.
- About me: changed from a mix of third and first person to first person throughout. All facts were kept: certified under the late Dolores Cannon's teachings, "a few years of experience", Canungra hinterland rooms, a 20 km radius, a quiet darkened room for 2+ hours, and fluent Greek.
- Service description: "transformative journey... and profound healing... Book your session now!" was shortened to "a journey through past life memories..." The tagline "Reconnect with your past lives for deep healing" is kept verbatim as the client's own spiritual framing, and the disclaimer appears on the same page.
- Testimonials: kept verbatim. Only the capital on "I highly recommend" and the final full stops were fixed.
- Added a "complementary, not a substitute for medical care" line to the footer of every page and to the Home session section, Testimonials, Blog, Book Online and the service page. Testimonials also say "not a promise of any particular result".
- The page titles and meta descriptions were rewritten from the live ones, keeping the same facts.

## Placeholders (visible yellow `[CLIENT TO CONFIRM: ...]` tags)
1. Social media links. None were found on the live site. This tag is in the footer of every page.
2. Whether the 20 km radius is measured from Canungra (Home, About facts).
3. Whether the $350 is in AUD and whether GST applies (Book Online).
4. Cancellation and rescheduling policy (Book Online).

Also to confirm, with no tag on the page:
- The address. The service page says "Gold Coast QLD" while the rest of the site says Canungra QLD 4275.
- Whether the client wants the 33 posts migrated, and the review of the depression post.
- Whether Marina's surname may be shown. It appears only in her email address.

## QA (Playwright, deviceScaleFactor 1, 1440px and 400px)
- All 5 pages at both widths: 0 broken images, 0 console errors or failed requests, no horizontal scroll, all reveal elements visible after scrolling, and GSAP and ScrollTrigger loaded.
- Every local nav and footer link resolves to an existing file. The mobile menu opens and navigates (Home to Testimonials). With reduced motion on, no motion classes are applied.
- Fixed during QA:
  - The orbit rings caused horizontal scroll at 400px. The hero now clips them and the orb is narrower on mobile.
  - The portrait parallax showed a gap at the top of its frame, so parallax images now have slack above and below.
  - The CTA text was low-contrast over its image, so the overlay is darker.
- Screenshots: `screenshots/<page>-1440.png`, `<page>-400.png` and `mobile-menu-open-400.png`. Full-page captures force scroll reveals visible.
- Side-by-side comparison: `compare-home.png` (original on the left, new on the right).

## Crawl problems
- The first pass of `/blog` hit a 60 s network-idle timeout (Wix keeps connections open). The content was still captured, and the re-crawl completed with no errors.
- Wix's mobile site renders at a fixed 320px layout, so the `original-screenshots/*-400.png` files are 320px wide. They were captured with a 400px mobile viewport and an iPhone user agent.
- The blog index and posts show no visible publish dates in the rendered DOM, so the cards have no dates.
- The booking calendar showed "No availability" for 11 Nov 2026. Available times could not be crawled.
- Nothing else failed. All 40 pages and all 47 images were captured.
