import type { Lead, PitchContent, Locale } from '@/types/db';

const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    docTitle: 'Commercial Diagnostic',
    prepared: 'Prepared for',
    positionRead: 'Where you appear to stand',
    risks: 'Risk areas worth naming',
    questions: 'Questions worth answering before you commit budget',
    footer:
      'This is a preliminary read, not the full diagnostic. The resolution, the specific fixes and the order to make them, is the work itself.',
    confidential: 'Private & confidential',
  },
  fr: {
    docTitle: 'Diagnostic commercial',
    prepared: 'Préparé pour',
    positionRead: 'Où vous semblez vous situer',
    risks: 'Zones de risque à nommer',
    questions: 'Questions à trancher avant d’engager un budget',
    footer:
      'Ceci est une lecture préliminaire, pas le diagnostic complet. La résolution, les correctifs précis et l’ordre dans lequel les appliquer, constitue le travail lui-même.',
    confidential: 'Privé & confidentiel',
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function pitchHtml(
  content: PitchContent,
  lead: Lead,
  locale: Locale
): string {
  const s = STRINGS[locale];
  const date = new Date().toLocaleDateString(
    locale === 'fr' ? 'fr-FR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const riskItems = content.riskAreas
    .map(
      (r) => `
      <li class="risk">
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.teaser)}</p>
      </li>`
    )
    .join('');

  const questionItems = content.questions
    .map((q) => `<li>${esc(q)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;1,400&family=Geist:wght@300;400;500&display=swap');
  :root {
    --ink:#0e0e10; --surface:#f6f3ea; --accent:#7c2433; --muted:#6b6458; --line:#ddd6c6;
  }
  @page { size: A4; margin: 1.5cm; }
  @media print { .no-print { display: none; } }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; }
  body {
    font-family: 'Geist', system-ui, sans-serif;
    color: var(--ink); background:#fff;
    font-size: 11pt; line-height: 1.55;
  }
  .page { padding: 56px 60px; }
  .display { font-family:'Newsreader', Georgia, serif; font-weight:400; letter-spacing:-0.02em; }
  .eyebrow { font-size:8pt; letter-spacing:0.18em; text-transform:uppercase; color:var(--accent); font-weight:500; }
  header { border-bottom: 1px solid var(--line); padding-bottom: 22px; margin-bottom: 30px;
           display:flex; justify-content:space-between; align-items:flex-end; }
  header .name { font-family:'Newsreader',serif; font-size:18pt; }
  header .meta { text-align:right; font-size:8.5pt; color:var(--muted); }
  h1.display { font-size:26pt; line-height:1.1; margin:6px 0 14px; max-width: 18ch; }
  .lede { font-size:12pt; color:var(--muted); max-width: 60ch; }
  .prepared { font-size:9pt; color:var(--muted); margin-top:18px; }
  .prepared strong { color:var(--ink); }
  section { margin-top: 30px; }
  section > .label { font-size:8pt; letter-spacing:0.16em; text-transform:uppercase; color:var(--accent);
                     border-top:1px solid var(--line); padding-top:14px; margin-bottom:12px; }
  .position { font-family:'Newsreader',serif; font-size:14pt; line-height:1.45; max-width:60ch; }
  ul.risks { list-style:none; margin:0; padding:0; }
  ul.risks .risk { margin-bottom:16px; padding-left:18px; border-left:2px solid var(--accent); }
  ul.risks h3 { font-family:'Newsreader',serif; font-weight:500; font-size:13pt; margin:0 0 3px; }
  ul.risks p { margin:0; color:var(--muted); }
  ul.q { margin:0; padding-left:20px; }
  ul.q li { margin-bottom:8px; }
  .closing { margin-top:28px; font-family:'Newsreader',serif; font-size:13pt; line-height:1.5; max-width:60ch; }
  footer { margin-top:40px; border-top:1px solid var(--line); padding-top:14px;
           font-size:8.5pt; color:var(--muted); display:flex; justify-content:space-between; gap:24px; }
</style>
</head>
<body>
  <div class="page">
    <header>
      <span class="name">Daley Brennan</span>
      <span class="meta">${esc(s.docTitle)}<br/>${esc(date)}</span>
    </header>

    <p class="eyebrow">${esc(s.docTitle)}</p>
    <h1 class="display">${esc(content.headline)}</h1>
    <p class="lede">${esc(content.intro)}</p>
    <p class="prepared">${esc(s.prepared)} <strong>${esc(lead.company_name)}</strong>${
      lead.contact_name ? `, ${esc(lead.contact_name)}` : ''
    }</p>

    <section>
      <div class="label">${esc(s.positionRead)}</div>
      <p class="position">${esc(content.positionRead)}</p>
    </section>

    <section>
      <div class="label">${esc(s.risks)}</div>
      <ul class="risks">${riskItems}</ul>
    </section>

    <section>
      <div class="label">${esc(s.questions)}</div>
      <ul class="q">${questionItems}</ul>
    </section>

    <p class="closing">${esc(content.closing)}</p>

    <footer>
      <span>${esc(s.footer)}</span>
      <span>${esc(s.confidential)}</span>
    </footer>
  </div>
</body>
</html>`;
}
