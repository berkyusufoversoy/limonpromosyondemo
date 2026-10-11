(function(){
 let pref={};try{pref=JSON.parse(sessionStorage.getItem('limon-preferences-v1'))||{};}catch{}
 const usableRates=data=>data&&/^\d{4}-\d{2}-\d{2}$/.test(data.date)&&['EUR','USD'].every(c=>Number.isFinite(data.rates?.[c])&&data.rates[c]>0);
 const locale={language:pref.language==='en'?'en':'tr',currency:['TRY','EUR','USD'].includes(pref.currency)?pref.currency:'TRY',rates:window.LIMON_RATE_SNAPSHOT};
 try{const saved=JSON.parse(sessionStorage.getItem('limon-rates-v1'));if(usableRates(saved)&&saved.date>=locale.rates.date)locale.rates={...saved,stale:true};}catch{}
 const ui=window.LIMON_UI_EN,catalog=window.LIMON_CATALOG_EN;
 const catalogFolded=new Map(Object.entries(catalog).map(([s,v])=>[s.toLocaleLowerCase('tr'),v]));
 const entries=Object.entries(ui).sort((a,b)=>b[0].length-a[0].length),lookup=new Map(entries);
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const phraseRegex=new RegExp('(?<![\\p{L}])(?:'+entries.map(([s])=>escape(s)).join('|')+')(?![\\p{L}])','gu');
 function tr(text,language=locale.language){if(language!=='en'||text==null)return text;const value=String(text),trim=value.trim();if(ui[trim])return value.replace(trim,ui[trim]);const catalogValue=catalog[trim]||catalogFolded.get(trim.toLocaleLowerCase('tr'));if(catalogValue)return value.replace(trim,catalogValue);
  if(trim.startsWith('— '))return value.replace(trim,'— '+tr(trim.slice(2),language));
  if(value.includes(' · '))return value.split(' · ').map(s=>tr(s,language)).join(' · ');
  if(/^\d[\d.,]* × /.test(trim)){const pos=value.indexOf(' × ');return value.slice(0,pos+3)+tr(value.slice(pos+3),language);}
  return value.replace(/Limon Promosyon/g,'LIMON_BRAND_NAME').replace(phraseRegex,s=>lookup.get(s)).replace(/LIMON_BRAND_NAME/g,'Limon Promosyon');
 }
 function fx(){return {currency:locale.currency,rate:locale.currency==='TRY'?1:locale.rates?.rates?.[locale.currency],date:locale.rates?.date,source:locale.rates?.source,stale:locale.rates?.stale};}
 function format(v,snapshot=fx()){if(!Number.isFinite(v))return tr('Teklif gerekli');if(!Number.isFinite(snapshot.rate))return '— '+snapshot.currency;return new Intl.NumberFormat(locale.language==='en'?'en-GB':'tr-TR',{style:'currency',currency:snapshot.currency,maximumFractionDigits:2}).format(v*snapshot.rate);}
 function direct(cents,snapshot=fx()){return new Intl.NumberFormat(locale.language==='en'?'en-GB':'tr-TR',{style:'currency',currency:snapshot.currency}).format(cents/100);}
 function converted(p,snapshot=fx()){const sub=Math.round(p.subtotal*snapshot.rate),packageDiscountCents=Math.round((p.packageDiscountCents||0)*snapshot.rate),discount=Math.round((sub-packageDiscountCents)*p.discount/100),net=sub-packageDiscountCents-discount,vat=Math.round(net*.2);return {subtotal:sub,discount:p.discount,discountCents:discount,packageDiscountCents,net,vat,total:net+vat};}
 function note(snapshot=fx()){if(snapshot.currency==='TRY')return locale.language==='en'?'Base prices in TRY':'Ana fiyatlar TRY';if(!snapshot.rate)return locale.language==='en'?'Exchange rates unavailable; select TRY.':'Döviz kuru kullanılamıyor; TRY seçin.';return `${snapshot.stale?(locale.language==='en'?'Last available rate · ':'Son kayıtlı kur · '):''}1 TRY = ${snapshot.rate} ${snapshot.currency} · ${snapshot.date} · ${snapshot.source} · ${locale.language==='en'?'reference conversion':'referans dönüşüm'}`;}
 function controls(){return `<div class="locale-controls" data-no-translate><label><span>${locale.language==='en'?'Language':'Dil'}</span><select class="language-select" aria-label="${locale.language==='en'?'Language':'Dil'}"><option value="tr" ${locale.language==='tr'?'selected':''}>Türkçe</option><option value="en" ${locale.language==='en'?'selected':''}>English</option></select></label><label><span>${locale.language==='en'?'Currency':'Para birimi'}</span><select class="currency-select" aria-label="${locale.language==='en'?'Currency':'Para birimi'}">${['TRY','EUR','USD'].map(c=>`<option value="${c}" ${c===locale.currency?'selected':''} ${c!=='TRY'&&!locale.rates?.rates?.[c]?'disabled':''}>${c} ${c==='TRY'?'₺':c==='EUR'?'€':'$'}</option>`).join('')}</select></label></div>`;}
 const originals=new WeakMap(),attributes=new WeakMap();let observing=false;
 function translateDOM(root=document.body){
  observer?.disconnect();
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('script,style,textarea,[data-no-translate],.logo-text,.wf-contact dd')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  while(walker.nextNode()){const n=walker.currentNode;let record=originals.get(n);if(!record||n.nodeValue!==record.output)record={source:n.nodeValue};const output=tr(record.source);if(n.nodeValue!==output)n.nodeValue=output;record.output=output;originals.set(n,record);}
  for(const el of root.querySelectorAll?.('[placeholder],[aria-label],[title],[alt]')||[]){if(el.closest('[data-no-translate]'))continue;let record=attributes.get(el)||{};for(const key of ['placeholder','aria-label','title','alt']){if(!el.hasAttribute(key))continue;let value=record[key];if(!value||el.getAttribute(key)!==value.output)value={source:el.getAttribute(key)};const output=tr(value.source);if(el.getAttribute(key)!==output)el.setAttribute(key,output);record[key]={...value,output};}attributes.set(el,record);}
  if(observing)observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 }
 const observer=new MutationObserver(()=>translateDOM());
 function afterRender(){
  document.documentElement.lang=locale.language;document.body.classList.toggle('language-en',locale.language==='en');document.title=locale.language==='en'?'Limon Design — Products for your brand':'Limon Tasarla — Markanızı ürünlere taşıyın';
  const host=document.querySelector('.home-header-actions,.header-actions');if(workflow.owner&&host&&!host.querySelector('.owner-link'))host.insertAdjacentHTML('beforeend','<a href="#owner" class="owner-link">Yönetim paneli</a>');if(host&&!host.querySelector('.locale-controls'))host.insertAdjacentHTML('afterbegin',controls());
  if(locale.language==='en'&&state.screen==='home'){
   const headings={'.brand-belief h2':'Anyone can sell gifts.<br>We carry <mark>brands.</mark>','.detail-copy h2':'Small details.<br><em>Great brands.</em><br>Lasting impact.','.ideas-title h2':'Ideas<br><em>come to life</em><br>everywhere.'};for(const [selector,html] of Object.entries(headings)){const el=document.querySelector(selector);if(el)el.innerHTML=html;}
  }
  if(!document.querySelector('.currency-note'))document.querySelector('.footer,.home-footer-bottom')?.insertAdjacentHTML('beforeend',`<small class="currency-note" data-no-translate>${esc(note())}</small>`);
  translateDOM();
 }
 window.LimonI18n={locale,tr,format,direct,converted,fx,note,controls,translateDOM,afterRender,productText:(s,l=locale.language)=>l==='en'?(catalog[s]||s):s};
 const baseRender=render;render=function(){baseRender();afterRender();};
 const baseToast=toast;toast=message=>baseToast(tr(message));
 const baseModal=modal;modal=function(title,body){baseModal(tr(title),body);translateDOM(document.getElementById('modal'));};
 function rerenderPreservingForms(){const forms=[...document.querySelectorAll('form')].map(f=>[f.id,[...f.elements].filter(e=>e.name).map(e=>[e.name,e.value])]);const scroll=scrollY;render();for(const [id,values] of forms){const form=document.getElementById(id);for(const [name,value] of values){const field=form?.elements.namedItem(name);if(field)field.value=value;}}if(typeof updateQuoteTotals==='function')updateQuoteTotals();scrollTo(0,scroll);}
 document.addEventListener('change',e=>{if(!e.target.matches('.language-select,.currency-select'))return;const key=e.target.matches('.language-select')?'language':'currency';locale[key]=e.target.value;try{sessionStorage.setItem('limon-preferences-v1',JSON.stringify({language:locale.language,currency:locale.currency}));}catch{}rerenderPreservingForms();translateDOM(document.getElementById('modal'));});
 observing=true;render();
 let ratesRequest=null,lastAttempt=0;
 function refreshRates(){if(ratesRequest)return ratesRequest;lastAttempt=Date.now();ratesRequest=fetch('/api/rates',{signal:AbortSignal.timeout(8000),cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(!usableRates(data))throw Error();locale.rates=data;try{sessionStorage.setItem('limon-rates-v1',JSON.stringify(data));}catch{}}).catch(()=>{locale.rates={...locale.rates,stale:true};}).finally(()=>{ratesRequest=null;rerenderPreservingForms();});return ratesRequest;}
 window.LimonI18n.refreshRates=refreshRates;
 window.addEventListener('online',refreshRates);
 window.addEventListener('focus',()=>{if(Date.now()-lastAttempt>300000)refreshRates();});
 refreshRates();
})();
