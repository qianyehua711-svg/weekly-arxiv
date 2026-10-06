(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const parseJSON = id => { try { return JSON.parse($(id).textContent); } catch { return id === 'papers-data' ? [] : {}; } };
  const raw = parseJSON('papers-data');
  const config = parseJSON('page-config');
  const papers = Array.isArray(raw) ? raw.map((p, i) => ({
    id: String(p.id ?? p.arxiv_id ?? i), title: String(p.title ?? '无标题'),
    authors: Array.isArray(p.authors) ? p.authors.join(', ') : String(p.authors ?? ''),
    date: String(p.date ?? p.published ?? '').slice(0, 10),
    report_dates: Array.isArray(p.report_dates) ? [...new Set(p.report_dates.map(String))].sort() : [],
    category: String(p.category ?? p.research_category ?? p.research_track ?? '未分类'),
    categories: Array.isArray(p.categories) && p.categories.length ? p.categories.map(String) : [String(p.category ?? p.research_category ?? p.research_track ?? '未分类')],
    abstract_zh: String(p.abstract_zh ?? p.summary_zh ?? ''), abstract_en: String(p.abstract_en ?? p.abstract ?? ''),
    insight: String(p.insight ?? p.relevance ?? ''),
    keywords: Array.isArray(p.keywords) ? p.keywords.map(String) : (Array.isArray(p.matched_keywords) ? p.matched_keywords.map(String) : []),
    score: (p.score ?? p.relevance_score) != null && Number.isFinite(Number(p.score ?? p.relevance_score)) ? Number(p.score ?? p.relevance_score) : null,
    journal: String(p.journal ?? ''), journal_ref: String(p.journal_ref ?? ''), doi: String(p.doi ?? ''),
    impact_factor: p.impact_factor == null || p.impact_factor === '' ? null : Number(p.impact_factor),
    impact_factor_year: String(p.impact_factor_year ?? ''), impact_factor_source: String(p.impact_factor_source ?? ''),
    disposition: String(p.disposition ?? ''), priority: String(p.priority ?? ''),
    note_sections: Array.isArray(p.note_sections) ? p.note_sections.filter(s => s && s.heading && s.body).map(s => ({heading:String(s.heading),body:String(s.body)})) : [],
    matched_research_axes: Array.isArray(p.matched_research_axes) ? p.matched_research_axes.map(String) : [],
    url: String(p.url ?? p.arxiv_url ?? ''), pdf_url: String(p.pdf_url ?? ''),
  })) : [];
  let selectedId = null;
  let bookmarks = new Set(JSON.parse(localStorage.getItem('daily-arxiv-bookmarks') || '[]'));
  let prefs = JSON.parse(localStorage.getItem('daily-arxiv-prefs') || '{"keywords":[],"authors":[]}');
  const safeUrl = url => { try {const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : null;} catch {return null;} };
  const el = (tag, cls, content) => { const e=document.createElement(tag); if(cls)e.className=cls; if(content!==undefined)e.textContent=content; return e; };
  const tokens = str => str.split(/[,，;；\n]+/).map(s=>s.trim()).filter(Boolean);
  const highlight = (element, text, words) => {
    const terms=words.filter(Boolean).sort((a,b)=>b.length-a.length);
    if(!terms.length){element.textContent=text;return;}
    const low=text.toLowerCase();let cursor=0;
    while(cursor<text.length){let pos=-1,hit='';for(const term of terms){let k=low.indexOf(term.toLowerCase(),cursor);if(k>=0&&(pos<0||k<pos)){pos=k;hit=term;}}if(pos<0){element.append(document.createTextNode(text.slice(cursor)));break;}if(pos>cursor)element.append(document.createTextNode(text.slice(cursor,pos)));const m=el('mark','highlight',text.slice(pos,pos+hit.length));element.append(m);cursor=pos+hit.length;}
  };
  const filtered = () => {
    const q=$('keyword').value.trim().toLowerCase(), c=$('category').value, from=$('date-from').value, to=$('date-to').value;
    let out=papers.filter(p => (!q || [p.title,p.authors,p.abstract_zh,p.abstract_en,p.category,p.journal,p.journal_ref,...p.categories,...p.keywords].join(' ').toLowerCase().includes(q)) && (!c||p.categories.includes(c)) && (!from||p.date>=from) && (!to||p.date<=to) && (!$('bookmarks-only').checked||bookmarks.has(p.id)));
    const sort=$('sort').value;
    const rankSort=field=>(a,b)=>((b[field] ?? -1)-(a[field] ?? -1) || (b.score ?? -1)-(a.score ?? -1) || b.date.localeCompare(a.date));
    out.sort((a,b) => sort==='oldest' ? a.date.localeCompare(b.date) : sort==='title' ? a.title.localeCompare(b.title) : sort==='score' ? ((b.score ?? -1)-(a.score ?? -1) || b.date.localeCompare(a.date)) : sort==='impact-factor' ? rankSort('impact_factor')(a,b) : b.date.localeCompare(a.date));
    return out;
  };
  const saveBookmarks=()=>localStorage.setItem('daily-arxiv-bookmarks',JSON.stringify([...bookmarks]));
  const reportBadge=p=>{
    const badge=el('div','reported-badge');
    badge.append(el('span','reported-label','✓ 已汇报'));
    for(const date of p.report_dates){const time=el('time','report-date',date);time.dateTime=date;badge.append(time);}
    badge.setAttribute('aria-label','已汇报，汇报日期：'+p.report_dates.join('、'));
    return badge;
  };
  const renderList=()=>{
    const list=$('paper-list');list.replaceChildren();const items=filtered();$('result-count').textContent=items.length+' 篇';$('total-counter').textContent=new Set(papers.filter(p=>p.id&&p.title&&p.url).map(p=>p.id)).size;
    $('no-results').classList.toggle('hidden',items.length>0);
    if(items.length && !items.some(p=>p.id===selectedId))selectedId=items[0].id;
    if(!items.length)selectedId=null;
    for(const p of items){
      const card=el('article','paper-card'+(p.id===selectedId?' selected':''));card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','查看 '+p.title);
      const top=el('div','paper-card-top'),categoryTags=el('div','category-tags');p.categories.filter(name=>name!=='已汇报').slice(0,4).forEach(name=>categoryTags.append(el('span','category-tag'+(['LIS/FLIER','PAH','\u5bcc\u52d2\u70ef'].includes(name)?' category-focus':''),name)));
      const dates=el('div','paper-dates');if(p.report_dates.length)dates.append(reportBadge(p));const published=el('span','paper-date',p.date);published.title='文献发表日期';dates.append(published);top.append(categoryTags,dates);card.append(top);
      if(p.score!==null||p.impact_factor!==null){const rating=el('div','score-row');if(p.score!==null)rating.append(el('span','score-badge','Relevance '+p.score+'/100'));if(p.impact_factor!==null)rating.append(el('span','impact-factor-badge','IF '+p.impact_factor));if(p.disposition)rating.append(el('span','status-badge',p.disposition));card.append(rating);}
      const titleRow=el('div','paper-title-row'),title=el('h2');highlight(title,p.title,prefs.keywords||[]);titleRow.append(title);card.append(titleRow);
      const authors=el('div','paper-author');highlight(authors,p.authors,prefs.authors||[]);card.append(authors);
      card.append(el('div','paper-preview',p.abstract_zh||p.abstract_en||'暂无摘要'));
      const bottom=el('div','card-bottom'),tags=el('div','tag-row');p.keywords.slice(0,4).forEach(k=>tags.append(el('span','tag',k)));bottom.append(tags);card.append(bottom);
      const star=el('button','bookmark'+(bookmarks.has(p.id)?' active':''),bookmarks.has(p.id)?'★':'☆');star.type='button';star.title='收藏/取消收藏';star.setAttribute('aria-label',star.title);star.onclick=e=>{e.stopPropagation();if(bookmarks.has(p.id))bookmarks.delete(p.id);else bookmarks.add(p.id);saveBookmarks();renderList();};titleRow.append(star);
      card.addEventListener('click',()=>{selectedId=p.id;renderList();});card.addEventListener('keydown',e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectedId=p.id;renderList();}});list.append(card);
    }
    renderDetail();
  };
  const renderDetail=()=>{
    const area=$('paper-detail');area.replaceChildren();const p=papers.find(p=>p.id===selectedId);
    if(!p){area.append(el('div','empty-detail','没有选中的论文'));return;}
    const heading=el('div','detail-heading');heading.append(el('div','detail-overline',p.categories.filter(name=>name!=='已汇报').join(' · ').toUpperCase()+'  /  '+p.date));if(p.report_dates.length)heading.append(reportBadge(p));area.append(heading);area.append(el('h2','detail-title',p.title));area.append(el('div','detail-meta',p.authors));
    if(p.score!==null){const score=el('div','score-row');score.append(el('span','score-badge',`相关性评分 ${p.score}/100`));if(p.disposition)score.append(el('span','status-badge',p.disposition));area.append(score);}
    const section=(heading,body,insight=false)=>{if(!body)return;const s=el('section','detail-section'+(insight?' insight':''));s.append(el('h3','',heading),el('p','',body));area.append(s);};
    const btns=el('div','detail-actions');[[p.url,'↗ arXiv 原文'],[p.pdf_url,'↓ PDF 原文']].forEach(([url,label])=>{const safe=safeUrl(url);if(safe){const a=el('a','primary-btn',label);a.href=safe;a.target='_blank';a.rel='noopener noreferrer';btns.append(a);}});
    const star=el('button','outline-btn',bookmarks.has(p.id)?'★ 已收藏':'☆ 收藏');star.onclick=()=>{if(bookmarks.has(p.id))bookmarks.delete(p.id);else bookmarks.add(p.id);saveBookmarks();renderList();};btns.append(star);area.append(btns);
    section('研究关联 / 评分依据',p.insight,true);
    if(p.note_sections.length){for(const note of p.note_sections)section(note.heading,note.body);}
    else {section('中文摘要',p.abstract_zh);section('Original Abstract',p.abstract_en);}
    if(p.matched_research_axes.length){const s=el('section','detail-section');s.append(el('h3','','匹配研究轴'));s.append(el('p','',p.matched_research_axes.join('、')));area.append(s);}
    if(p.keywords.length){const s=el('section','detail-section');s.append(el('h3','','关键词'));const tags=el('div','tag-row');p.keywords.forEach(k=>tags.append(el('span','tag',k)));s.append(tags);area.append(s);}
  };
  const categoryCatalog=['LIS/FLIER','行星状星云','光学离子诊断','AGB 星','原行星状星云','恒星晚期演化','星周包层','恒星风与质量损失','天体化学','毫米波分子谱线','碳链分子','PAH','富勒烯','未识别红外发射带','量子化学','机器学习','FAST 中性氢观测','红外 H₂ / Brγ','分子丰度与化学组成','分子谱线巡天与指认','分子光谱与碰撞数据','实验天体化学与星际冰','气尘与表面化学','辐射转移与化学模型','分子云与星际介质观测'];
  const categories=['已汇报',...[...new Set([...papers.flatMap(p=>p.categories),...categoryCatalog])].filter(c=>c!=='已汇报').sort((a,b)=>a.localeCompare(b))];categories.forEach(c=>{const o=el('option','',`${c}（${papers.filter(p=>p.categories.includes(c)).length}篇）`);o.value=c;$('category').append(o);});
  $('sort').querySelector('[value="impact-factor"]').textContent='Impact factor sort ('+papers.filter(p=>p.impact_factor!==null).length+' papers)';
  if(config.generated_at)$('data-updated').textContent='更新：'+config.generated_at;
  for(const id of ['keyword','category','date-from','date-to','sort','bookmarks-only'])$(id).addEventListener(id==='keyword'?'input':'change',renderList);
  $('clear-dates').onclick=()=>{$('date-from').value='';$('date-to').value='';renderList();};
  const dialog=$('settings-dialog');$('open-settings').onclick=()=>{$('interests').value=(prefs.keywords||[]).join(', ');$('authors').value=(prefs.authors||[]).join(', ');dialog.showModal();};
  $('reset-settings').onclick=()=>{$('interests').value='';$('authors').value='';};
  $('save-settings').onclick=()=>{prefs={keywords:tokens($('interests').value),authors:tokens($('authors').value)};localStorage.setItem('daily-arxiv-prefs',JSON.stringify(prefs));renderList();};
  document.addEventListener('keydown',e=>{if(dialog.open||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||!['ArrowLeft','ArrowRight'].includes(e.key))return;const items=filtered(),i=items.findIndex(p=>p.id===selectedId),next=items[i+(e.key==='ArrowRight'?1:-1)];if(next){selectedId=next.id;renderList();}});
  renderList();
})();
