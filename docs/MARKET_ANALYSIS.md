# Victor's Helper - Market Analysis

_Analysis conducted: December 2024_

## Executive Summary

Victor's Helper is a web-based chord chart editor with AI-powered import capabilities. After thorough market research, **this project is best suited as a community tool for personal/church use rather than a commercial venture** due to licensing complexities, entrenched competitors, and the overhead required to build a scalable business in this space.

---

## What Victor's Helper Is

A modern chord chart editor for musicians featuring:

- **Visual chord editing** - Click-to-place, drag-to-reposition workflow
- **Smart transposition** - Preserves accidentals and musical context
- **AI-powered import** - Uses Google Gemini to extract chords/lyrics from images/PDFs
- **Offline-first** - Browser-based persistence (IndexedDB/localStorage)
- **Professional PDF export** - Customizable layouts with logo support
- **Playlist management** - Organize songs into setlists

**Target users:** Musicians, worship leaders, songwriters, music teachers

---

## Competitive Landscape

### Direct Competitors

| Product                         | Pricing                         | Platform      | Key Differentiator                     |
| ------------------------------- | ------------------------------- | ------------- | -------------------------------------- |
| **OnSong**                      | $2.99-$4.99/mo (Free: 30 songs) | iOS only      | Most mature, MIDI/pedal integration    |
| **Planning Center Music Stand** | Part of PCO ecosystem           | Web + Mobile  | Deep church management integration     |
| **Charts by WorshipTools**      | Free                            | iOS/Android   | SongSelect integration, unlimited      |
| **iReal Pro**                   | $15.99 one-time                 | All platforms | Jazz standards library, backing tracks |
| **PraiseCharts**                | Per-chart pricing               | Web           | Extensive catalog, orchestrations      |

### Victor's Helper Advantages

1. **AI-powered chart import** - No competitor offers multimodal AI extraction from images/PDFs
2. **Web-first** - Most competitors are mobile-native
3. **No account required** - Local-first persistence
4. **Free core functionality** - No song limits

### Victor's Helper Disadvantages

1. No established user base or community library
2. No CCLI/SongSelect integration
3. No native mobile app (web-only)
4. No backing track generation (unlike iReal Pro)

---

## Market Size

- Church management software market: **$258-970M in 2024**, growing 5-9% CAGR
- Broader church software market: **$1.2B in 2024**, projected $2.5B by 2033
- 90% of churches now offer hybrid services, driving digital tool adoption

However, chord chart apps specifically represent a small slice of this market.

---

## Copyright & Licensing Analysis

### Christian/Worship Music

**CCLI (Christian Copyright Licensing International)** provides a clear framework:

- Churches pay ~$100-500/year for a Church Copyright License
- Covers reproduction of lyrics and chord charts for congregational use
- Requires reporting which songs are used
- SongSelect provides licensed digital content (200 song download limit/year)

**Implication:** For worship use with a valid CCLI license, importing and using chord charts is legally covered.

### Secular Music

**No equivalent blanket license exists.** Key findings:

| Site            | What Happened                                                      |
| --------------- | ------------------------------------------------------------------ |
| Ultimate Guitar | Faced legal action 2012; now has licenses with Sony/ATV, EMI, etc. |
| Genius          | NMPA takedown 2013-2014; settled and now licenses from publishers  |
| Many tab sites  | Shut down by Music Publishers' Association                         |

**Implications:**

- Lyrics are fully copyrighted (chord progressions alone are not)
- Personal use is low-risk, but platform storage/sharing is risky
- Licensing secular lyrics would require deals with major publishers (impractical for a small project)

### Recommendation

For a personal/church project:

- Focus on worship content (covered by church's CCLI license)
- Support original compositions (no copyright issue)
- Public domain hymns/folk songs (no issue)
- Avoid building features around secular copyrighted lyrics

---

## iReal Pro Comparison

Initially considered iReal Pro as the primary competitor. Key finding:

> "The irealpro to me and everyone that I know is first and foremost a chart READING app, not backing track practicing tool. That is just a bonus."

Many musicians use iReal Pro purely for chord chart reference, not backing tracks. This makes Victor's Helper a more direct competitor for that use case.

### Where Victor's Helper Wins (vs. iReal Pro for charts-only users)

| Feature           | iReal Pro   | Victor's Helper  |
| ----------------- | ----------- | ---------------- |
| Lyrics            | None        | Full support     |
| AI import         | None        | From images/PDFs |
| Multi-page charts | Limited     | Unlimited        |
| Web access        | App only    | Any browser      |
| Platform          | Native apps | Web-first        |

### Where iReal Pro Wins

| Feature             | iReal Pro                   | Victor's Helper           |
| ------------------- | --------------------------- | ------------------------- |
| Community library   | Thousands of jazz standards | None                      |
| Backing tracks      | 51+ styles                  | None                      |
| Offline reliability | Native app                  | PWA (good but not native) |

---

## Enterprise/Multi-Team Features Analysis

Explored building "enterprise" features for churches with multiple services (Children's, Youth, Adult, etc.) with separate spaces and RBAC.

**Finding:** Planning Center Services already offers this:

- Service Types (equivalent to "spaces")
- Folder-based permissions
- Song library with arrangements
- Team management with roles

Competing head-on with Planning Center's 10+ years of development is impractical.

---

## Conclusion

### Why Not Commercial

1. **Entrenched competitors** - OnSong, Planning Center, Charts by WorshipTools have network effects
2. **Free alternatives exist** - Charts by WorshipTools is free with SongSelect integration
3. **Licensing complexity** - CCLI for worship is solvable, secular is not
4. **Cold-start problem** - No community library to attract users
5. **Platform disadvantage** - Worship leaders prefer iPads; native apps beat web for performance contexts

### Why Still Valuable

1. Solves a real problem for your church community
2. AI import genuinely saves time
3. Web-first means no app downloads needed
4. You control your own data (no subscription lock-in)
5. Can be tailored exactly to your community's needs

### Recommended Scope

| Do                                           | Don't                               |
| -------------------------------------------- | ----------------------------------- |
| Focus on worship/church use                  | Chase secular music market          |
| Leverage your church's existing CCLI license | Build CCLI integration from scratch |
| Simple sharing for your teams                | Complex enterprise RBAC             |
| Local-first architecture                     | Heavy cloud infrastructure          |
| Iterate based on your community's feedback   | Build for hypothetical users        |

---

## Sources

- [OnSong Pricing](https://onsongapp.com/pricing/)
- [Charts by WorshipTools](https://www.worshiptools.com/en-us/charts)
- [Planning Center Services](https://www.planningcenter.com/services)
- [CCLI Church Copyright License](https://ccli.com/us/en/church-copyright-license)
- [Church Software Market Size](https://www.verifiedmarketreports.com/product/church-software-market/)
- [iReal Pro](https://www.irealpro.com/)
- [Ultimate Guitar - Copyright](https://www.ultimate-guitar.com/articles/features/the_intersection_of_guitar_tabs_and_copyright_law-92973)
