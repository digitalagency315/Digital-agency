# myesoterichealer.com: crawl inventory

Crawled 11 Nov 2026 with Playwright (Chromium, full scroll for lazy images). Sources: nav, footer, buttons, `/sitemap.xml` (pages, booking-services, blog-posts, blog-categories sub-sitemaps). Raw data per page: `crawl/*.json`. Screenshots: `original-screenshots/<page>-1440.png` and `-400.png` (400px taken with a mobile user agent so Wix serves its mobile layout).

## Totals
- **Pages: 40.** 7 site pages (Home, Testimonials, Blog, Book Online, service page, booking calendar, Search) + 33 blog posts.
- **Nav (in order):** Home, Testimonials, Blog, Book Online, plus a site search box.
- **Images: 47 unique** (all downloaded at original resolution to `assets/img/`, 0 failures), plus the favicon (`favicon-snake-spirit.jpg`). Web-sized copies in `assets/img/web/`.
  - Home: 9 (hero, 6 session artworks, Marina portrait, footer quote)
  - Book Online / service: 1 (`service-quantum-healing-hypnosis.jpg`)
  - Blog covers: 33 (`blog-*.png/jpg`)
  - Extra inline images inside posts: 4 (`post-*.png/jpg`)
  - Footer image on every page: "Quote from Dolores Cannon" (`dolores-cannon-quote.jpg`)
- **Logo:** none. The brand is a text wordmark "My Esoteric Healer" in Caudex. The favicon is the snake-spirit artwork.
- **Brand colours (computed):** text cream `rgb(231,223,211)` / #E7DFD3, background black #000000, footer earth brown `rgb(104,73,56)` / #684938. Artwork is warm gold/amber.
- **Fonts (computed):** Caudex (serif) throughout. Wix default Helvetica for the search box.

## Contact and booking
- Phone: 0431964308
- Email: marinalezos@protonmail.com
- Address: Canungra QLD 4275, Australia (the service page lists "Gold Coast QLD, Australia")
- Book Online: https://www.myesoterichealer.com/book-online
- Booking calendar (Book Now target): https://www.myesoterichealer.com/booking-calendar/quantum-healing-hypnosis
- Service page: https://www.myesoterichealer.com/service-page/quantum-healing-hypnosis
- Price stated: Quantum Healing Hypnosis, 5 hr, $350 (no currency shown)

## Forms
- Site search only (`/search?q=`) in the header. No contact form or newsletter form. Booking runs through the Wix Bookings calendar.

## Social links
- **None found** on any page (header, footer or posts). Posts have no social profile links. One stray external link appears in a post body: `http://time.my/` (looks like an accidental auto-link).

