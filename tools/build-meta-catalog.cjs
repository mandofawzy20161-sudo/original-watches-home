'use strict';
// Run from repository root: node tools/build-meta-catalog.cjs
// Publishes only available ORIGINAL watches. IDs match the existing Meta Pixel.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), crypto=require('node:crypto');
const root=process.cwd(), output=path.join(root,'_site'), origin='https://www.originalwatcheseg.com';
const context={window:{}};vm.createContext(context);
for(let i=1;i<=5;i++)vm.runInContext(fs.readFileSync(path.join(root,`products-${i}.js`),'utf8'),context,{timeout:15000});
vm.runInContext(fs.readFileSync(path.join(root,'catalog-updates.js'),'utf8'),context,{timeout:15000});
const u=context.window.CATALOG_UPDATES;
if(!u||!u.update||!Array.isArray(u.add)||!Array.isArray(u.remove))throw Error('Invalid catalog-updates.js');
const products=new Map();
for(const p of (context.window.__OW_PRODUCTS_PARTS||[]).flat()){
 if(!p||!p.id||products.has(String(p.id)))throw Error('Missing/duplicate original product ID');
 products.set(String(p.id),{...p});
}
for(const p of u.add){if(!p||!p.id)throw Error('New product missing ID');if(!products.has(String(p.id)))products.set(String(p.id),{...p});}
for(const [id,p] of products)Object.assign(p,u.update[id]||{});
for(const id of u.remove)products.delete(String(id));
const available=[...products.values()].filter(p=>p.availability==='in'&&p.gender!=='accessory'&&!String(p.id).startsWith('mirror-'));
if(!available.length)throw Error('No available original watches; refusing to replace the published feed with an empty one.');
// Build a fresh deployment without changing any repository product files.
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
const skip=new Set(['_site','tools','node_modules','Apps-Script']);
function copy(dir,relative=''){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(item.name.startsWith('.')||skip.has(item.name))continue;
  const rel=path.join(relative,item.name),src=path.join(dir,item.name),dest=path.join(output,rel);
  if(item.isDirectory()){copy(src,rel);continue;}
  if(!item.isFile()||(!/\.(html?|js|css|json|xml|txt|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|woff2?|ttf|pdf)$/i.test(item.name)&&item.name!=='CNAME'))continue;
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);
 }
}
copy(root);fs.writeFileSync(path.join(output,'.nojekyll'),'');
function metaId(value){let id=String(value);if(id.length>100){try{id=decodeURIComponent(id);}catch(_){}}if(id.length>100)throw Error('Product ID exceeds Meta limit: '+id);return id;}
// Keep website Pixel product IDs in sync with the feed. Product URLs and cart IDs stay unchanged.
for(const name of ['index.html','mirror.html']){const file=path.join(output,name);if(!fs.existsSync(file))continue;let html=fs.readFileSync(file,'utf8');if(!html.includes('function owMetaId(')){html=html.replace('function owMetaItems(rows){',"function owMetaId(value){let id=String(value);if(id.length>100){try{id=decodeURIComponent(id);}catch(_){}}return id;}\nfunction owMetaItems(rows){");}html=html.replace('id:String(row.product.id),quantity:Number(row.qty)','id:owMetaId(row.product.id),quantity:Number(row.qty)');fs.writeFileSync(file,html);}
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let extracted=0;
function imageUrl(p){
 const source=(p.images||[])[0]||p.image;
 if(!source)throw Error('Missing image: '+p.id);
 const embedded=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(source);
 if(embedded){
  const data=Buffer.from(embedded[2],'base64'),ext=embedded[1]==='jpeg'?'jpg':embedded[1];
  if(!data.length||data.length>8*1024*1024)throw Error('Invalid/oversized image: '+p.id);
  const file=crypto.createHash('sha256').update(data).digest('hex').slice(0,24)+'.'+ext;
  const folder=path.join(output,'meta-catalog-images');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,file),data);extracted++;
  return origin+'/meta-catalog-images/'+file;
 }
 const url=new URL(source,origin+'/');if(!['http:','https:'].includes(url.protocol))throw Error('Unsupported image URL: '+p.id);return url.href;
}
const items=available.map(p=>{
 if(typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0)throw Error('Invalid price: '+p.id);
 if(!p.name||!p.brand||!p.model)throw Error('Missing product data: '+p.id);
 const details=(p.specs||[]).filter(r=>Array.isArray(r)&&r.length>1&&r[1]).map(r=>r[0]+': '+r[1]).join('؛ ');
 const description=(p.name+' — الموديل: '+p.model+'. '+details).slice(0,4900);
 const link=new URL(origin+'/');link.searchParams.set('collection','original');link.searchParams.set('product',p.id);
 const fields={id:metaId(p.id),title:String(p.name).slice(0,150),description,availability:'in stock',condition:'new',price:p.price.toFixed(2)+' EGP',link:link.href,image_link:imageUrl(p),brand:p.brand,mpn:p.model,google_product_category:'201',custom_label_0:'original',custom_label_1:p.gender||''};
 return '    <item>\n'+Object.entries(fields).map(([k,v])=>'      <g:'+k+'>'+xml(v)+'</g:'+k+'>').join('\n')+'\n    </item>';
});
const feed='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Original Watches EG — Available Original Watches</title>\n    <link>'+origin+'/</link>\n    <description>Available original watches, updated with the website.</description>\n'+items.join('\n')+'\n  </channel>\n</rss>\n';
fs.writeFileSync(path.join(output,'meta-catalog.xml'),feed);
const summary={generated_at:new Date().toISOString(),original_products:products.size,available_watches:available.length,excluded:products.size-available.length,embedded_images_published:extracted,brands:{}};
for(const p of available)summary.brands[p.brand]=(summary.brands[p.brand]||0)+1;
fs.writeFileSync(path.join(output,'meta-catalog-status.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
