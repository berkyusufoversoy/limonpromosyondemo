/* Stable retail codes. Supplier IDs stay private implementation keys for refreshes. */
(function(){
 const catalog=window.LIMON_CATALOG;
 const clean=s=>typeof s==='string'?s.replace(/Concept\s+Alina\s+Special biriminin Ar-Ge çalışmaları sonucu geliştirilmiş olan\s*/gi,'').replace(/Concept\s+Alina\s+Special ürünlerinden (?:birisi|biri) olan\s*/gi,'').replace(/Concept\s+Alina\s+Special ürünlerinden olan\s*/gi,'').replace(/Concept\s+Alina\s+Special/gi,'Limon').replace(/Concept\s+Alina/gi,'Limon').replace(/Alina/gi,'Limon'):s;
 for(const p of catalog.products){
  const original=p.code;
  p.code='LM-'+(p.source==='alina'?'2':'1')+String(p.sourceId||p.id.replace(/\D/g,'')).padStart(5,'0');
  p.brand='Limon Promosyon';
  for(const key of ['name','description','desc','category','subcategory'])p[key]=clean(p[key]);
  if(p.source==='alina'&&original){for(const key of ['name','description','desc'])if(typeof p[key]==='string')p[key]=p[key].replaceAll(original,'').trim();}
  const palette=[['neon turuncu','#ff6b00'],['neon sarı','#e5ff00'],['lacivert','#172640'],['saks mavi','#2164c7'],['siyah','#202020'],['beyaz','#fafafa'],['kırmızı','#ba2639'],['turuncu','#ed8029'],['yeşil','#42694e'],['gri','#9b9c99']];
  if(p.colorNames?.length===1&&p.colorNames[0]==='Ürün fotoğrafındaki renk'){const match=palette.find(([name])=>p.name.toLocaleLowerCase('tr').includes(name));if(match){p.colorNames=[match[0][0].toLocaleUpperCase('tr')+match[0].slice(1)];p.colors=[match[1]];}}
  (p.variants||[]).forEach((v,i)=>{v.code=p.code+'-'+String(i+1).padStart(3,'0');v.label=clean(v.label);if(p.source==='alina'&&v.image?.startsWith('http'))v.image=p.image;});
 }
 for(const c of catalog.categories)c.name=clean(c.name).replace(/^Limon(?:\s+koleksiyonu)?$/i,'Tekstil');
})();
