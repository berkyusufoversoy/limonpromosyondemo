/* Live branding concepts on genuine catalog product photography. */
const textileState={product:0,brand:'LIMON',method:'print'};
// Every tile resolves to an existing catalog SKU and its original model-free photograph.
const textileProducts=[
 {id:'limon-9094',name:'Hoodie',type:'Günlük stil',detail:'Ekibinin ortak dili. Göğüste bir imza, sırtta güçlü bir mesaj.',position:'Göğüs baskısı',mark:[51,49,18]},
 {id:'limon-7796',name:'Polo yaka',type:'Kurumsal stil',detail:'Karşılamadan toplantıya. Sade bir logo, özenli bir kurumsal görünüm.',position:'Sol göğüs logosu',mark:[88,28,10]},
 {id:'limon-9096',name:'Uzun kollu tişört',type:'Etkinlik & ekip',detail:'Her iş gününde aynı ekip ruhu. Kurumsal giyim koleksiyonunu keşfet.',position:'Göğüs logosu',mark:[53,29,11]},
 {id:'limon-7739',name:'Koruyucu tulum',type:'İş kıyafetleri',detail:'İş kıyafetlerinde de markana yer aç. Uygulama uygunluğu ürün bazında teyit edilir.',position:'Uygulama teyidi gerekli',mark:null},
 {id:'limon-7675',name:'Polar atkı',type:'Kış koleksiyonu',detail:'Soğuk günlerde sıcak bir marka teması. Ekibin ve kurumsal hediyelerin için.',position:'Uç panel logosu',mark:[49,69,13]},
 {id:'limon-7674',name:'Polar eldiven',type:'Tekstil aksesuarları',detail:'Ekibini tamamlayan küçük detaylar. Malzeme ve uygulama seçeneklerini birlikte belirleyelim.',position:'Uygulama teyidi gerekli',mark:null}
];
function textileCatalogProduct(index){return window.LIMON_CATALOG.products.find(p=>p.id===textileProducts[index].id)}
function textileGarment(index,extra=''){
 const p=textileProducts[index],product=textileCatalogProduct(index);
 return `<span class="textile-garment garment-${index} ${extra}" data-product-id="${p.id}"><img class="textile-fabric" src="${esc(product.image)}" alt="${esc(product.name)}" loading="lazy" decoding="async">${p.mark?`<span class="textile-branding" style="left:${p.mark[0]}%;top:${p.mark[1]}%;width:${p.mark[2]}%" data-no-translate><b>${esc(textileState.brand||'LIMON')}</b></span>`:''}</span>`;
}
function textileShowcase(){
  const p=textileProducts[textileState.product];
  return `<section class="textile-showcase motion-zone" id="home-textile" aria-labelledby="textile-heading" data-method="${textileState.method}">
    <div class="textile-topline"><span>02 / LİMON TEKSTİL</span><span>GÜNLÜK HAYATTAN İŞ HAYATINA.</span></div>
    <div class="textile-main">
      <div class="textile-copy"><span class="textile-eyebrow">AYNI EKİP. AYNI İMZA.</span><h2 id="textile-heading">MARKANI<br><em>ÜZERİNDE</em><br>TAŞI.</h2><p>Hoodie’den iş kıyafetine. Ekibini, etkinliğini ve her iş gününü markanın renkleriyle buluştur.</p>
        <div class="textile-demo"><label for="textile-brand">Kendi markanla dene</label><div class="textile-input"><input id="textile-brand" value="${esc(textileState.brand)}" maxlength="16" autocomplete="off" spellcheck="false" data-no-translate aria-describedby="textile-demo-note"><span aria-hidden="true">Aa</span></div>
          <div class="textile-methods" role="group" aria-label="Logo uygulaması">${[['print','Baskı'],['embroidery','Nakış'],['patch','Arma']].map(([id,label])=>`<button type="button" data-textile-method="${id}" aria-pressed="${textileState.method===id}">${label}</button>`).join('')}</div>
          <small id="textile-demo-note">Gerçek katalog fotoğrafları · Logo yerleşimi örnektir; uygulama teyit edilir.</small>
        </div>
        <button class="textile-collection" data-action="home-category" data-value="alina">Alina koleksiyonunu keşfet ${icon('bag')}</button>
      </div>
      <div class="textile-stage" role="group" aria-label="Tekstil kişiselleştirme önizlemesi">
        <span class="textile-backword" aria-hidden="true" data-no-translate>WEAR<br>YOUR<br>BRAND.</span>
        <div class="textile-orbit textile-orbit-left">${textileGarment(0)}<span class="textile-orbit-label">HOODIE / 01</span></div>
        <div class="textile-orbit textile-orbit-right">${textileGarment(1)}<span class="textile-orbit-label">POLO / 02</span></div>
        <div class="textile-featured" aria-live="polite" aria-atomic="true"><div class="textile-featured-art">${textileGarment(textileState.product)}</div><span class="textile-stage-number" aria-hidden="true">0${textileState.product+1}</span><span class="textile-product-label">${p.type}</span></div>
        <div class="textile-callout"><span class="textile-callout-line" aria-hidden="true"></span><b class="textile-position">${p.position}</b><span>Senin logon. Senin ekibin.</span></div>
        <div class="textile-selected-info"><div><span class="textile-info-kicker">MARKANA ÖZEL</span><h3>${p.name}</h3><small class="textile-sku" data-no-translate>${textileCatalogProduct(textileState.product).code||p.id}</small></div><div><p>${p.detail}</p><button class="textile-product-link" data-textile-collection>Ürünü incele ve tasarla ↗</button></div></div>
      </div>
    </div>
    <div class="textile-bottom"><div class="textile-range-label"><b>HER EKİBE<br>BİR TARZ.</b><span>Ürünleri keşfet</span></div><div class="textile-picker" role="group" aria-label="Tekstil ürününü seç">${textileProducts.map((item,i)=>`<button type="button" data-textile-product="${i}" aria-pressed="${textileState.product===i}"><span class="textile-thumb">${textileGarment(i)}</span><span class="textile-picker-text"><small>0${i+1}</small><b>${item.name}</b></span></button>`).join('')}</div></div>
  </section>`;
}
function updateTextileShowcase(){
  const root=document.querySelector('.textile-showcase');if(!root)return;
  const p=textileProducts[textileState.product];
  root.dataset.method=textileState.method;
  root.querySelectorAll('[data-textile-method]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.textileMethod===textileState.method)));
  root.querySelectorAll('[data-textile-product]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.textileProduct)===textileState.product)));
  root.querySelector('.textile-featured-art').innerHTML=textileGarment(textileState.product);
  root.querySelector('.textile-stage-number').textContent=`0${textileState.product+1}`;
  root.querySelector('.textile-product-label').textContent=p.type;
  root.querySelector('.textile-position').textContent=p.position;
  root.querySelector('.textile-selected-info h3').textContent=p.name;
  root.querySelector('.textile-sku').textContent=textileCatalogProduct(textileState.product).code||p.id;
  root.querySelector('.textile-selected-info p').textContent=p.detail;
  window.LimonI18n?.translateDOM(root);
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-textile-collection]')){location.hash='product/'+textileProducts[textileState.product].id;return;}
  const product=e.target.closest('[data-textile-product]'),method=e.target.closest('[data-textile-method]');
  if(product){textileState.product=Number(product.dataset.textileProduct);updateTextileShowcase()}
  if(method){textileState.method=method.dataset.textileMethod;updateTextileShowcase()}
});
document.addEventListener('input',e=>{
  if(e.target.id!=='textile-brand')return;
  textileState.brand=e.target.value.slice(0,16);
  document.querySelectorAll('.textile-branding b').forEach(b=>b.textContent=textileState.brand||'LIMON');
});
