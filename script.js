const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uniq = a => [...new Set(a)].filter(Boolean).sort();
// Display groups requested for the regional view. These are keyword matches,
// not a replacement for the source book's botanical regions or a surveyed map.
const ZONES = [
  ['Өндөр уулын бүс', /өндөр уул|өндөрлөг|таг(?:ийн|т|\s)|мөнх цас/],
  ['Тайгын бүс', /тайг|шилмүүст ой|шинэсэн ой|хушин ой/],
  ['Ойт хээрийн бүс', /ойт[ -]?хээр/],
  ['Хангайн бүс', /хангай/],
  ['Говийн бүс', /гов/],
  ['Цөлийн бүс', /цөл/]
];
const REG = ZONES.map(([name]) => name);
const plantZones = new Map(D.map(p => {
  const local = p.habitat.split(/Монголд\s*:/).at(-1).toLowerCase();
  return [p.no, ZONES.filter(([, pattern]) => pattern.test(local)).map(([name]) => name)];
}));
const zonesFor = p => plantZones.get(p.no);
const HAB = uniq(D.flatMap(p => p.hab));
const IU = {'устаж байгаа':'CR','устаж болзошгүй':'EN','эмзэг':'VU','ховордож болзошгүй':'NT','анхааралд өртөхөөргүй':'LC','мэдээлэл дутмаг':'DD','үнэлгээ хийгдээгүй':'NE','үнэлэх боломжгүй':'NA'};
const iu = s => s ? s.charAt(0).toUpperCase() + s.slice(1) + (IU[s] ? ` (${IU[s]})` : '') : 'Эх сурвалжид заагаагүй';
const RL = D.filter(p => p.src === 'Улаан данс');
const VW = {
  redbook: {t:'Монгол улсын Улаан ном',items:D,ft:'Монголын Улаан ном (2013), Дээд ургамал: №1–135. Мэдээлэл, зураг нь хэрэглэгчийн өгсөн PDF эхээс авсан.'},
  redlist: {t:'Дэлхийн ургамлын Улаан дансны сан',items:RL,ft:'Энд Монголын Улаан ном (2013)-д дурдсан IUCN үнэлгээг харуулна. Үнэлгээ нь тухайн номын үеийн мэдээлэл.'},
  regions: {t:'Ургах бүс нутаг',items:D,ft:'Зургаан бүсийн шүүлтүүр нь Монгол дахь тархац, ургах орчны бичвэрийн түлхүүр үгт тулгуурласан. Нэг ургамал хэд хэдэн бүсэд багтаж болно. Бүс тодорхойлоогүй ургамлуудыг «Бүгд»-ээс үзнэ. Бүрэн тархацыг дэлгэрэнгүй мэдээллээс шалгана.'}
};
$('#plant-total').textContent = D.length;
$$('[data-n]').forEach(e => { const k=e.dataset.n; e.textContent=k==='regions' ? `${REG.length} бүс нутаг · ${D.filter(p=>zonesFor(p).length).length} ургамал` : `${VW[k].items.length} ургамал`; });
function opts(id,label,values) { $(id).innerHTML=`<option value="">${label}</option>`+values.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join(''); }
opts('#cat','Бүх ангилал',uniq(D.map(p=>p.cat)).map(x=>[x,x]));
opts('#iw','Олон улсын үнэлгээ',uniq(RL.map(p=>p.iw)).map(x=>[x,iu(x)]));
opts('#ir','Бүс нутгийн үнэлгээ',uniq(RL.map(p=>p.ir)).map(x=>[x,iu(x)]));
opts('#fam','Бүх овог',uniq(D.map(p=>p.fam)).map(x=>[x,`${x} (${D.find(p=>p.fam===x).famMN})`]));
opts('#hab','Бүх ургах орчин',HAB.map(x=>[x,x]));
let view='',reg='';
function show(v) {
  view=v;reg='';$('#home').hidden=!!v;$('#view').hidden=!v;
  if(!v){scrollTo(0,0);return;}
  $('#vt').textContent=VW[v].t;$('#ft').textContent=VW[v].ft;$('#q').value='';
  $$('.f select,#regs').forEach(e=>{e.hidden=!(e.dataset.v||'').split(' ').includes(v);if(e.tagName==='SELECT')e.value='';});
  $('#regs').innerHTML='<button class="on" data-r="">Бүгд</button>'+REG.map(r=>`<button data-r="${esc(r)}">${esc(r)} (${D.filter(p=>zonesFor(p).includes(r)).length})</button>`).join('');
  scrollTo(0,0);draw();
}
$('#regs').onclick=e=>{const b=e.target.closest('button');if(!b)return;reg=b.dataset.r;$$('#regs button').forEach(x=>x.classList.toggle('on',x===b));draw();};
$$('[data-go]').forEach(b=>b.onclick=()=>location.hash=b.dataset.go);
$('#back').onclick=()=>location.hash='';
addEventListener('hashchange',()=>show(VW[location.hash.slice(1)]?location.hash.slice(1):''));
const value=id=>$('#'+id).hidden?'':$('#'+id).value;
function draw() {
  if(!view)return;
  const q=$('#q').value.trim().toLowerCase();
  const filters={cat:value('cat'),iw:value('iw'),ir:value('ir'),fam:value('fam')},hab=value('hab');
  const found=VW[view].items.filter(p=>(!q||`${p.no} ${p.mn} ${p.laFull} ${p.fam} ${p.famMN}`.toLowerCase().includes(q))&&Object.entries(filters).every(([k,v])=>!v||p[k]===v)&&(!hab||p.hab.includes(hab))&&(!reg||zonesFor(p).includes(reg)));
  $('#n').textContent=`${found.length} ургамал (нийт ${VW[view].items.length})`;
  $('#grid').innerHTML=found.length?found.map(p=>{
    const badge=view==='redlist'?iu(p.ir):p.cat;
    const code=view==='redlist'?(IU[p.ir]||'NA'):(p.cat==='Нэн ховор'?'NH':'');
    const sub=view==='regions'?(zonesFor(p).join(', ')||'Бүс тодорхойлоогүй'):view==='redlist'?`Олон улс: ${iu(p.iw)}`:`№${p.no} · ${p.fam}`;
    return `<button class="card" data-no="${p.no}"><div class="im"><img src="${esc(p.img)}" alt="${esc(p.mn)} — эх номын зураг, тархац" loading="lazy"><span class="b ${code}">${esc(badge)}</span></div><div class="tx"><h3>${esc(p.mn)}</h3><div class="la">${esc(p.la)}</div><div class="mt">${esc(sub)}</div></div></button>`;
  }).join(''):'<p class="empty">Тохирох ургамал олдсонгүй. Шүүлтүүрээ багасгана уу.</p>';
}
['q','cat','iw','ir','fam','hab'].forEach(id=>$('#'+id).addEventListener('input',draw));
$('#grid').onclick=e=>{
  const b=e.target.closest('.card');if(!b)return;
  const p=D.find(p=>p.no===Number(b.dataset.no));
  const row=(k,v)=>v?`<div class="r"><b>${esc(k)}</b>${esc(v)}</div>`:'';
  $('#det').innerHTML=p.images.map(src=>`<div class="hero"><img src="${esc(src)}" alt="${esc(p.mn)} — зураг ба тархацын газрын зураг"></div>`).join('')+
    `<div class="cap">Эх номын зураг, тархацын газрын зураг · №${p.no}</div><div class="dl"><h2>${esc(p.mn)}</h2><div class="la">${esc(p.laFull)}</div>`+
    row('Овог',`${p.fam} — ${p.famMN}`)+row('Бүлэг',p.division)+
    p.sections.map(s=>row(s.title,s.text)).join('')+
    `<p class="note">Эх сурвалж: Монголын Улаан ном, 2013. №${p.no}. PDF-ийн ${p.pages[0]}–${p.pages.at(-1)}-р хуудас.<br><a class="source-link" href="${p.source}#page=${p.pages[0]}" target="_blank" rel="noopener">Эх номын хуудсыг нээх ↗</a></p><details class="source-text"><summary>Эхээс гаргасан бүрэн бичвэр</summary><pre>${esc(p.fullText)}</pre></details></div>`;
  $('#dlg').showModal();$('#dlg').scrollTop=0;
};
$('#cl').onclick=()=>$('#dlg').close();
$('#dlg').onclick=e=>{if(e.target.id==='dlg')e.target.close();};
show(VW[location.hash.slice(1)]?location.hash.slice(1):'');
