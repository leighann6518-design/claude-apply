
"use strict";
const DATA=JSON.parse(document.getElementById("site-data").textContent);
const ARTICLES=DATA.articles, INSIGHTS=DATA.insights, PLAN=DATA.plan, META=DATA.meta;
const BY_ID=Object.fromEntries(ARTICLES.map(a=>[a.id,a]));
const TOPICS=[...new Set(ARTICLES.map(a=>a.topic))];
const COUNTS={all:ARTICLES.length,body:ARTICLES.filter(a=>a.status==="body").length,excerpt:ARTICLES.filter(a=>a.status==="excerpt").length,catalog:ARTICLES.filter(a=>a.status==="catalog").length};
const LABELS={body:"正文要点",excerpt:"片段分析",catalog:"仅目录"};
const STORE_KEY="enterprise-ai-fieldnotes-v1";
let preferences={saved:[],read:[],notes:{},tasks:[]};
let storageAvailable=true;
try{const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"null");if(saved&&typeof saved==="object"){preferences.saved=Array.isArray(saved.saved)?saved.saved:[];preferences.read=Array.isArray(saved.read)?saved.read:[];preferences.notes=saved.notes&&typeof saved.notes==="object"?saved.notes:{};preferences.tasks=Array.isArray(saved.tasks)?saved.tasks:[];}}catch(e){storageAvailable=false;}
const $=(selector,parent=document)=>parent.querySelector(selector);
const $$=(selector,parent=document)=>[...parent.querySelectorAll(selector)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paths={
 overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 library:'<path d="M4 4h6v16H4zM14 4h6v16h-6zM7 8h0M17 8h0M7 16h0M17 16h0"/>',
 insights:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/><circle cx="12" cy="12" r="4"/>',
 plan:'<path d="M9 4h11v16H4V4h2M8 3h7v3H8zM8 11l1.5 1.5L12 10M8 16l1.5 1.5L12 15M15 11h2M15 16h2"/>',
 method:'<path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6"/>',
 bookmark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M16 16l5 5"/>',
 external:'<path d="M14 3h7v7M21 3l-11 11M10 4H4v16h16v-6"/>',
 check:'<path d="M4 12l5 5L20 6"/>',
 arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5M4 17v4h16v-4"/>',
 note:'<path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4"/>'
};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
const badge=a=>`<span class="badge ${a.status}">${LABELS[a.status]}</span>`;
const sourceLink=a=>a.url?`<a class="source-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">阅读英文原文 ${icon("external")}</a>`:`<a class="source-link" href="${esc(META.sourceCategory)}" target="_blank" rel="noopener noreferrer">查看原栏目（尚未取得正文链接） ${icon("external")}</a>`;
function savePreferences(){try{localStorage.setItem(STORE_KEY,JSON.stringify(preferences));return true;}catch(e){storageAvailable=false;return false;}}
let toastTimer;
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);}
function downloadFile(name,content,type="text/plain;charset=utf-8"){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function readRoute(){const h=location.hash.replace(/^#/,"")||"overview";const [p,q=""]=h.split("?");const [view,id]=p.split("/");return {view,id,params:new URLSearchParams(q)};}
let route=readRoute(),libraryState={q:"",topic:"all",kind:"all",status:"all",sort:"priority",saved:false,page:1};
function updateNav(){
 const view=route.view==="article"?"library":route.view;
 const items=[["overview","研究总览",""],["library","文章资料库",COUNTS.all],["insights","企业洞察",INSIGHTS.length],["plan","90 天行动",""],["method","来源与边界",""]];
 $("#mainNav").innerHTML=items.map(([id,label,count])=>`<a class="nav-link ${view===id?"active":""}" ${view===id?'aria-current="page"':""} href="#${id}">${icon(id)}<span>${label}</span>${count!==""?`<span class="nav-count">${count}</span>`:""}</a>`).join("")+`<a class="nav-link" href="#library?saved=1">${icon("bookmark")}<span>我的收藏</span><span class="nav-count" id="savedCount">${preferences.saved.length}</span></a>`;
 $("#topicNav").innerHTML=TOPICS.map(t=>`<a href="#library?topic=${encodeURIComponent(t)}"><span>${esc(t)}</span><span>${ARTICLES.filter(a=>a.topic===t).length}</span></a>`).join("");
 $("#breadcrumb").textContent=route.view==="article"?"文章资料库 / 阅读":({overview:"研究总览",library:"文章资料库",insights:"企业洞察",plan:"90 天行动",method:"来源与边界"}[view]||"研究总览");
}
function bookmarkButton(a,compact=true){const saved=preferences.saved.includes(a.id);return `<button class="${compact?"icon-btn":"btn compact"} ${saved?"saved active":""}" data-save="${a.id}" aria-label="${saved?"取消收藏":"收藏"}：${esc(a.title)}" aria-pressed="${saved}">${icon("bookmark")}${compact?"":saved?"已收藏":"收藏文章"}</button>`;}
function card(a,featured=false){return `<article class="card ${a.status==="catalog"?"pending":""}">
 <div class="card-top"><span class="topic-label">${esc(a.topic)}</span>${badge(a)}</div>
 <h3><a href="#article/${a.id}" class="clamp-2">${esc(a.title)}</a></h3>
 <p class="clamp-3">${esc(featured?a.insight||a.summary:a.summary)}</p>
 <div class="card-foot"><span><time datetime="${a.date}">${a.date.replace(/-/g,".")}</time> · ${esc(a.kind)}${preferences.read.includes(a.id)?" · 已读":""}</span>${bookmarkButton(a)}</div>
 </article>`;}
function sources(ids){return `<div class="source-chips">${ids.map(id=>BY_ID[id]?`<a href="#article/${id}" title="${esc(BY_ID[id].originalTitle)}">↗ ${esc(BY_ID[id].title)}</a>`:"").join("")}</div>`;}
function statStrip(){return `<div class="stat-strip">
 <div class="stat"><div class="stat-value">${COUNTS.all}<span style="font-size:12px;letter-spacing:0;margin-left:5px">篇</span></div><div class="stat-label">已发现条目</div><div class="stat-detail">去重目录 · 不宣称全量</div></div>
 <div class="stat"><div class="stat-value">${COUNTS.body}</div><div class="stat-label">正文要点分析</div><div class="stat-detail">已读主要相关段落</div></div>
 <div class="stat partial"><div class="stat-value">${COUNTS.excerpt}</div><div class="stat-label">片段级初步分析</div><div class="stat-detail">结论仍待完整正文验证</div></div>
 <div class="stat"><div class="stat-value">${COUNTS.catalog}</div><div class="stat-label">仅目录，待补正文</div><div class="stat-detail">不编造内容或洞察</div></div></div>`;}
function renderOverview(){return `
 <section class="hero">
  <div><div class="eyebrow">A RESEARCH COLLECTION / SEPTEMBER 2026</div>
  <h1>把企业 AI 的经验，<br>变成<em>可执行的决策。</em></h1>
  <p class="hero-description">不止看工具能做什么，更看企业如何改变工作。<br>基于 Claude Enterprise AI 栏目，整理中文摘要、独立洞察与试验建议，逐篇保留来源和阅读边界。</p>
  <div class="hero-actions"><a class="btn primary" href="#insights">阅读 8 个核心洞察 ${icon("arrow")}</a><a class="btn" href="#library">浏览文章资料库</a></div>
  <div class="hero-notes"><span>71 个已发现条目</span><span>7 个企业主题</span><span>非官方中文研究</span></div></div>
  <div class="hero-card"><div class="overline"><span>THE CENTRAL QUESTION</span><span>01 / 08</span></div><h3>生成更快之后，<br><span>交付真的变快了吗？</span></h3><div class="flow-mini"><span class="flow-node">清晰委托</span><span>→</span><span class="flow-node">受控执行</span><span>→</span><span class="flow-node final">验收采用</span></div><p>我们的研究视角：以合格结果，而非调用次数衡量价值。</p></div>
 </section>
 ${statStrip()}
 <p class="coverage-note"><span>ⓘ</span><span>正文要点不等于逐段全文精读；目录快照存在差异，尚未确认栏目全量。本站提供摘要与分析，<strong>不含整篇译文</strong>。<a href="#method">查看覆盖明细</a></span></p>
 <div class="heading-row"><div><h2>从这三篇开始</h2><p>先理解数据、学习闭环与验证，再选择工具。</p></div><a class="text-link" href="#library">全部文章 ↗</a></div>
 <section class="grid featured">${["selfserve-analytics","abc-legal","datadog"].map(id=>card(BY_ID[id],true)).join("")}</section>
 <div class="heading-row"><div><h2>一个更值得采用的研究框架</h2><p>把事实、推断和行动分开，降低“照抄案例”的风险。</p></div></div>
 <section class="insight-preview"><div><div class="eyebrow">FROM EVIDENCE TO ACTION</div><h2>案例提供线索，<br>试验验证你的答案。</h2><p>厂商案例有启发，但不是本企业的效果承诺。我们将跨案例判断转成可以被验证、被否定、被修正的工作假设。</p><a class="text-link" href="#plan">查看 90 天行动路径 →</a></div><div class="compact-points">
 <div class="compact-point"><span>01</span><div><h4>看见机制，而非只看倍数</h4><p>数据、权限、工作分工和验收如何连接？</p></div></div>
 <div class="compact-point"><span>02</span><div><h4>分清提升了什么</h4><p>产量、质量、周期、采用与收入不是同一个指标。</p></div></div>
 <div class="compact-point"><span>03</span><div><h4>从可回退的小试验开始</h4><p>先建立基线、质量门槛和责任，再扩大范围。</p></div></div>
 </div></section>
 <div class="heading-row"><div><h2>近期已取得正文的文章</h2><p>发布日期排序；只展示本次有正文要点分析的条目。</p></div><a class="text-link" href="#library?sort=newest&status=body">按时间查看 ↗</a></div>
 <section class="grid">${ARTICLES.filter(a=>a.status==="body").sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(a=>card(a)).join("")}</section>
 <div class="research-banner"><strong>阅读提示：</strong>原文事实在“中文摘要”，我们的推断在“企业洞察”，未经验证的效果不会写成保证。产品公告按其发布日期理解，部署前请重新核对当前能力与条款。</div>
`;}
function renderLibrary(){
 const p=route.params;
 libraryState={q:p.get("q")||"",topic:p.get("topic")||"all",kind:p.get("kind")||"all",status:p.get("status")||"all",sort:p.get("sort")||"priority",saved:p.get("saved")==="1",page:1};
 return `<div class="page-head"><div class="eyebrow">THE ARTICLE LIBRARY</div><h1>文章资料库</h1><p>按主题、类型与阅读深度筛选。${COUNTS.body} 篇正文要点、${COUNTS.excerpt} 篇片段分析、${COUNTS.catalog} 篇目录待补；每一项都有明确边界。</p></div>
 <div class="filter-panel">
 <label class="search-field" for="librarySearch">${icon("search")}<input id="librarySearch" type="search" autocomplete="off" placeholder="搜索中英文标题、摘要、洞察或公司名称…" value="${esc(libraryState.q)}"><kbd>/</kbd></label>
 <div class="filter-row" id="topicFilters" aria-label="主题筛选">${["all",...TOPICS].map(t=>`<button class="chip ${libraryState.topic===t?"active":""}" data-topic="${esc(t)}" aria-pressed="${libraryState.topic===t}">${t==="all"?"全部主题":esc(t)}</button>`).join("")}</div>
 <div class="filter-selects"><div class="filter-controls">
 <select id="kindFilter" aria-label="文章类型"><option value="all">全部文章类型</option>${[...new Set(ARTICLES.map(a=>a.kind))].map(k=>`<option ${libraryState.kind===k?"selected":""}>${esc(k)}</option>`).join("")}</select>
 <select id="statusFilter" aria-label="阅读覆盖"><option value="all">全部阅读深度</option>${Object.entries(LABELS).map(([k,v])=>`<option value="${k}" ${libraryState.status===k?"selected":""}>${v}</option>`).join("")}</select>
 <select id="sortFilter" aria-label="文章排序">${[["priority","精选优先"],["newest","发布日期：新 → 旧"],["oldest","发布日期：旧 → 新"]].map(([k,v])=>`<option value="${k}" ${libraryState.sort===k?"selected":""}>${v}</option>`).join("")}</select>
 <button class="btn compact ${libraryState.saved?"active":""}" id="savedFilter" aria-pressed="${libraryState.saved}">${icon("bookmark")} 只看收藏</button></div><div id="resultCount" class="filter-result" aria-live="polite"></div></div></div>
 <section id="libraryGrid" class="grid" aria-label="文章列表"></section><nav id="pagination" class="pagination" aria-label="文章分页"></nav>`;
}
function renderLibraryResults(){
 const s=libraryState,q=s.q.trim().toLocaleLowerCase(),tokens=q.split(/\s+/).filter(Boolean);
 const items=ARTICLES.filter(a=>(s.topic==="all"||a.topic===s.topic)&&(s.kind==="all"||a.kind===s.kind)&&(s.status==="all"||a.status===s.status)&&(!s.saved||preferences.saved.includes(a.id))&&tokens.every(t=>[a.title,a.originalTitle,a.summary,a.insight,a.topic].join(" ").toLocaleLowerCase().includes(t)));
 items.sort((a,b)=>s.sort==="oldest"?a.date.localeCompare(b.date):s.sort==="newest"?b.date.localeCompare(a.date):(b.priority-a.priority||({body:0,excerpt:1,catalog:2}[a.status]-{body:0,excerpt:1,catalog:2}[b.status])||b.date.localeCompare(a.date)));
 const pageSize=12,pages=Math.max(1,Math.ceil(items.length/pageSize));s.page=Math.min(s.page,pages);
 $("#resultCount").innerHTML=`共 <b>${items.length}</b> 篇${s.saved?"收藏":""} · 第 ${s.page} / ${pages} 页`;
 $("#libraryGrid").innerHTML=items.length?items.slice((s.page-1)*pageSize,s.page*pageSize).map(a=>card(a)).join(""):`<div class="empty"><h3>${s.saved?"这里还没有匹配的收藏":"没有找到匹配文章"}</h3><p>${s.saved?"点击文章卡片上的书签保存文章，或调整筛选条件。":"试试公司英文名、较短关键词，或清除筛选条件。"}</p><button class="btn compact" data-action="reset-filters">清除筛选</button></div>`;
 $("#pagination").innerHTML=pages>1?`<button data-page="${s.page-1}" ${s.page===1?"disabled":""} aria-label="上一页">←</button>${Array.from({length:pages},(_,i)=>`<button class="${s.page===i+1?"active":""}" data-page="${i+1}" ${s.page===i+1?'aria-current="page"':""}>${i+1}</button>`).join("")}<button data-page="${s.page+1}" ${s.page===pages?"disabled":""} aria-label="下一页">→</button>`:"";
 $$("#topicFilters [data-topic]").forEach(el=>{el.classList.toggle("active",el.dataset.topic===s.topic);el.setAttribute("aria-pressed",String(el.dataset.topic===s.topic));});
 $("#savedFilter").classList.toggle("active",s.saved);$("#savedFilter").setAttribute("aria-pressed",String(s.saved));
}
function bindLibrary(){
 $("#librarySearch").addEventListener("input",e=>{libraryState.q=e.target.value;libraryState.page=1;renderLibraryResults();});
 [["kindFilter","kind"],["statusFilter","status"],["sortFilter","sort"]].forEach(([el,key])=>$("#"+el).addEventListener("change",e=>{libraryState[key]=e.target.value;libraryState.page=1;renderLibraryResults();}));
 renderLibraryResults();
}
function renderArticle(id){
 const a=BY_ID[id];if(!a)return `<div class="empty"><h1>未找到该条目</h1><p>请返回资料库选择文章。</p><a class="btn" href="#library">返回文章库</a></div>`;
 const index=ARTICLES.findIndex(x=>x.id===id),before=ARTICLES[index-1],after=ARTICLES[index+1],isRead=preferences.read.includes(id),related=ARTICLES.filter(x=>x.topic===a.topic&&x.id!==id&&x.status==="body").sort((x,y)=>y.priority-x.priority).slice(0,3);
 return `<div class="reader-top"><a class="text-link" href="#library">← 返回文章资料库</a><div class="reader-actions">${bookmarkButton(a,false)}<button class="btn compact ${isRead?"active":""}" data-read="${id}" aria-pressed="${isRead}">${icon("check")}<span>${isRead?"已标记阅读":"标记已读"}</span></button><button class="btn compact" data-export-article="${id}">${icon("download")}导出本篇</button><button class="btn compact" data-action="print">打印</button></div></div>
 <div class="reader-layout"><article class="reader-main">
 <header class="reader-header"><div class="article-meta"><span class="topic-label">${esc(a.topic)}</span><span>${esc(a.kind)}</span><span>原文发布 ${a.date}</span>${badge(a)}</div><h1>${esc(a.title)}</h1><p class="original-title">${esc(a.originalTitle)}</p>${sourceLink(a)}</header>
 ${a.status==="catalog"?`<section class="reader-section"><div class="boundary-box"><h3>正文尚未取得</h3><p>${esc(a.summary)}</p><div class="scope-details">本条目没有生成正文摘要或企业洞察。标题与日期来自目录检索，后续需先读取原文再分析。</div></div></section>`:`
 <section class="reader-section" id="article-summary"><h2><span class="section-number">01</span>${a.status==="excerpt"?"片段中文摘要":"中文摘要"}</h2><div class="section-caption">基于已读原文的概括，不是整篇翻译。</div><p>${esc(a.summary)}</p></section>
 <section class="reader-section insight-box" id="article-insight"><h2><span class="section-number">02</span>${a.status==="excerpt"?"初步判断 · 待正文验证":"企业洞察 · 独立分析"}</h2><p>${esc(a.insight)}</p></section>
 <section class="reader-section two-columns" id="article-action"><div class="action-box"><h3>${icon("plan")}一个可执行的试验</h3><p>${esc(a.action)}</p></div><div class="action-box"><h3>${icon("insights")}建议观察的指标</h3><p>${esc(a.metric)}</p></div></section>`}
 <section class="reader-section" id="article-boundary"><div class="boundary-box"><h3>适用边界与证据限制</h3><p>${esc(a.boundary)}</p><div class="scope-details"><strong>本次阅读范围：</strong>${esc(a.readScope)}<br><strong>证据类型：</strong>${esc(a.evidenceType)}。原文描述不等于独立审计结果。<br><strong>整理日期：</strong>${a.retrievedAt}。产品能力与条款应在实施前重新核实。</div></div></section>
 <div class="next-article">${before?`<a href="#article/${before.id}">← 上一篇<span>${esc(before.title)}</span></a>`:"<div></div>"}${after?`<a href="#article/${after.id}" style="text-align:right">下一篇 →<span>${esc(after.title)}</span></a>`:""}</div>
 </article><aside class="reader-aside">
 <div class="aside-box reader-toc"><h4>本篇目录</h4>${a.status!=="catalog"?`<a href="#article/${id}" data-scroll="article-summary">01　中文摘要</a><a href="#article/${id}" data-scroll="article-insight">02　企业洞察</a><a href="#article/${id}" data-scroll="article-action">03　动作与指标</a>`:""}<a href="#article/${id}" data-scroll="article-boundary">04　适用边界</a></div>
 <div class="aside-box"><h4>来源卡片</h4><dl><dt>原文站点</dt><dd>Claude by Anthropic</dd><dt>阅读状态</dt><dd>${LABELS[a.status]}</dd><dt>本次整理</dt><dd>${a.retrievedAt}</dd><dt>内容形式</dt><dd>中文摘要 + 独立分析<br>非全文译文</dd></dl></div>
 <div class="aside-box"><h4>我的阅读备注</h4><label class="hide" for="articleNote">文章备注</label><textarea id="articleNote" data-note="${id}" placeholder="这对我们的团队意味着什么？哪些条件需要先验证？">${esc(preferences.notes[id]||"")}</textarea><p class="aside-footnote" id="noteStatus">${storageAvailable?"自动保存在当前浏览器；不跨设备同步。":"浏览器存储不可用，本次备注无法持久保存。"}</p></div>
 ${related.length?`<div class="aside-box"><h4>同主题延伸阅读</h4><div class="related-list">${related.map(r=>`<a href="#article/${r.id}">${esc(r.title)} ↗</a>`).join("")}</div></div>`:""}
 </aside></div>`;
}
function insightHTML(i){return `<article class="insight-full" id="insight-${i.id}"><div class="eyebrow">${esc(i.kicker)}</div><h2>${esc(i.title)}</h2><p class="insight-thesis">${esc(i.thesis)}</p><div class="evidence-strip"><strong>原文中的线索</strong>${esc(i.observation)}</div><div class="insight-body"><div><h3>我们的推断</h3><p>${esc(i.reasoning)}</p><div class="decision-line"><strong>管理决策</strong>${esc(i.decision)}</div></div><div class="experiment-box"><h3>建议试验</h3><p>${esc(i.experiment)}</p><div class="mini-label">观察指标</div><p>${esc(i.metric)}</p><div class="mini-label">建议负责人</div><p>${esc(i.owner)}</p></div></div>${sources(i.refs)}<div class="counterpoint"><strong>何时不宜照搬</strong>${esc(i.counter)}</div></article>`;}
function renderInsights(){return `<div class="page-head report-intro"><div class="eyebrow">THE EXECUTIVE SYNTHESIS</div><h1>8 个值得带回企业的问题</h1><p>下面是跨案例的独立综合分析，不是任何一篇原文的结论复述。每项判断都连接已读文章，并给出可验证的试验与不适用条件。</p></div><span class="report-label">${icon("insights")} 管理者阅读路径 / 机制 → 决策 → 试验</span><nav class="insight-index" aria-label="洞察目录">${INSIGHTS.map((i,n)=>`<a href="#insights/${i.id}"><span>${String(n+1).padStart(2,"0")} / ${i.kicker.split("/")[1]}</span>${esc(i.title)}</a>`).join("")}</nav>
 <div class="formula-panel"><div class="eyebrow">A MEASUREMENT PROPOSAL / 本报告建议口径</div><h3>单位价值的起点：一个被验收、被采用的结果。</h3><p>每个合格结果总成本 =（执行 + 重试 + 人工复核与修正 + 分摊维护 + 可识别失败成本）÷ 合格且被采用的结果数。没有合格结果时，不应报告有意义的单位成本。探索收益与无法可靠量化的风险另列假设，不伪造精确 ROI。</p></div>
 ${INSIGHTS.map(insightHTML).join("")}<div class="research-banner"><strong>下一步不是购买更多工具：</strong>把最相关的一项判断，变成一个有业务负责人、基线、验收与停止条件的试验。<a class="text-link" href="#plan">进入 90 天行动 →</a></div>`;}
function progressHTML(){const total=PLAN.reduce((s,p)=>s+p.tasks.length,0),ids=new Set(PLAN.flatMap(p=>p.tasks.map(t=>t.id))),done=preferences.tasks.filter(id=>ids.has(id)).length;return `<div class="progress-label"><span>行动清单完成度</span><span class="counter-value">${done} / ${total}</span></div><div class="progress-track" role="progressbar" aria-label="行动清单完成度" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}"><div class="progress-fill" style="width:${done/total*100}%"></div></div>`;}
function renderPlan(){return `<div class="page-head"><div class="eyebrow">A 90-DAY OPERATING PLAN</div><h1>先做小，再做实，最后扩展。</h1><p>一个由本报告提出的实施模板，不是原文承诺，也不是为特定企业完成的方案。以相对天数规划；开始前根据团队资源、风险与业务周期调整。</p></div><div class="plan-summary"><div><h3>12 个动作，3 道扩量门槛</h3><p>勾选结果保存在当前浏览器。动作完成，不代表已通过业务验收。</p></div><div class="progress-wrap" id="planProgress">${progressHTML()}</div></div>
 ${PLAN.map((p,n)=>`<section class="phase"><header class="phase-head"><div><div class="phase-period">PHASE ${n+1} / ${esc(p.period)}</div><h2>${esc(p.title)}</h2><p>${esc(p.goal)}</p></div><span class="phase-number">0${n+1}</span></header>${p.tasks.map(t=>`<div class="task ${preferences.tasks.includes(t.id)?"checked":""}"><input type="checkbox" id="${t.id}" data-task="${t.id}" ${preferences.tasks.includes(t.id)?"checked":""}><label for="${t.id}"><span class="task-title">${esc(t.title)}</span><span class="task-detail">${esc(t.detail)}</span></label><span class="task-owner">${esc(t.owner)}</span></div>`).join("")}<div class="gate"><strong>进入下一阶段的门槛</strong>${esc(p.gate)}</div><div class="phase-sources">${sources(p.refs)}</div></section>`).join("")}
 <p class="plan-footnote">衡量时保留样本与口径，避免把模型执行速度当成整个流程周期，把采用意愿当成真实使用，把时间节省当成已经实现的收入。需要量化收益时，明确比较基线与无法控制的因素。</p><button class="btn" data-action="export-progress">${icon("download")}导出我的行动与阅读记录</button>`;}
function renderMethod(){return `<div class="page-head"><div class="eyebrow">SOURCES, COVERAGE & LIMITATIONS</div><h1>知道我们读了什么，也知道没读什么。</h1><p>本站是一个有来源与阅读边界的中文研究快照，不是全量镜像，不是完整翻译，也不是独立验证过的供应商评测。</p></div>${statStrip()}
 <div class="method-grid">
 <section class="method-card"><h3>01 / 收录范围</h3><p>${esc(META.scope)}<br><br>本次条目发布日期范围：2025-07-24 至 2026-09-10。整理日期：2026-09-12（新加坡时区）。</p><div class="source-origins">${META.discoverySources.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${i===0?"指定栏目":`发现路径 ${i+1}`} ↗</a>`).join("")}</div></section>
 <section class="method-card"><h3>02 / “正文要点”代表什么</h3><p>表示已获得并阅读主要相关段落，足以支撑当前摘要与分析；不表示逐段完整覆盖。只读到博客导读的文章会特别注明；外部 PDF、视频、链接的完整指南未纳入阅读完成范围。每篇的具体范围可在阅读页核对。</p></section>
 <section class="method-card"><h3>03 / 证据与推断</h3><p>${esc(META.evidence)}<br><br>“中文摘要”概括已读原文；“企业洞察”“动作”“指标”和“90 天行动”为独立分析与建议，不冒充原文结论。</p></section>
 <section class="method-card"><h3>04 / 版权、时效与使用</h3><p>${esc(META.copyright)}<br><br>${esc(META.freshness)}</p></section>
 </div>
 <div class="research-banner"><strong>站点功能边界：</strong>${esc(META.technical)}<br>金融、法律、安全与医疗相关内容仅用于企业实施讨论，不构成专业意见或效果保证。</div>
 <div class="heading-row"><div><h2>逐篇覆盖清单</h2><p>正文缺失不补写；片段分析不包装成全文阅读。</p></div><button class="btn compact" data-action="export-json">${icon("download")}导出资料 JSON</button></div>
 <div class="status-legend"><span><i class="badge body">正文要点</i>主要相关段落已读</span><span><i class="badge excerpt">片段分析</i>初步判断</span><span><i class="badge catalog">仅目录</i>未生成正文分析</span></div>
 <div class="coverage-filters"><input id="coverageSearch" type="search" aria-label="搜索覆盖清单" placeholder="搜索标题或公司"><select id="coverageStatus" aria-label="覆盖状态"><option value="all">全部状态</option><option value="body">正文要点</option><option value="excerpt">片段分析</option><option value="catalog">仅目录 / 待补</option></select><span class="badge" id="coverageCount">${COUNTS.all} 条</span></div>
 <div class="table-wrap"><table><thead><tr><th scope="col">发布日期</th><th scope="col">文章</th><th scope="col">阅读状态</th><th scope="col">原文入口</th></tr></thead><tbody id="coverageRows"></tbody></table></div>`;}
function renderCoverage(){const q=($("#coverageSearch")?.value||"").trim().toLowerCase(),status=$("#coverageStatus")?.value||"all";const items=ARTICLES.filter(a=>(status==="all"||a.status===status)&&(!q||[a.title,a.originalTitle].join(" ").toLowerCase().includes(q)));$("#coverageCount").textContent=`${items.length} 条`;$("#coverageRows").innerHTML=items.length?items.map(a=>`<tr><td><time datetime="${a.date}">${a.date}</time></td><td class="title-cell"><a href="#article/${a.id}">${esc(a.title)}</a><span class="original-mini">${esc(a.originalTitle)}</span></td><td>${badge(a)}</td><td>${a.url?`<a class="table-source" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">英文原文 ↗</a>`:`<span class="muted">尚未取得</span>`}</td></tr>`).join(""):`<tr><td colspan="4">没有匹配条目。</td></tr>`;}
function closeMenu(){$("#sidebar").classList.remove("open");$("#mobileShade").classList.remove("show");$("#menuToggle").setAttribute("aria-expanded","false");}
function render(){
 route=readRoute();if(!["overview","library","article","insights","plan","method"].includes(route.view))route.view="overview";
 const scrollTarget=route.view==="insights"&&route.id?`insight-${route.id}`:null;
 updateNav();closeMenu();
 $("#main").innerHTML=({overview:renderOverview,library:renderLibrary,article:()=>renderArticle(route.id),insights:renderInsights,plan:renderPlan,method:renderMethod}[route.view])();
 document.title=route.view==="article"&&BY_ID[route.id]?`${BY_ID[route.id].title}｜企业 AI 观察`:`${$("#breadcrumb").textContent}｜企业 AI 观察`;
 if(route.view==="library")bindLibrary();
 if(route.view==="method"){renderCoverage();$("#coverageSearch").addEventListener("input",renderCoverage);$("#coverageStatus").addEventListener("change",renderCoverage);}
 if(route.view==="article"&&$("#articleNote"))$("#articleNote").addEventListener("input",e=>{preferences.notes[e.target.dataset.note]=e.target.value;const ok=savePreferences();$("#noteStatus").textContent=ok?"已自动保存到当前浏览器。":"浏览器存储不可用，请导出记录保留备注。";});
 window.scrollTo(0,0);if(scrollTarget)requestAnimationFrame(()=>document.getElementById(scrollTarget)?.scrollIntoView({behavior:"auto",block:"start"}));
}
function articleMarkdown(a){
 let out=`## ${a.title}\n\n原文标题：${a.originalTitle}\n\n发布日期：${a.date}｜整理日期：${a.retrievedAt}\n阅读状态：${LABELS[a.status]}\n阅读范围：${a.readScope}\n证据类型：${a.evidenceType}\n\n原文：${a.url||"尚未取得正文链接；目录："+META.sourceCategory}\n\n`;
 out+=a.status==="catalog"?`### 正文尚未取得\n\n${a.summary}\n\n`:`### ${a.status==="excerpt"?"片段中文摘要":"中文摘要"}（不是全文译文）\n\n${a.summary}\n\n### ${a.status==="excerpt"?"初步判断，待正文验证":"企业洞察：独立分析"}\n\n${a.insight}\n\n### 试验建议\n\n${a.action}\n\n### 观察指标\n\n${a.metric}\n\n`;
 return out+`### 适用边界\n\n${a.boundary}\n\n`;
}
function reportMarkdown(){
 let out=`# 企业 AI 观察：从案例到决策\n\n整理日期：${META.retrievedAt}\n\n${META.scope}\n\n${META.copyright}\n\n${META.evidence}\n\n${META.freshness}\n\n原栏目：${META.sourceCategory}\n\n## 跨案例企业洞察\n\n`;
 INSIGHTS.forEach(i=>{out+=`### ${i.kicker} ${i.title}\n\n${i.thesis}\n\n原文线索：${i.observation}\n\n独立分析：${i.reasoning}\n\n管理决策：${i.decision}\n\n试验：${i.experiment}\n\n指标：${i.metric}\n\n负责人：${i.owner}\n\n不适用条件：${i.counter}\n\n关联来源：\n${i.refs.map(id=>`- ${BY_ID[id].title}：${BY_ID[id].url}`).join("\n")}\n\n`;});
 out+="## 90 天实施模板（独立建议，需按本企业情况调整）\n\n";
 PLAN.forEach(p=>{out+=`### ${p.period}：${p.title}\n\n${p.goal}\n\n${p.tasks.map(t=>`- ${t.title}（${t.owner}）：${t.detail}`).join("\n")}\n\n扩量门槛：${p.gate}\n\n`;});
 out+="## 逐篇文章摘要与分析\n\n"+ARTICLES.map(articleMarkdown).join("\n---\n\n");
 return out;
}
function toggleSaved(id){
 if(!BY_ID[id])return;const found=preferences.saved.includes(id);preferences.saved=found?preferences.saved.filter(x=>x!==id):[...preferences.saved,id];const persisted=savePreferences();
 $$(`[data-save="${id}"]`).forEach(el=>{const active=!found;el.classList.toggle("saved",active);el.classList.toggle("active",active);el.setAttribute("aria-pressed",String(active));el.setAttribute("aria-label",`${active?"取消收藏":"收藏"}：${BY_ID[id].title}`);if(!el.classList.contains("icon-btn"))el.innerHTML=icon("bookmark")+(active?"已收藏":"收藏文章");});
 $("#savedCount").textContent=preferences.saved.length;
 if(route.view==="library"&&libraryState.saved)renderLibraryResults();
 toast((found?"已取消收藏":"已加入收藏")+(persisted?"":"（未能保存至浏览器）"));
}
document.addEventListener("click",e=>{
 const scrollEl=e.target.closest("[data-scroll]");if(scrollEl){e.preventDefault();document.getElementById(scrollEl.dataset.scroll)?.scrollIntoView({behavior:"smooth"});return;}
 const save=e.target.closest("[data-save]");if(save){toggleSaved(save.dataset.save);return;}
 const read=e.target.closest("[data-read]");if(read){const id=read.dataset.read,old=preferences.read.includes(id);preferences.read=old?preferences.read.filter(x=>x!==id):[...preferences.read,id];const persisted=savePreferences();read.classList.toggle("active",!old);read.setAttribute("aria-pressed",String(!old));read.innerHTML=icon("check")+`<span>${old?"标记已读":"已标记阅读"}</span>`;toast((old?"已取消阅读标记":"已标记阅读")+(persisted?"":"（未持久保存）"));return;}
 const page=e.target.closest("[data-page]");if(page&&!page.disabled){libraryState.page=Number(page.dataset.page);renderLibraryResults();$("#libraryGrid").scrollIntoView({behavior:"smooth",block:"start"});return;}
 const topic=e.target.closest("[data-topic]");if(topic){libraryState.topic=topic.dataset.topic;libraryState.page=1;renderLibraryResults();return;}
 if(e.target.closest("#savedFilter")){libraryState.saved=!libraryState.saved;libraryState.page=1;renderLibraryResults();return;}
 const exp=e.target.closest("[data-export-article]");if(exp){const a=BY_ID[exp.dataset.exportArticle];downloadFile(`enterprise-ai-${a.id}.md`,`# 企业 AI 观察\n\n${META.copyright}\n\n${articleMarkdown(a)}`,"text/markdown;charset=utf-8");toast("已导出本篇摘要与分析");return;}
 const action=e.target.closest("[data-action]")?.dataset.action;
 if(action==="search"){if(route.view==="library")$("#librarySearch")?.focus();else{location.hash="library";setTimeout(()=>$("#librarySearch")?.focus(),60);}}
 if(action==="export"){downloadFile("enterprise-ai-report-2026-09-12.md",reportMarkdown(),"text/markdown;charset=utf-8");toast("已导出研究报告（Markdown）");}
 if(action==="print")window.print();
 if(action==="export-json"){downloadFile("enterprise-ai-research-data.json",JSON.stringify(DATA,null,2),"application/json;charset=utf-8");toast("已导出文章、洞察与计划数据");}
 if(action==="export-progress"){downloadFile("enterprise-ai-my-notes.json",JSON.stringify({exportedAt:new Date().toISOString(),saved:preferences.saved.map(id=>({id,title:BY_ID[id]?.title})),read:preferences.read,notes:preferences.notes,completedTasks:preferences.tasks,taskDefinitions:PLAN.flatMap(p=>p.tasks)},null,2),"application/json;charset=utf-8");toast("已导出个人阅读与行动记录");}
 if(action==="reset-filters"){libraryState={q:"",topic:"all",kind:"all",status:"all",sort:"priority",saved:false,page:1};$("#librarySearch").value="";$("#kindFilter").value="all";$("#statusFilter").value="all";$("#sortFilter").value="priority";renderLibraryResults();}
});
document.addEventListener("change",e=>{if(e.target.matches("[data-task]")){const id=e.target.dataset.task;preferences.tasks=e.target.checked?[...new Set([...preferences.tasks,id])]:preferences.tasks.filter(x=>x!==id);const ok=savePreferences();e.target.closest(".task").classList.toggle("checked",e.target.checked);$("#planProgress").innerHTML=progressHTML();if(!ok)toast("浏览器存储不可用，请导出记录保留进度");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();if(route.view==="library")$("#librarySearch")?.focus();else{location.hash="library";setTimeout(()=>$("#librarySearch")?.focus(),60);}}});
$("#menuToggle").addEventListener("click",()=>{const open=!$("#sidebar").classList.contains("open");$("#sidebar").classList.toggle("open",open);$("#mobileShade").classList.toggle("show",open);$("#menuToggle").setAttribute("aria-expanded",String(open));});
$("#mobileShade").addEventListener("click",closeMenu);
window.addEventListener("hashchange",render);
window.addEventListener("storage",e=>{if(e.key===STORE_KEY){try{const v=JSON.parse(e.newValue||"null");if(v){preferences={...preferences,...v};render();}}catch(ignore){}}});
render();
