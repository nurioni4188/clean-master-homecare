import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const get=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,js,api,css,cfg]=await Promise.all([
 get('index.html'),get('src/main.js'),get('src/live-api.js'),get('src/style.css'),get('vercel.json')
]);
test('four user workflows are on one authenticated Staging surface',()=>{
 for(const id of ['login-form','booking-form','subscription-form','my-bookings','my-subscriptions','my-cycles','admin-bookings','admin-subscriptions'])
  assert.ok(html.includes('id="'+id+'"'),id);
});
test('no public production deployment or unauthenticated signup',()=>{
 assert.match(js,/shouldCreateUser:false/);
 assert.match(js,/VITE_CM_ENV_LABEL==='CLEAN_MASTER_STAGING'/);
 assert.match(js,/VITE_CM_SYNTHETIC_WRITES==='ON'/);
 assert.match(js,/assertSynthetic\(payload\)/);
 assert.match(cfg,/noindex/);
 assert.doesNotMatch(js,/service_role|sb_secret_/i); // only positive staged client code
});
test('client roles are checked against authenticated memberships and RLS',()=>{
 for(const method of ['ownMembership','services','mySubscriptions','requestSubscription','cancelSubscription','adminBookings','adminSubscriptions','adminCleaners'])
  assert.ok(api.includes(method),method);
 assert.match(api,/client\.from\('memberships'\)/);
 assert.match(api,/client\.rpc\('cm_request_subscription'/);
 assert.match(api,/client\.rpc\('cm_cancel_subscription'/);
});
test('no fake paid state and staff assignment requires explicit selection',()=>{
 assert.doesNotMatch(js,/status\s*[:=]\s*['"]active['"]/);
 assert.match(js,/배정할 청소인력 선택/);
 assert.match(js,/cleanerId:choice.value/);
 assert.doesNotMatch(js,/cleanerId:staff\[0\]/);
});
test('responsive Figma-inspired colors are present',()=>{
 for(const color of ['#dceeb1','#c5b0f4','#1f1d3d'])assert.ok(css.includes(color));
 assert.match(css,/@media\(max-width:600px\)/);
});
