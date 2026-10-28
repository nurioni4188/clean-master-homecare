import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [frozen,derived,adapter,app]=await Promise.all([read('../integrated-v1/index.html'),read('index.html'),read('src/live-api.js'),read('src/main.js')]);
test('exact 2번 preview design is untouched byte for byte',()=>{
 const payload=Buffer.from(frozen,'utf8');
 const sha=createHash('sha1').update('blob '+payload.length+'\0').update(payload).digest('hex');
 assert.equal(sha,'0e405d7646efd502b20606a1a8c251524c30070f');
});
test('separate derivative retains cinema video, service, prices and helper',()=>{
 for(const s of ['cinematic-hero','hero-video','Pexels','id="service"','id="price"','id="helper"','hero-pause'])
  assert.ok(derived.includes(s),s);
});
test('real Staging UI does not mix RAM demo with account data',()=>{
 for(const s of ['id="login-form"','id="booking-form"','id="subscription-form"','id="my-bookings"','id="my-subscriptions"','id="my-cycles"','id="admin-bookings"'])assert.ok(derived.includes(s),s);
 assert.doesNotMatch(derived,/createOpsStore\(/);
 assert.doesNotMatch(derived,/TEST 고객 A/);
 assert.match(app,/shouldCreateUser:false/);
 assert.match(app,/VITE_CM_SYNTHETIC_WRITES==='ON'/);
 assert.match(adapter,/client\.rpc\('create_booking'/);
 assert.match(adapter,/client\.rpc\('cm_request_subscription'/);
});
test('no Production, anonymous service keys or real payment activation',()=>{
 assert.match(derived,/noindex/);
 assert.match(derived,/비공개 통합 Staging/);
 assert.doesNotMatch(app,/env\\.VITE_CM_(?:SERVICE_ROLE|SECRET_KEY)/i);
 assert.doesNotMatch(app,/status\s*[:=]\s*['"]active['"]/);
});

test('2번 theme styles and service/pricing/helper sections remain exactly unchanged',()=>{
 const style=x=>x.slice(x.indexOf('<style>'),x.indexOf('</style>')+'</style>'.length);
 assert.equal(style(derived),style(frozen),'Original typography, cinematic CSS and responsive rules must not change');
 const source=frozen.slice(frozen.indexOf('<section id="service">'),frozen.indexOf('<section id="booking">')).trim();
 const snapshot=derived.slice(derived.indexOf('<section id="service">'),derived.indexOf('<!-- RC16 isolated staging:')).trim();
 assert.equal(snapshot,source,'All marketing, prices, client-only consultation fields must remain identical');
});

test('new Staging menu links navigate to matching authenticated sections',()=>{
 for(const [anchor,id] of [['#booking-section','booking-section'],['#subscription-section','subscription-section'],['#mypage-section','mypage-section'],['#admin-section','admin-section']]){
  assert.ok(derived.includes('href="'+anchor+'"'),'missing link '+anchor);
  assert.ok(derived.includes('id="'+id+'"'),'missing destination '+id);
 }
});