## Pages
Image counts are the unique images rendered on each page. On blog posts this includes the 3 "Recent Posts" thumbnails at the foot of each post, so a typical post has 1 own cover plus 3 thumbnails. The footer quote image appears on every page and is counted separately.
| Page | URL | Sections | Images | Key text summary |
|---|---|---|---|---|
| My Esoteric Healer | / | 6 | 8 (+ footer quote) | Hero "Is QHHT Safe?" + QHHT intro; "Your Session with Marina" (~5 hrs: Interview, Hypnosis, Debrief, Your Questions, Recording, Conclusion) with 6 artworks; About me with Marina portrait; contact footer. |
| My Esoteric Healer :Testimonials | /testimonials | 4 | 0 (+ footer quote) | H1 "Clients"; 3 testimonials: Stella Todan, Ed Lyons (osteoarthritis pain claim), Serena Geddes. |
| Blog | /blog | 2 | 33 (+ footer quote) | "All Posts" grid of 33 post cards (title + cover image). |
| Book Online | /book-online | 3 | 1 (+ footer quote) | "Our Services": Quantum Healing Hypnosis, 5 hr, $350, Book Now button. |
| Quantum Healing Hypnosis | /service-page/quantum-healing-hypnosis | 3 | 0 (+ footer quote) | Service page: "Reconnect with your past lives for deep healing", description, contact details (Gold Coast QLD), Book Now. |
| Quantum Healing Hypnosis - myesoterichealer | /booking-calendar/quantum-healing-hypnosis | 2 | 0 (+ footer quote) | Wix booking calendar widget: "Schedule your service", date/time picker (AEST). Showed no availability on 11 Nov 2026. |
| myesoterichealer | /search | 2 | 1 (+ footer quote) | Wix site-search results page (utility). |
| Another Cause of Stress No One Talks About: People around us | /post/another-cause-of-stress-no-one-talks-about-people-around-us | 7 | 4 (+ footer quote) | Blog post. Opens: "There is a very famous quote by Sigmund Freud going like this: "Before you diagnose yourself with depression, ..." |
| Are There Really “Toxic” People? | /post/are-there-really-toxic-people | 7 | 4 (+ footer quote) | Blog post. Opens: "The word toxic seems to have become part of everyday language...." |
| When Fear Becomes Guidance: My Journey with the Snake Spirit | /post/exploring-the-unseen-my-journey-with-the-snake-spirit | 7 | 4 (+ footer quote) | Blog post. Opens: "For as long as I can remember, I’ve carried an intense fear of reptiles, more specifically snakes. The sight o..." |
| From Fear to Flow | /post/from-fear-to-flow | 7 | 4 (+ footer quote) | Blog post. Opens: "How can you love something so dearly and be afraid of it at the same time......" |
| Past Lives: A Journey Through Memory Lane | /post/heal-and-transform-deep-insights-through-qhht-hypnotherapy | 7 | 4 (+ footer quote) | Blog post. Opens: "The concept of past lives, embedded in various spiritual traditions, suggests that our souls..." |
| Healing the Fear of Disappointing Others | /post/healing-the-fear-of-disappointing-others | 7 | 4 (+ footer quote) | Blog post. Opens: "Life often asks us to carry a list of expectations, to be kind, be available, be agreeable. And most of us car..." |
| Healing the Mother Wound | /post/healing-the-mother-wound | 7 | 4 (+ footer quote) | Blog post. Opens: "As we step into 2026, this piece is shared with the intention of bringing awareness to the mother wound, an of..." |
| Hidden Worlds, Parallel Universes, Alternate Timelines: Exploring Consciousness Through Hypnotherapy | /post/hidden-worlds-parallel-universes-alternate-timelines-exploring-consciousness-through-hypnotherapy | 7 | 4 (+ footer quote) | Blog post. Opens: "When most of us hear stories about the existence of other worlds, we believe they are a creation of the imagin..." |
| I Always Had an Attraction for Wolves | /post/i-always-had-an-attraction-for-wolves | 7 | 4 (+ footer quote) | Blog post. Opens: "Ever since I can remember, I’ve felt a deep attraction to wolves. Not in the way one might admire a beautiful ..." |
| Embracing Your Inner Master: The Journey of Self-Discovery and Healing | /post/i-am-the-master-of-my-fate-i-am-the-captain-of-my-soul-a-journey-back-to-yourself | 7 | 4 (+ footer quote) | Blog post. Opens: "One of my favourite quotes comes from the final lines of the poem Invictus by William Ernest Henley:..." |
| I Am Who I Am | /post/i-am-who-i-am | 7 | 4 (+ footer quote) | Blog post. Opens: "In a world that constantly encourages us to improve, achieve, change, and become more, there is something quie..." |
| I Was Looking for the Way Forward… Then I Saw the Phoenix | /post/i-was-looking-for-the-way-forward-then-i-saw-the-phoenix | 7 | 4 (+ footer quote) | Blog post. Opens: "Sometimes, we receive an answer before we even know what question we are asking...." |
| Is Quantum Healing Hypnosis Technique (QHHT) Safe? | /post/is-quantum-healing-hypnosis-technique-qhht-safe | 7 | 4 (+ footer quote) | Blog post. Opens: "The answer is YES. QHHT is considered a safe, gentle, and deeply relaxing process when facilitated by a traine..." |
| Is That Really Your Inner Voice? | /post/is-that-really-your-inner-voice | 7 | 4 (+ footer quote) | Blog post. Opens: "Many people believe that the voice inside their head is their own...." |
| Healing Generational Trauma: A Journey Towards Self-Discovery | /post/it-ends-with-me | 7 | 4 (+ footer quote) | Blog post. Opens: "Sometimes, the pain we carry did not begin with us. Without even realizing it, we can find ourselves carrying ..." |
| Journey Within: Discover Past Lives with QHHT Hypnotherapy | /post/journey-within-discover-past-lives-with-qhht-hypnotherapy | 7 | 4 (+ footer quote) | Blog post. Opens: "Have you ever been curious about exploring your past lives and gaining deep insights into your subconscious mi..." |
| Embracing the Journey: Building Your Bridge to Healing | /post/life-is-a-bridge-still-under-construction | 7 | 4 (+ footer quote) | Blog post. Opens: "I read those words somewhere years ago, and the older I become, the truer they seem. Many of us spend our live..." |
| Meeting Your Parallel Reality Self: Exploring the Many Versions of You | /post/meeting-your-parallel-reality-self-exploring-the-many-versions-of-you | 7 | 4 (+ footer quote) | Blog post. Opens: "What if the life you are living right now is only one of countless possibilities?..." |
| "Not all treasure is silver and gold, mate." | /post/not-all-treasure-is-silver-and-gold-mate | 7 | 4 (+ footer quote) | Blog post. Opens: "Have you ever wondered why millions of people are fascinated by Jack Sparrow?..." |
| Returning to Yourself: A Spiritual View on Alcohol and Hypnotherapy | /post/returning-to-yourself-a-spiritual-view-on-alcohol-and-hypnotherapy | 7 | 4 (+ footer quote) | Blog post. Opens: "Many people reach a point where familiar habits like turning to alcohol begin to feel heavy. Often, it’s not t..." |
| The Day You Begin to Love Yourself | /post/the-day-i-loved-myself | 7 | 4 (+ footer quote) | Blog post. Opens: "It’s the day you begin to love yourself. Not the polished, perfect version of yourself. Not the version you th..." |
| The Day I Realised I Was No Longer Afraid of Snakes | /post/the-day-i-realised-i-was-no-longer-afraid-of-snakes | 7 | 4 (+ footer quote) | Blog post. Opens: "Living in Queensland, particularly in the country, you learn that there are certain visitors you may occasiona..." |
| The Future You Already Knows | /post/the-future-you-already-knows | 7 | 4 (+ footer quote) | Blog post. Opens: ""Your problems have already been solved. You are just not in that moment in time yet."..." |
| The Loudest Silence of All | /post/the-loudest-silence-of-all | 7 | 4 (+ footer quote) | Blog post. Opens: "There is something incredibly painful about being ignored by someone you care about...." |
| The Rooms We Never Enter Within Ourselves | /post/the-rooms-we-never-enter-within-ourselves | 7 | 4 (+ footer quote) | Blog post. Opens: "Some rooms are bright and familiar. We spend our days there without thinking, the room of responsibility, the ..." |
| The Story You Cannot See | /post/the-story-you-cannot-see | 8 | 4 (+ footer quote) | Blog post. Opens: "You Don't Know What Someone Is Carrying: A Journey of Compassion and Understanding..." |
| How Hypnotherapy Can Help with Depression | /post/unlock-your-potential-qhht-hypnotherapy-sessions-with-marina | 7 | 4 (+ footer quote) | Blog post. Opens: "Depression is mostly based on the individual’s personality, and the strength one carries within. When a person..." |
| What Are Our Triggers Trying to Tell Us? | /post/what-are-our-triggers-trying-to-tell-us | 7 | 4 (+ footer quote) | Blog post. Opens: "Have you ever found yourself reacting to something and later wondered, "Why did that affect me so much?" Perha..." |
| What Would You Say to Your Younger Self? | /post/what-would-you-say-to-your-younger-self | 7 | 4 (+ footer quote) | Blog post. Opens: "If you could sit beside your younger self today, what would you say?..." |
| When always trying to be the Bigger Person becomes too heavy | /post/when-always-trying-to-be-the-bigger-person-becomes-too-heavy | 7 | 4 (+ footer quote) | Blog post. Opens: "Many people reach a point where they say quietly but frankly, “I’m tired of being the bigger person.” Not out ..." |
| Why Do We Criticize So Much And How Can We Start Helping Instead? | /post/why-do-we-criticize-so-much-and-how-can-we-start-helping-instead | 7 | 4 (+ footer quote) | Blog post. Opens: "It’s something many of us quietly notice in our daily lives: people are often quick to criticize one another’s..." |
| Why Social Situations Feel Overwhelming | /post/why-social-situations-feel-overwhelming | 7 | 4 (+ footer quote) | Blog post. Opens: "The idea of going out, making small talk, or being in busy environments can feel exhausting before you have ev..." |
| Why We Struggle to Let Go of Our Traumatic Past | /post/why-we-struggle-to-let-go-of-our-traumatic-past | 7 | 4 (+ footer quote) | Blog post. Opens: "People often wonder why they can’t just move on from their past. But healing is not a switch we can just flip,..." |
