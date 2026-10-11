window.commercialTotals=function commercialTotals(items,discount=0,options={},packageDiscount=0){
 const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
 if(!valid(discount,0,100))throw Error('İndirim %0–100 arasında olmalı.');
 const lines=items.map(i=>{const qty=i.qty,base=i.unitCents,print=i.printCents||0,vat=i.vatRate??options.vatRate??20;
  if(!Number.isInteger(qty)||qty<1||![base,print].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000)||!valid(vat,0,100))throw Error('Geçersiz fiyat, adet veya KDV.');
  return {gross:(base+print)*qty,vat};});
 const subtotal=lines.reduce((s,l)=>s+l.gross,0),setupCents=options.setupCents||0,shippingCents=options.shippingCents||0,chargeVatRate=options.chargeVatRate??20;
 if(![setupCents,shippingCents].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000)||!valid(chargeVatRate,0,100)||!Number.isSafeInteger(packageDiscount)||packageDiscount<0||packageDiscount>subtotal)throw Error('Geçersiz ek ücret.');
 const discountCents=Math.round((subtotal-packageDiscount)*discount/100),net=subtotal-packageDiscount-discountCents;
 let allocated=0;const vatBreakdown={};lines.forEach((l,n)=>{const lineNet=n===lines.length-1?net-allocated:Math.round(subtotal?net*l.gross/subtotal:0);allocated+=lineNet;vatBreakdown[l.vat]=(vatBreakdown[l.vat]||0)+Math.round(lineNet*l.vat/100);});
 vatBreakdown[chargeVatRate]=(vatBreakdown[chargeVatRate]||0)+Math.round((setupCents+shippingCents)*chargeVatRate/100);
 const vat=Object.values(vatBreakdown).reduce((s,n)=>s+n,0);
 return {subtotal,discount,discountCents,packageDiscountCents:packageDiscount,net,setupCents,shippingCents,chargeVatRate,vat,vatBreakdown,total:net+setupCents+shippingCents+vat};
};window.limonConvertedTotals=function convertedTotals(pricing,fx={rate:1}){
 if(pricing.vatBreakdown){const subtotal=Math.round(pricing.subtotal*fx.rate),packageDiscountCents=Math.round((pricing.packageDiscountCents||0)*fx.rate),discountCents=Math.round((subtotal-packageDiscountCents)*pricing.discount/100),net=subtotal-packageDiscountCents-discountCents,setupCents=Math.round((pricing.setupCents||0)*fx.rate),shippingCents=Math.round((pricing.shippingCents||0)*fx.rate),vatBreakdown=Object.fromEntries(Object.entries(pricing.vatBreakdown).map(([r,n])=>[r,Math.round(n*fx.rate)])),vat=Object.values(vatBreakdown).reduce((s,n)=>s+n,0);return {...pricing,subtotal,packageDiscountCents,discountCents,net,setupCents,shippingCents,vatBreakdown,vat,total:net+setupCents+shippingCents+vat};}
 const subtotal=Math.round(pricing.subtotal*fx.rate),packageDiscountCents=Math.round((pricing.packageDiscountCents||0)*fx.rate),discountCents=Math.round((subtotal-packageDiscountCents)*pricing.discount/100),net=subtotal-packageDiscountCents-discountCents,vat=Math.round(net*.2);
 return {subtotal,discount:pricing.discount,discountCents,net,vat,total:net+vat,...(packageDiscountCents?{packageDiscountCents}:{})};
};