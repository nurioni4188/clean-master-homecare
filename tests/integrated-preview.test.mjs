import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';

const html=await readFile(new URL('../preview/integrated-v1/index.html',import.meta.url),'utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(inline,'Integrated Preview requires a bundled browser script');
const domain=inline.split('/* INTEGRATED_APP_START */')[0];
assert.ok(domain.includes('function createOpsStore()'),'Actual RC13 domain logic must be embedded');
const make=()=>{
 const ctx={crypto:{randomUUID},structuredClone};
 runInNewContext(domain+'\nglobalThis.demo=createOpsStore();',ctx);
 return ctx.demo;
};
const expectCode=(fn,code)=>assert.throws(fn,e=>e.code===code);

test('homepage retains original services and price labels but no PII placeholders',()=>{
 for(const text of ['Clean Master','입주·이사청소','거주청소','정기 홈케어','70,000원~150,000원','100,000원~200,000원','id="helper"','id="booking"','id="subscription"','id="admin"','help-generate'])assert.ok(html.includes(text),text);
 for(const forbidden of [/\/api\/contact/,/\/api\/admin/,/fetch\s*\(/,/tel:/,/sms:/,/localStorage/,/sessionStorage/,/SUPABASE_/,/test_sk_/,/live_sk_/,/1588-0000/,/010-1234/])assert.doesNotMatch(html,forbidden);
 assert.match(html,/connect-src &#39;none&#39;/);
 assert.match(html,/media-src https:\/\/videos\.pexels\.com/);
 assert.match(html,/img-src data: https:\/\/images\.pexels\.com/);
 const externalUrls=html.match(/https?:\/\/[^\s"'<>]+/g)||[];
 assert.ok(externalUrls.length>=2,'Expected official licensed hero video and poster');
 for(const url of externalUrls){
  const hostname=new URL(url.replaceAll('&amp;','&')).hostname;
  assert.ok(['videos.pexels.com','images.pexels.com','www.pexels.com'].includes(hostname),'Unexpected remote host: '+hostname);
 }

});

test('synthetic-only customer registration, repeated customer guard',()=>{
 const s=make();
 const a=s.customerAdd({name:'TEST 고객 C',sizePy:25});
 expectCode(()=>s.customerAdd({name:'TEST  고객 C',sizePy:25}),'CUSTOMER_ALREADY_EXISTS');
 expectCode(()=>s.customerAdd({name:'홍길동',sizePy:25}),'SYNTHETIC_CUSTOMER_NAME_REQUIRED');
 assert.equal(s.customers()[0].id,a.id);
 assert.equal(s.summary().customers,1);
});

test('customer reservation reaches administrator confirmed and assigned statuses',()=>{
 const s=make();const c=s.customerAdd({name:'TEST customer C',sizePy:25});
 const b=s.bookingAdd({customerId:c.id,visitDate:'2026-11-03',startHour:13,durationHours:2});
 assert.equal(b.status,'requested');
 expectCode(()=>s.bookingAdd({customerId:c.id,visitDate:'2026-11-03',startHour:13,durationHours:2}),'CUSTOMER_TIME_CONFLICT');
 assert.equal(s.bookingChange({bookingId:b.id,status:'confirmed',expectedRevision:2}).status,'confirmed');
 assert.equal(s.bookingChange({bookingId:b.id,status:'assigned',expectedRevision:3}).status,'assigned');
 assert.equal(s.summary().bookings.assigned,1);
});

test('monthly two and four subscription plans stay unpaid',()=>{
 const s=make();const c=s.customerAdd({name:'TEST customer A'});const d=s.customerAdd({name:'TEST customer B'});
 const a=s.subscriptionAdd({customerId:c.id,planCode:'monthly_2'});
 const b=s.subscriptionAdd({customerId:d.id,planCode:'monthly_4'});
 assert.equal(a.visitsPerMonth,2);assert.equal(b.visitsPerMonth,4);
 assert.equal(s.subscriptionChange({subscriptionId:a.id,status:'awaiting_payment',expectedRevision:4}).status,'awaiting_payment');
 expectCode(()=>s.subscriptionChange({subscriptionId:b.id,status:'active',expectedRevision:5}),'SUBSCRIPTION_TRANSITION_REJECTED');
 expectCode(()=>s.subscriptionAdd({customerId:d.id,planCode:'monthly_2'}),'CUSTOMER_SUBSCRIPTION_ALREADY_EXISTS');
 assert.equal(s.summary().external_payments,0);
 assert.equal(s.summary().active_paid_subscriptions,0);
});

test('all Preview data is isolated to a browser instance and reset on reload',()=>{
 const a=make(),b=make();
 a.customerAdd({name:'TEST customer NEW'});
 assert.equal(a.customers().length,1);
 assert.equal(b.customers().length,0);
});

test('cinematic hero includes actual video with mobile/static fallback and controls',()=>{
 assert.match(html,/id="hero-video"/);
 assert.match(html,/5744421-uhd_3840_2160_30fps\.mp4/);
 assert.match(html,/id="hero-pause"/);
 assert.match(html,/muted loop playsinline preload="none"/);
 assert.match(html,/prefers-reduced-motion: no-preference/);
 assert.match(html,/navigator\.connection\?\.saveData/);
 assert.match(html,/Pexels \/ Abdullah/);
 assert.match(html,/깨끗한 공간,/);
 assert.match(html,/더 여유로운 일상/);
 assert.match(html,/class="hero-credit"/);
});
