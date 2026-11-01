// Bygger ../danselister.html fra data.txt + template.html og laver én PDF pr. niveau/dag.
// Kør: node danselister/build.js
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const dir = __dirname, root = path.join(dir, '..');
const lists = []; let cur;
for (const raw of fs.readFileSync(path.join(dir, 'data.txt'), 'utf8').split('\n')) {
  let l = raw.trimEnd(); if (!l) continue;
  if (l.startsWith('# ')) { const [level, day] = l.slice(2).split('|'); lists.push(cur = { level, day, rows: [] }); continue; }
  if (l.startsWith('== ')) { cur.rows.push({ section: l.slice(3) }); continue; }
  const r = {};
  if (l.includes(' ++ ')) [l, r.couple] = l.split(' ++ ');
  const p = s => { if (s === '-') return null; const i = s.indexOf(' / '); const c = s.slice(i + 3); return [s.slice(0, i), c === '?' ? '' : c]; };
  const [a, b] = l.split(' || ');
  r.a = p(a); if (b !== undefined) r.b = p(b) || 'nyd';
  cur.rows.push(r);
}
const html = fs.readFileSync(path.join(dir, 'template.html'), 'utf8').replace('__DATA__', JSON.stringify(lists));
fs.writeFileSync(path.join(root, 'danselister.html'), html);
const slug = s => s.toLowerCase().replace(/æ/g,'ae').replace(/ø/g,'oe').replace(/å/g,'aa').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
(async () => {
  fs.mkdirSync(path.join(dir, 'pdf'), { recursive: true });
  const b = await chromium.launch(), pg = await b.newPage();
  for (const l of lists) {
    await pg.goto('file://' + path.join(root, 'danselister.html') + `#${slug(l.level)}/${slug(l.day)}`);
    await pg.reload();
    const f = path.join(dir, 'pdf', `${slug(l.level)}-${slug(l.day)}.pdf`);
    await pg.pdf({ path: f, preferCSSPageSize: true, printBackground: true });
    console.log(f.replace(root + '/', ''), l.rows.filter(r => r.a).length, 'danse');
  }
  await b.close();
})();
