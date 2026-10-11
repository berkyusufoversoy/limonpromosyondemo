function sprite(kind,extra=''){return `<span class="product-sprite sprite-${kind} ${extra}" aria-hidden="true"></span>`}
function angledCategories(){return `<section class="angled-categories motion-zone" aria-label="Ürün dünyaları"><button class="angled-category angle-promo" data-action="home-category" data-value="Tümü"><span class="angle-copy"><small>01 / PROMOSYON</small><h2>Promosyon ↗</h2><p>Markanı her yerde<br>yanında taşırlar.</p><span class="angle-link">Ürünleri keşfet →</span></span><span class="angle-merch" aria-hidden="true">${sprite('notebook','angle-notebook')}${sprite('thermos','angle-thermos')}</span></button><button class="angled-category angle-textile" data-action="home-category" data-value="group-textiles"><span class="angle-copy"><small>02 / TEKSTİL</small><h2>Tekstil ↗</h2><p>Markanı insanların<br>üzerine giydir.</p><span class="angle-link">Tekstil ürünlerini keşfet →</span></span><span class="angle-merch" aria-hidden="true"><img class="angle-hoodie catalog-garment" src="assets/catalog/654751430b6f9d75dccc.webp" alt="" loading="lazy"></span></button><button class="angled-category angle-print" data-action="home-category" data-value="Defter"><span class="angle-copy"><small>03 / MATBAA</small><h2>Matbaa ↗</h2><p>Fikirlerini<br>somutlaştır.</p><span class="angle-link">Defterini tasarla →</span></span><span class="angle-merch" aria-hidden="true"><span class="print-card white-card">İYİ FİKİRLER<br>HER YERE<br>SIĞAR.</span><span class="print-card yellow-card">BASKI.<br>DAHA FAZLASI.</span>${sprite('pen','angle-pen')}</span></button><span class="angle-divider divider-one" aria-hidden="true"></span><span class="angle-divider divider-two" aria-hidden="true"></span></section>`}
function chaosSection(){const items=[['hoodie','hoodie-main'],['thermos','thermos-left'],['notebook','notebook-right'],['mug','mug-left'],['bag','bag-right'],['pen','pen-diagonal'],['thermos','thermos-small'],['notebook','notebook-small'],['mug','mug-small'],['pen','pen-small']];return `<section class="chaos-section motion-zone" aria-labelledby="chaos-title"><div class="chaos-stage" aria-hidden="true"><img class="chaos-splash" src="assets/home-splash.webp" alt="">${items.map(([kind,pos],i)=>`<span class="chaos-item ${pos}" style="--float-time:${6+i*.65}s;--float-delay:-${i*.7}s"><span class="chaos-float">${sprite(kind)}</span></span>`).join('')}<span class="chaos-confetti confetti-one"></span><span class="chaos-confetti confetti-two"></span><span class="chaos-confetti confetti-three"></span><span class="chaos-orbit orbit-one"></span><span class="chaos-orbit orbit-two"></span></div><div class="chaos-copy"><span class="home-kicker">AZIYLA YETİNMEYEN MARKALARA.</span><h2 id="chaos-title">Biz<br>biraz<br><em>fazlayız.</em></h2><p>Bir markayı fark ettirmek için<br>bazen biraz fazla olmak gerekir.</p><button class="home-button black" data-action="browse">Farkını tasarla ${icon('edit')}</button><span class="chaos-signature">İyi fikirler.<br>Yüksek etki.</span></div><div class="chaos-bottom"><span>FİKİRLER TAŞSIN. MARKAN AKILDA KALSIN.</span><span>SADECE GÖRÜNME. HATIRLAN.</span></div></section>`}
let homeMotionCleanup=()=>{};
let homeHeroCleanup=()=>{};
function stopHomepageMotion(preserveHero=false){homeMotionCleanup();homeMotionCleanup=()=>{};if(preserveHero)return;try{homeHeroCleanup()}catch(e){}homeHeroCleanup=()=>{};try{if(window.HeroWorld&&typeof state!=='undefined')window.HeroWorld.noteScreen(state.screen)}catch(e){}}
const HERO_INTRO_KEY='limon-hero-intro';
function readHeroIntro(){try{return sessionStorage.getItem(HERO_INTRO_KEY)}catch(e){return e instanceof Error?e:new Error(String(e))}}
function writeHeroIntro(){try{sessionStorage.setItem(HERO_INTRO_KEY,'played')}catch(e){}}
function setupHomepageMotion({preserveHero=false}={}){
  const root=document.querySelector('.homepage');if(!root)return;
  root.querySelectorAll('.world-hero,.customize-spotlight,.detail-story,.home-manifesto,.home-final').forEach(el=>el.classList.add('motion-zone'));
  const toggle=document.querySelector('[data-motion-toggle]');
  const applyPause=()=>{const paused=!!state.homeMotionPaused;const hw=window.HeroWorld;if(hw&&!(paused&&hw.skipToEnd()))hw.setPaused(paused);document.body.classList.toggle('home-motion-paused',!!state.homeMotionPaused);if(toggle){toggle.setAttribute('aria-pressed',String(!!state.homeMotionPaused));toggle.setAttribute('aria-label',state.homeMotionPaused?'Hareketi başlat':'Hareketi durdur');toggle.innerHTML=state.homeMotionPaused?'▶ <span>Hareketi başlat</span>':'Ⅱ <span>Hareketi durdur</span>'}};
  applyPause();const pause=()=>{state.homeMotionPaused=!state.homeMotionPaused;applyPause()};toggle?.addEventListener('click',pause);
  const zones=root.querySelectorAll('.motion-zone');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('motion-visible',entry.isIntersecting);if(entry.target.matches('.textile-showcase')&&entry.intersectionRatio>=.2)entry.target.classList.add('textile-assets-ready')}),{rootMargin:'80px',threshold:[0,.2]});zones.forEach(el=>observer.observe(el));
  const hide=()=>document.body.classList.toggle('home-tab-hidden',document.hidden);document.addEventListener('visibilitychange',hide);hide();
  // Keep the live hero through home-only updates (language, rates and owner access). Only navigation remounts it.
  // Cleanup also resolves done, so record a visit only when the intro actually completes.
  // Missing hero scripts (hero-world.js or hero-world-core.js failed to load) or any throw here leave the static hero; nothing
  // escapes render() and homeMotionCleanup is always assigned.
  const heroEl=root.querySelector('.world-hero'),hw=window.HeroWorld,core=window.HeroWorldCore;
  try{
    if(!preserveHero&&hw&&core&&heroEl){
      const query=new URLSearchParams(location.search),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,rerender=hw.isRerender(),paused=!!state.homeMotionPaused;
      const mode=paused?'static':core.decideIntroMode({search:location.search,stored:readHeroIntro(),reducedMotion,rerender});
      const loops=core.decideLoops({search:location.search,reducedMotion,rerender,paused,mode});
      const cleanup=hw.mount(heroEl,{mode,loops,debugPlaced:query.get('hwDebugPlaced')==='1'});
      if(typeof cleanup==='function')homeHeroCleanup=cleanup;
      const world=window.__heroWorld;
      if(world&&world.timeline)world.done.then(()=>{if(world.completed)writeHeroIntro()});
    }
  }catch(e){console.warn('HeroWorld setup failed, showing the static hero:',e)}
  homeMotionCleanup=()=>{observer.disconnect();toggle?.removeEventListener('click',pause);document.removeEventListener('visibilitychange',hide)};
}
