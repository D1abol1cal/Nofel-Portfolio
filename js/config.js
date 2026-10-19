// ─────────────────────────────────────────────────────────────
//  SITE CONFIG — the only file you should need to edit.
//  Content itself comes live from GitHub on every visit.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  // GitHub account the site reads from
  username: 'D1abol1cal',

  // Profile README (the D1abol1cal/D1abol1cal repo). Branch is tried in order.
  readmeRepo: 'D1abol1cal',
  readmeBranches: ['main', 'master'],

  // Projects:
  //  • If ANY repo has the `topicShow` topic, only those repos are shown.
  //  • Otherwise every non-fork repo with a description is shown (minus `exclude`).
  //  • Repos with `topicFeatured`, or listed under "Latest Projects" in the README,
  //    become the big flagship cards at the top.
  topicShow: 'portfolio',
  topicFeatured: 'featured',
  exclude: ['D1abol1cal', 'Nofel-Portfolio'],
  maxSphereRepos: 24,

  // How long fetched data is reused within one browser session (ms)
  cacheTtl: 10 * 60 * 1000,

  // ID card extras that GitHub doesn't hold
  operatorId: 'D1ABOL1CAL-2026',
  // Profile photo on the ID card. Replace the file, point this at another image,
  // or use your GitHub avatar so it always matches GitHub: 'https://github.com/D1abol1cal.png'
  photo: 'assets/profile-pic.jpg',
  resume: 'assets/Resume.pdf',

  // Contact handles shown on the contact page (README links are merged in)
  extraContacts: [],

  // ── Music ──
  // Five generated themes are built in (Drift, Nebula, Deep Space, Starlight, Orbit).
  // To add real tracks as extra channels, put mp3s in /assets/music and list them here
  // (only use music you have the rights to, e.g. CC0 / royalty-free):
  //   { name: 'Voyager', src: 'assets/music/voyager.mp3', credit: 'Artist — CC0' },
  musicTracks: [],
  musicVolume: 1,        // overall level of the generated themes
  musicTrackVolume: 0.35, // level of mp3 tracks (0–1)
};
