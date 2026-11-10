# My Esoteric Healer: redesign notes

File: `index.html` (single file; Google Fonts + GSAP 3.12.2 and ScrollTrigger from cdnjs).
Screenshots: `screenshots/mobile-full.png` (400px), `screenshots/desktop-full.png` (1440px), plus `*-hero.png`.
Note: the full-page desktop shot shows a tall empty band after "Travel to an alternate time". That is the ScrollTrigger pin spacer. In a real scroll the section stays pinned and the three cards rotate through.

## Sources used
- https://www.myesoterichealer.com (home)
- https://www.myesoterichealer.com/testimonials
- https://www.myesoterichealer.com/book-online
- https://www.myesoterichealer.com/blog (titles only, no extra bio facts)
- Google Drive: title searches for "esoteric", "healer", "myesoteric" found nothing. Full-text search and the "claude cowork" / "cowork manager" folders had **no Cowork brief** for this client. The only mention is a LinkedIn outreach line to "Marina Lezos" in "TASK 06 Nov - LinkedIn + coach research - DONE" and `linkedin-handoff.md`. That is not a brief.
- Gmail: not checked. The Gmail connector is not available in this session.

## Facts found (used on the page)
- Business: My Esoteric Healer. Practitioner: Marina (email marinalezos@protonmail.com).
- Service: Quantum Healing Hypnosis (QHHT). About 5 hours. A$350 on Book Online.
- Structure: Interview (1-2 hr), Hypnosis (1-2 hr; earlier in this life, a past life or a future life; contact the Higher Self or Subconscious Mind), Debrief (1 hr).
- The hypnosis portion is recorded and given at the end, or the client can record it on their own device. Don't listen while driving (Theta state).
- Credential as stated on the site: "certified hypnotherapist under the teachings of the late Dolores Cannon with a few years of experience".
- Fluent in Greek. Whole sessions are available in Greek.
- Rooms in the Hinterland at Canungra QLD 4275. Mobile sessions within a 20 km radius, in a quiet room that can be darkened and left uninterrupted for at least 2 hours.
- Phone 0431964308. Email marinalezos@protonmail.com.
- Booking: https://www.myesoterichealer.com/book-online (the service link is /booking-calendar/quantum-healing-hypnosis).
- Testimonials (verbatim excerpts): Stella Todan, Serena Geddes, and two unattributed (labelled "Client").
- Tone: warm, personal, spiritual. Brand colours were not identifiable, so the page uses a dark-luxe palette (midnight, soft gold, violet).

## Deliberately left out
- Ed Lyons testimonial. It credits the session with stopping osteoarthritis shoulder pain, which is a health outcome claim.
- The site line "clear and heal your main concerns in one session". It was reworded as an intention to look at concerns in depth.
- Added "complementary, not a substitute for medical care" notes in the Where section and the footer.

## Placeholders left (5, visible yellow tags, class="placeholder")
1. [CLIENT TO CONFIRM: cancellation and rescheduling policy]
2. [CLIENT TO CONFIRM: portrait photo of Marina for this frame]
3. [CLIENT TO CONFIRM: a short personal story from Marina, e.g. how she came to this work]
4. [CLIENT TO CONFIRM: is the 20 km radius measured from Canungra?]
5. [CLIENT TO CONFIRM: social media links, if any]

Also to confirm (no visible tag): brand colours or logo, and whether Marina is happy to show her surname (it appears only in her email).

## QA
- Playwright at deviceScaleFactor 1, 400px and 1440px: no horizontal scroll (scrollWidth equals clientWidth), no JS errors, all reveal elements visible after scrolling.
- Fixed during QA: low contrast on the nav "Book online" button; the timeline section had no side padding on mobile; the overlapping mobile card fan became a vertical stack.
- Skill validator (`html_validator.py`): PASS 17/17.
