/* Live branding concepts on genuine catalog product photography. */
const textileState={product:0,brand:'LIMON',method:'print'};
// Every tile resolves to an existing catalog SKU and its original model-free photograph.
const textileProducts=[{"id":"alina-308","name":"Sweatshirt","type":"Limon koleksiyonu","detail":"Concept Limon Special biriminin Ar-Ge çalışmaları sonucu geliştirilmiş olan Alaska Hi-Vis Fermuarlı Kapüşonlu Sweatshirt şık kesimi ve tasarımıyla kendini sahada belli eder. Yüksek görünürlük sağlayan segmentli reflektif bantları ile konforun bir arada buluştuğu bu ürün en popüler ürünlerimiz arasındadır. Bu modern iş elbisesi, iş dünyasının önde gelen tercihlerinden biri olup yüksek görünürlük gibi kritik standartlara tam anlamıyla uyar ve yetkili kuruluşlarca titizlikle onaylanmıştır. Ek olarak, ürün kurumsal marka baskısı ile kimliğinizi mükemmel bir şekilde yansıtarak iş dünyasında olumlu bir imaj oluşturmanıza yardımcı olur.\n\nKumaş Bilgisi Fabric: Poly-Cotton, Inside Fleece Brushed, 320 GSM Ürün Özellikleri CE Sertifikalı (EN ISO 13688, EN ISO 20471, EN 343, EN14058) Görünürlüğü arttıran reflektif bant Ribanalı manşetler Soğuk hava şartlarına uygun Yarım fermuarlı polo yaka","position":"Logo uygulaması temsili; üretim teyidi gerekli","mark":null},{"id":"alina-43","name":"Polo yaka","type":"Limon koleksiyonu","detail":"Concept Limon Special ürünlerinden olan Elegans Polo Pike T-Shirt şık kesimi ve ergonomik yapısıyla yaz aylarının vazgeçilmez ürünlerindendir. Üstelik, ürün kurumsal marka baskınıza mükemmel şekilde uyum sağlar, böylece iş dünyasında olumlu bir izlenim bırakmanıza katkı sağlar.\n\n60% Cotton, 40% Polyester, 210 GSM","position":"Logo uygulaması temsili; üretim teyidi gerekli","mark":null},{"id":"alina-10","name":"Uzun kollu","type":"Limon koleksiyonu","detail":"Concept Limon Special ürünlerinden biri olan Destekli Kaynakçı Uzun Kollu T-Shirt, şık kesimi ve ergonomik yapısıyla her ayın vazgeçilmez ürünlerinden biridir. Kollar ve ön parça kaynak çapaklarına karşı koruma sağlamak için denim kumaşla güçlendirilmiştir. Üstelik ürün, baskı yoluyla kurumsal markanıza mükemmel uyum sağlayarak iş dünyasında olumlu bir izlenim bırakmanıza yardımcı olur.\n\nKumaş Bilgisi Fabric Front & Sleeves: 100% Cotton-Denim Back: Poly-Cotton, 280 GSM Ürün Özellikleri Hafif, modakrilik kumaş aleve karşı daha fazla konfor ve koruma sağlar. Gizli ön düğme açıklığı, yaka ve fitilli manşetler bulunur.","position":"Logo uygulaması temsili; üretim teyidi gerekli","mark":null},{"id":"alina-66","name":"Tulum","type":"Limon koleksiyonu","detail":"Concept Limon Special ürünlerinden birisi olan Bahçıvan Tulum, şık tasarımı ile yaz aylarının vazgeçilmez ürünlerinden birisidir. Pamuklu kumaşıyla oldukça dayanıklıdır. Lastikli, hafif ve ergonomik yapısıyla kendini sahada gösterir. Üstelik, ürün kurumsal marka baskınıza mükemmel şekilde uyum sağlar, böylece iş dünyasında olumlu bir izlenim bırakmanıza katkı sağlar.\n\nKumaş Bilgisi Fabric : 100% Cotton, 245 GSM Ürün Özellikleri CE Sertifikalı (EN ISO 13688, EN ISO 20471, EN 343, EN14058) Telefon Cebi Telsiz Halkası Yan Cepler Reflektif Şerit Elastik Bel Yapısı","position":"Logo uygulaması temsili; üretim teyidi gerekli","mark":null},{"id":"alina-6","name":"Atkı","type":"Limon koleksiyonu","detail":"Concept Limon Special ürünlerinden olan Tommy Yelek ergonomik yapısı ve şık kesimiyle iş elbiseleri sektörünün en özel ürünlerinden birisidir. Güçlü kumaş yapısıyla uzun ömürlüdür. Modern iş elbiselerinde öncü ürünlerden birisidir. Üstelik, ürün kurumsal marka baskınıza mükemmel şekilde uyum sağlar, böylece iş dünyasında olumlu bir izlenim bırakmanıza katkı sağlar.\n\nKumaş Bilgisi Fabric: 65% Polyester, 32% Cotton, %3 Lycra, 245 GSM Ürün Özellikleri Telefon Cebi Göğüs Cebi Telsiz Halkası Fermuarlı Derin İç Cep Derin Cep Yapısı Yeleğin arka kısmında bulunan her iki taraftaki fermuarlı derin cep yapısı oldukça fonksiyoneldir.","position":"Logo uygulaması temsili; üretim teyidi gerekli","mark":null},{"id":"alina-157","name":"Eldiven","type":"Limon koleksiyonu","detail":"Polar Eldiven Lacivert","position":"Logo uygulaması temsili; üretim teyidi gerekli","mark":null}];
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
      <div class="textile-copy"><span class="textile-eyebrow">AYNI EKİP. AYNI İMZA.</span><h2 id="textile-heading">MARKANI<br><em>ÜZERİNDE</em><br>TAŞI.</h2><p>Limon ürünleriyle iş kıyafetinden günlük stile. Ekibini, etkinliğini ve her iş gününü markanın renkleriyle buluştur.</p>
        <div class="textile-demo"><label for="textile-brand">Kendi markanla dene</label><div class="textile-input"><input id="textile-brand" value="${esc(textileState.brand)}" maxlength="16" autocomplete="off" spellcheck="false" data-no-translate aria-describedby="textile-demo-note"><span aria-hidden="true">Aa</span></div>
          <div class="textile-methods" role="group" aria-label="Logo uygulaması">${[['print','Baskı'],['embroidery','Nakış'],['patch','Arma']].map(([id,label])=>`<button type="button" data-textile-method="${id}" aria-pressed="${textileState.method===id}">${label}</button>`).join('')}</div>
          <small id="textile-demo-note">Gerçek katalog fotoğrafları · Logo yerleşimi örnektir; uygulama teyit edilir.</small>
        </div>
        <button class="textile-collection" data-action="home-category" data-value="alina">Limon koleksiyonunu keşfet ${icon('bag')}</button>
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
