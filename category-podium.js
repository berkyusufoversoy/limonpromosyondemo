/* Three category collections orbit a shared platform. Source SKU photos are not used as category art. */
const lmPodiumCategories=[
 {id:'promosyon',title:'Promosyon',english:'Promotional products',line:'Her temasta markan.',lineEn:'Your brand at every touchpoint.',image:'assets/category-podium/promosyon-v1.webp',alt:'Promosyon kategorisi: termos, defter, kalem, çanta, hoparlör ve USB bellek'},
 {id:'tekstil',title:'Tekstil',english:'Textiles',line:'Aynı ekip. Aynı imza.',lineEn:'One team. One signature.',image:'assets/category-podium/tekstil-v1.webp',alt:'Tekstil kategorisi: sarı hoodie, beyaz polo ve siyah tişört'},
 {id:'kkd',title:'K.K.D.',english:'PPE',line:'İşine güç. Ekibine güven.',lineEn:'Equipment for the working world.',image:'assets/category-podium/kkd-v1.webp',alt:'Kişisel koruyucu donanım kategorisi: baret, iş botu, eldiven, gözlük, kulaklık ve maske'}
];
const lmPodiumState={angle:Math.PI/2,paused:false};
textileShowcase=function(){const en=window.LimonI18n?.locale.language==='en';return `<section class="lm-category-podium motion-zone" id="home-textile" aria-labelledby="lm-category-title"><div class="lm-podium-heading"><div><span class="lm-podium-kicker">${en?'LIMON COLLECTIONS':'LİMON KOLEKSİYONLARI'}</span><h2 id="lm-category-title">${en?'Your brand.<br>A world of possibilities.':'Markanı<br>her yere taşı.'}</h2></div><div class="lm-podium-intro"><p>${en?'From a first encounter to the everyday. Find the collection that fits your brand.':'İlk karşılaşmadan her gün kullanılan bir detaya.<br>Markana yakışan dünyayı keşfet.'}</p><button type="button" class="lm-podium-pause" data-podium-pause aria-pressed="${lmPodiumState.paused}">${lmPodiumState.paused?(en?'Resume rotation':'Dönüşü başlat'):(en?'Pause rotation':'Dönüşü durdur')} <span aria-hidden="true">${lmPodiumState.paused?'▶':'Ⅱ'}</span></button></div></div><div class="lm-podium-scene" role="group" aria-label="${en?'Three collections on a slowly rotating podium':'Yavaş dönen podyum üzerinde üç kategori'}"><div class="lm-podium-backdrop" aria-hidden="true"><span>LİMON</span></div><div class="lm-podium-plinth" aria-hidden="true"><span class="lm-podium-edge"></span><span class="lm-podium-line"></span></div><div class="lm-podium-orbit">${lmPodiumCategories.map((c,i)=>`<a class="lm-podium-item" href="#${c.id}" data-podium-index="${i}" aria-label="${en?c.english:c.title} ${en?'collection':'kategorisini keşfet'}"><img src="${c.image}" alt="${esc(c.alt)}" width="900" height="900" loading="eager" decoding="async" draggable="false"></a>`).join('')}</div><span class="lm-podium-base-label" aria-hidden="true">${en?'THREE WORLDS. ONE SIGNATURE.':'ÜÇ DÜNYA. TEK İMZA.'}</span></div><nav class="lm-podium-links" aria-label="${en?'Explore collections':'Kategorileri keşfet'}">${lmPodiumCategories.map(c=>`<a href="#${c.id}"><span><strong>${en?c.english:c.title}</strong><small>${en?c.lineEn:c.line}</small></span><b aria-hidden="true">↗</b></a>`).join('')}</nav><p class="lm-podium-art-note">${en?'Category illustrations. Available products and specifications are listed in each collection.':'Kategori sunum görselleridir. Güncel ürünler ve özellikleri koleksiyonlarda yer alır.'}</p></section>`;};
function setupCategoryPodium(){
 const root=document.querySelector('.lm-category-podium');if(!root||root.dataset.podiumReady)return;root.dataset.podiumReady='true';
 const scene=root.querySelector('.lm-podium-scene'),items=[...root.querySelectorAll('.lm-podium-item')],button=root.querySelector('[data-podium-pause]');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
 let visible=false,hovered=false,focused=false,frame=0,last=0,width=scene.clientWidth;
 const paint=()=>{const mobile=width<600,radius=Math.min(width*(mobile?.285:.31),355),depth=mobile?26:44;
  items.forEach((item,i)=>{const a=lmPodiumState.angle+i*Math.PI*2/3,z=Math.sin(a),scale=.79+(z+1)*.105;
   item.style.transform=`translate(-50%, -100%) translate(${Math.cos(a)*radius}px, ${z*depth}px) scale(${scale})`;
   item.style.opacity=String(.77+(z+1)*.115);item.style.zIndex=String(Math.round((z+1)*50)+2);
  });
 };
 const running=()=>visible&&!lmPodiumState.paused&&!state.homeMotionPaused&&!document.hidden&&!hovered&&!focused&&!reduce.matches;
 const tick=now=>{if(running()&&last)lmPodiumState.angle+=(Math.min(now-last,64)/54000)*Math.PI*2;last=now;if(running())paint();frame=requestAnimationFrame(tick);};
 const toggle=()=>{lmPodiumState.paused=!lmPodiumState.paused;const en=LimonI18n.locale.language==='en';button.setAttribute('aria-pressed',String(lmPodiumState.paused));button.innerHTML=(lmPodiumState.paused?(en?'Resume rotation':'Dönüşü başlat'):(en?'Pause rotation':'Dönüşü durdur'))+` <span aria-hidden="true">${lmPodiumState.paused?'▶':'Ⅱ'}</span>`;};
 const enter=()=>{if(fine.matches)hovered=true;},leave=()=>{hovered=false;},focus=()=>{focused=true;},blur=e=>{if(!scene.contains(e.relatedTarget))focused=false;};
 const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);last=0;},{threshold:.08});observer.observe(root);
 const resize=new ResizeObserver(()=>{width=scene.clientWidth;paint();});resize.observe(scene);
 button.addEventListener('click',toggle);scene.addEventListener('pointerenter',enter);scene.addEventListener('pointerleave',leave);scene.addEventListener('focusin',focus);scene.addEventListener('focusout',blur);
 root.classList.toggle('lm-podium-reduced',reduce.matches);const motionChange=()=>{root.classList.toggle('lm-podium-reduced',reduce.matches);paint();};reduce.addEventListener('change',motionChange);
 paint();frame=requestAnimationFrame(tick);
 const previous=homeMotionCleanup;homeMotionCleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();button.removeEventListener('click',toggle);scene.removeEventListener('pointerenter',enter);scene.removeEventListener('pointerleave',leave);scene.removeEventListener('focusin',focus);scene.removeEventListener('focusout',blur);reduce.removeEventListener('change',motionChange);previous();};
}
const renderBeforeCategoryPodium=render;render=function(){renderBeforeCategoryPodium();if(state.screen==='home')setupCategoryPodium();};
render();
