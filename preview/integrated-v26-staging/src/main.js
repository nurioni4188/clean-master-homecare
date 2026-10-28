import {createClient} from '@supabase/supabase-js';
import {createLiveApi} from './live-api.js';
import './bridge.css';
import './marketing.js';

// Isolated Staging UI. Do NOT point this bundle at the existing public homecare project.
// Publishable key only, Supabase Auth JWT & database RLS authorize every operation.
const env=import.meta.env;
const STAGING=env.VITE_CM_ENV_LABEL==='CLEAN_MASTER_STAGING';
const URL=String(env.VITE_CM_STAGING_URL||'');
const KEY=String(env.VITE_CM_STAGING_PUBLISHABLE_KEY||'');
const WRITES=STAGING && env.VITE_CM_SYNTHETIC_WRITES==='ON';
const configured=STAGING && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(URL) &&
  KEY.length>20 && !/service_role|sb_secret_/.test(KEY);
const el=id=>document.getElementById(id);
const msg=(id,value,kind='')=>{el(id).textContent=value;el(id).dataset.kind=kind;};
const empty=(container,message)=>{container.replaceChildren();const p=document.createElement('p');p.className='empty';p.textContent=message;container.append(p);};
const row=(container,title,details,status,controls=[])=>{
 const node=document.createElement('div');node.className='data-row';
 const text=document.createElement('div');
 const head=document.createElement('strong');head.textContent=title;
 const detail=document.createElement('small');detail.textContent=details||'';
 text.append(head,detail);
 const right=document.createElement('div');right.className='row-actions';
 const state=document.createElement('span');state.className='state';state.textContent=status||'';
 right.append(state);
 for(const {label,click,disabled=false} of controls){
   const button=document.createElement('button');button.type='button';button.className='small-button';
   button.textContent=label;button.disabled=disabled;
   button.addEventListener('click',async()=>{button.disabled=true;try{await click();await refresh();}catch(e){msg('admin-result',friendly(e),'error');}finally{button.disabled=disabled;}});
   right.append(button);
 }
 node.append(text,right);container.append(node);
};
const friendly=e=>String(e?.message||'요청을 처리하지 못했습니다.').slice(0,200);
const assertSynthetic=(form)=>{
 if(!String(form.addr||'').trim().startsWith('TEST '))throw Error('가상 주소는 반드시 TEST 로 시작해야 합니다.');
 if(form.note && !String(form.note).trim().startsWith('TEST'))throw Error('가상 요청사항은 TEST 로 시작해 주세요.');
};
let client=null,api=null, selected=null, memberships=[],staff=[];
if(!configured){
 msg('auth-message','HOLD · 별도 Staging 환경설정을 확인해 주세요. 계정·데이터 연결은 중지되었습니다.','error');
 el('login-form').querySelector('button').disabled=true;
}else{
 client=createClient(URL,KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
 api=createLiveApi(client);
 start();
}
function showSignedOut(){
 el('workspace').hidden=true;el('login-form').hidden=false;el('logout').hidden=true;el('refresh').hidden=true;
 msg('auth-message','승인된 합성 테스트 계정으로 로그인해 주세요.');
}
async function start(){
 el('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=String(new FormData(e.currentTarget).get('email')||'').trim();
  if(!email.includes('@'))return msg('auth-message','유효한 테스트 계정 이메일을 입력해 주세요.','error');
  try{
   const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});
   if(error)throw error;
   msg('auth-message','등록된 테스트 계정에만 로그인 링크가 발송됩니다. 실제 고객 신청은 아닙니다.','ok');
  }catch(err){msg('auth-message',friendly(err),'error');}
 });
 el('logout').addEventListener('click',async()=>{
  const {error}=await client.auth.signOut();if(error)return msg('auth-message',friendly(error),'error');showSignedOut();
 });
 el('refresh').addEventListener('click',()=>refresh().catch(e=>msg('auth-message',friendly(e),'error')));
 el('org-select').addEventListener('change',async e=>{
  selected=memberships.find(m=>m.org_id===e.target.value)||null;
  try{await refresh();}catch(err){msg('auth-message',friendly(err),'error');}
 });
 el('booking-form').addEventListener('submit',submitBooking);
 el('subscription-form').addEventListener('submit',submitSubscription);
 client.auth.onAuthStateChange(()=>{Promise.resolve().then(loadAuth).catch(e=>msg('auth-message',friendly(e),'error'));});
 await loadAuth();
}
async function loadAuth(){
 const {data,error}=await client.auth.getUser();if(error||!data?.user){showSignedOut();return;}
 el('login-form').hidden=true;el('logout').hidden=false;el('refresh').hidden=false;
 memberships=await api.memberships();
 if(!memberships.length){
  el('workspace').hidden=true;
  msg('auth-message','HOLD · 로그인은 확인됐지만 조직·고객/직원 멤버십이 없습니다. 관리자에 테스트 계정 등록을 요청하세요.','error');
  return;
 }
 const selector=el('org-select');selector.replaceChildren();
 for(const item of memberships){
  const option=document.createElement('option');option.value=item.org_id;option.textContent=item.org_id.slice(0,8)+' · '+item.role;selector.append(option);
 }
 selected=memberships.find(m=>m.org_id===selected?.org_id)||memberships[0];
 selector.value=selected.org_id;
 el('workspace').hidden=false;
 msg('auth-message','Supabase Auth 로그인 및 조직 멤버십 조회 완료. '+(WRITES?'합성 Staging 쓰기 허용':'조회 전용 모드'), 'ok');
 await refresh();
}
async function refresh(){
 if(!api||!selected)return;
 // Reconfirm role and org against authenticated DB before rendering any privileged data.
 selected=await api.ownMembership(selected.org_id);
 const role=selected.role;
 el('role-summary').textContent='역할: '+role+' · '+(WRITES?'TEST 쓰기 ON':'안전 조회 전용')+' · 결제 기능 OFF';
 const isCustomer=role==='customer',isAdmin=role==='admin';
 el('booking-section').hidden=!isCustomer;
 el('subscription-section').hidden=!isCustomer;
 el('mypage-section').hidden=!isCustomer;
 el('admin-section').hidden=!isAdmin;
 if(isCustomer)await renderCustomer();
 if(isAdmin)await renderAdmin();
 if(!isCustomer&&!isAdmin)msg('auth-message','담당자 계정입니다. 예약·구독 고객 화면과 관리자 화면은 권한상 표시되지 않습니다.','ok');
}
function lockForm(id,permitted){
 for(const control of el(id).querySelectorAll('input,textarea,select,button'))control.disabled=!permitted;
}
async function renderCustomer(){
 const org=selected.org_id;
 const [services,plans,bookings,subscriptions,cycles,visits]=await Promise.all([
  api.services(org),api.activeSubscriptionPlans(org),api.myBookings(),api.mySubscriptions(org),
  api.myBillingCycles(org),api.mySubscriptionVisits(org)
 ]);
 const serviceSelect=el('service');serviceSelect.replaceChildren();
 for(const s of services){const opt=document.createElement('option');opt.value=s.id;opt.textContent=s.name+' · '+s.duration_h+'시간';serviceSelect.append(opt);}
 const planSelect=el('plan');planSelect.replaceChildren();
 for(const p of plans){
   const opt=document.createElement('option');opt.value=p.id;
   opt.textContent=p.title+' / 월 '+p.monthly_visits+'회 / '+Number(p.price_krw||0).toLocaleString('ko-KR')+'원';
   planSelect.append(opt);
 }
 lockForm('booking-form',WRITES&&services.length>0);
 lockForm('subscription-form',WRITES&&plans.length>0);
 if(!services.length)msg('booking-result','HOLD · Staging 조직에 등록된 서비스 상품이 없습니다.','error');
 else if(!WRITES)msg('booking-result','안전 조회 전용입니다. 합성 예약 쓰기 승인이 필요합니다.');
 if(!plans.length)msg('subscription-result','HOLD · 관리자 승인된 월 2회·4회 상품과 확정 금액이 아직 없습니다.','error');
 else if(!WRITES)msg('subscription-result','조회 전용입니다. 실제 결제는 연결되지 않았습니다.');
 el('date').min=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
 const bk=el('my-bookings');bk.replaceChildren();
 for(const b of bookings.filter(x=>x.org_id===org)){
  row(bk,b.id,b.visit_date+' · '+String(b.start_hour).padStart(2,'0')+':00 · '+b.service_id,b.status);
 }
 if(!bk.children.length)empty(bk,'내 예약이 없습니다.');
 const sb=el('my-subscriptions');sb.replaceChildren();
 for(const s of subscriptions){
  const controls=[];
  if(WRITES&&['pending_payment','active','past_due'].includes(s.status)){
   controls.push({label:'취소 요청',click:async()=>{
    const result=await api.cancelSubscription(org,s.id);
    msg('subscription-result','구독 취소 처리 상태: '+result,'ok');
   }});
  }
  row(sb,'구독 '+s.id.slice(0,8),'월 '+s.visits_per_cycle+'회 · '+Number(s.agreed_price_krw||0).toLocaleString('ko-KR')+'원',s.status,controls);
 }
 if(!sb.children.length)empty(sb,'아직 구독 내역이 없습니다.');
 const cy=el('my-cycles');cy.replaceChildren();
 for(const c of cycles){row(cy,'청구주기 '+c.cycle_number,c.period_start+' ~ '+c.period_end+' / 포함 '+c.included_visits+'회',c.status);}
 if(!cy.children.length)empty(cy,'청구주기가 없습니다. 실제 청구·결제는 미연결입니다.');
 const vi=el('my-visits');vi.replaceChildren();
 for(const v of visits)row(vi,'구독 방문',v.booking_id,v.status);
 if(!vi.children.length)empty(vi,'아직 연결된 구독 방문이 없습니다.');
}
async function renderAdmin(){
 const org=selected.org_id;
 const [bookings,subscriptions,cleaners]=await Promise.all([
  api.adminBookings(org),api.adminSubscriptions(org),api.adminCleaners(org)
 ]);
 staff=cleaners;
 const bk=el('admin-bookings');bk.replaceChildren();
 for(const b of bookings){
  const controls=[];
  if(WRITES&&b.status==='requested'){
   controls.push({label:'예약 확정',click:()=>api.bookingAction(b.id,'confirm')});
   controls.push({label:'예약 거절',click:()=>api.bookingAction(b.id,'reject')});
  }
  row(bk,b.id,b.visit_date+' · '+String(b.start_hour).padStart(2,'0')+':00 / '+b.service_id,b.status,controls);
  if(WRITES&&b.status==='confirmed'&&staff.length){
   // Do not silently assign the first worker: the administrator chooses explicitly.
   const right=bk.lastElementChild.querySelector('.row-actions');
   const choice=document.createElement('select');choice.setAttribute('aria-label',b.id+' 배정할 청소인력 선택');
   choice.className='staff-select';
   for(const worker of staff){
    const opt=document.createElement('option');opt.value=worker.id;opt.textContent=worker.name;choice.append(opt);
   }
   const assign=document.createElement('button');assign.type='button';assign.className='small-button';
   assign.textContent='선택 인력 배정';
   assign.addEventListener('click',async()=>{
    if(!choice.value)return msg('admin-result','청소인력을 선택해 주세요.','error');
    assign.disabled=true;
    try{await api.bookingAction(b.id,'assign',{cleanerId:choice.value});msg('admin-result','합성 예약 배정 처리됨.','ok');await refresh();}
    catch(err){msg('admin-result',friendly(err),'error');}
    finally{assign.disabled=false;}
   });
   right.append(choice,assign);
  }
 }
 if(!bk.children.length)empty(bk,'예약이 없습니다. 관리자는 고객 요청 후 이곳에서 확인합니다.');
 const subs=el('admin-subscriptions');subs.replaceChildren();
 for(const s of subscriptions)row(subs,'구독 '+s.id.slice(0,8),'월 '+s.visits_per_cycle+'회 · '+Number(s.agreed_price_krw||0).toLocaleString('ko-KR')+'원',s.status);
 if(!subs.children.length)empty(subs,'구독 신청이 없습니다.');
 if(!WRITES)msg('admin-result','조회 전용입니다. 예약 확정·배정은 Staging 합성 쓰기 승인 후 가능합니다.');
 if(WRITES&&bookings.some(b=>b.status==='confirmed')&&!staff.length)msg('admin-result','HOLD · 배정할 합성 청소인력 계정이 없습니다.','error');
}
async function submitBooking(e){
 e.preventDefault();
 if(!WRITES||selected?.role!=='customer')return msg('booking-result','쓰기 권한이 활성화되지 않았습니다.','error');
 const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;
 try{
  const f=Object.fromEntries(new FormData(e.currentTarget));
  const payload={svc:f.svc,date:f.date,slot:Number(f.slot),size:Number(f.size),addr:String(f.addr||'').trim(),note:String(f.note||'').trim(),consent:f.consent==='on',quoteReq:false};
  assertSynthetic(payload);
  if(!payload.consent)throw Error('동의가 필요합니다.');
  const id=await api.book(selected.org_id,payload);
  msg('booking-result','합성 Staging 예약 저장 완료: '+id+' (실제 예약 아님)','ok');
  await refresh();
 }catch(err){msg('booking-result',friendly(err),'error');}
 finally{button.disabled=false;}
}
async function submitSubscription(e){
 e.preventDefault();
 if(!WRITES||selected?.role!=='customer')return msg('subscription-result','쓰기 권한이 활성화되지 않았습니다.','error');
 const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;
 try{
  const f=Object.fromEntries(new FormData(e.currentTarget));
  const id=await api.requestSubscription(selected.org_id,String(f.plan||''),f.agreed==='on');
  msg('subscription-result','신청 저장: '+id+' · 결제대기. 실제 청구 없음.','ok');
  await refresh();
 }catch(err){msg('subscription-result',friendly(err),'error');}
 finally{button.disabled=false;}
}
