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
 assert.doesNotMatch(app,/service_role|sb_secret_/i);
 assert.doesNotMatch(app,/status\s*[:=]\s*['"]active['"]/);
});
