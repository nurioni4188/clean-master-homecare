import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {preview} from 'vite';
const original=await readFile(new URL('../../integrated-v1/index.html',import.meta.url));
const out=new URL('../visual-outputs/',import.meta.url);
await mkdir(out,{recursive:true});
const baseServer=createServer((req,res)=>{
 if(req.url?.split('?')[0]!=='/'){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(original);
});
await new Promise(resolve=>baseServer.listen(4174,'127.0.0.1',resolve));
const vite=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
let browser;
const results=[];
try{
 browser=await chromium.launch({headless:true});
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
  const snapshots=[];
  for(const [kind,url] of [['original','http://127.0.0.1:4174/'],['staging','http://127.0.0.1:4173/']]){
   const page=await ctx.newPage();
   await page.route('https://**/*',route=>route.abort());
   await page.goto(url,{waitUntil:'domcontentloaded'});
   const result=await page.evaluate(()=>{
    const selectors=['.top','.hero','.cinematic-content','#hero-title','#service','#price','#helper'];
    const styles=Object.fromEntries(selectors.map(sel=>{
      const e=document.querySelector(sel);
      if(!e)return [sel,null];
      const cs=getComputedStyle(e);
      return [sel,{color:cs.color,backgroundColor:cs.backgroundColor,fontFamily:cs.fontFamily,fontSize:cs.fontSize,fontWeight:cs.fontWeight,paddingTop:cs.paddingTop,paddingBottom:cs.paddingBottom,borderRadius:cs.borderRadius,maxWidth:cs.maxWidth}];
    }));
    return {title:document.querySelector('#hero-title')?.textContent.trim(),videoPoster:document.querySelector('#hero-video')?.getAttribute('poster'),styles};
   });
   await page.screenshot({path:new URL(kind+'-'+label+'.png',out).pathname,fullPage:true,animations:'disabled'});
   snapshots.push({kind,...result});
   await page.close();
  }
  const [a,b]=snapshots;
  assert.equal(a.title,b.title,label+': original hero title changed');
  assert.equal(a.videoPoster,b.videoPoster,label+': original cinema poster changed');
  assert.deepEqual(a.styles,b.styles,label+': original header/hero/service/pricing/helper styles changed');
  results.push({viewport:label,width,height,comparison:'PASS: source hero and marketing computed styles identical',snapshots:[a.kind,b.kind]});
  await ctx.close();
 }
 await writeFile(new URL('comparison.json',out),JSON.stringify({status:'PASS',scope:'OFFLINE LOCAL RENDER ONLY - NOT A REAL USER OR DB UAT',results},null,2));
 console.log(JSON.stringify(results));
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>baseServer.close(resolve));
 await new Promise(resolve=>vite.httpServer.close(resolve));
}
