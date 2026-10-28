/**
 * Clean Master v2.1 LIVE adapter.
 * Provide a preconfigured @supabase/supabase-js client from your bundler.
 * This module does NOT replace the v2 demo store automatically.
 * No service_role keys in browser. User identity comes from Supabase Auth, not role toggles.
 * DB RPC handles tenant/user permissions and transitions.
 */
export const LIVE_WRITABLE_ACTIONS = Object.freeze([
  'confirm', 'reject', 'assign', 'arrive', 'start', 'pause', 'resume',
  'check', 'memo', 'submit', 'revise', 'approve',
  'change', 'approveChange', 'denyChange',
  'cancel', 'approveCancel', 'denyCancel'
]);

function assertClient(client) {
  if (!client?.auth?.getUser || !client?.from || !client?.rpc) {
    throw new TypeError('Supabase Auth + RLS client가 필요합니다.');
  }
}
function unwrap(response) {
  if (!response || response.error) throw new Error(response?.error?.message || '요청에 실패했습니다.');
  return response.data;
}
export function createLiveApi(client) {
  assertClient(client);
  return Object.freeze({
    async currentUser() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data?.user?.id) throw new Error('인증된 사용자만 운영 모드를 사용할 수 있습니다.');
      return { id: data.user.id }; // no client-forged role
    },
    async memberships() {
      const user = await this.currentUser();
      // Admin may read coworkers' memberships under RLS. A user's login roles must be THEIR OWN.
      return unwrap(await client.from('memberships')
        .select('user_id,org_id,role,customer_id,cleaner_id')
        .eq('user_id', user.id));
    },
    async myBookings() {
      await this.currentUser();
      // RLS scopes this list to the logged-in customer/worker/admin.
      return unwrap(await client.from('bookings').select('id,org_id,customer_id,cleaner_id,service_id,visit_date,start_hour,duration_h,size_py,addr,status,quote_requested,created_at').order('visit_date',{ascending:true}));
    },
    async myReports() {
      await this.currentUser();
      // Customer cannot read unapproved reports: enforced by reports_select RLS.
      return unwrap(await client.from('reports').select('id,booking_id,status,version,submitted_at,published_at,review_note'));
    },
    async book(orgId, form) {
      await this.currentUser();
      if (!orgId || !form || !form.consent) throw new Error('조직과 개인정보 동의가 필요합니다.');
      return unwrap(await client.rpc('create_booking',{p_org:orgId,p:form}));
    },
    async bookingAction(bookingId, action, params={}) {
      await this.currentUser();
      if (!LIVE_WRITABLE_ACTIONS.includes(action)) throw new Error('아직 운영환경에서 허용되지 않은 작업입니다.');
      if (!bookingId || typeof bookingId!=='string') throw new Error('예약번호가 필요합니다.');
      return unwrap(await client.rpc('booking_action',{p_booking:bookingId,p_action:action,p:params}));
    },
    // Resolve organization and role from the authenticated memberships table.
    // The browser cannot grant itself an admin role by changing local UI state.
    async ownMembership(orgId) {
      const user = await this.currentUser();
      if (!orgId || typeof orgId !== 'string') throw new Error('조직을 선택해 주세요.');
      const rows = unwrap(await client.from('memberships')
        .select('org_id,user_id,role,customer_id,cleaner_id')
        .eq('user_id', user.id).eq('org_id', orgId));
      const membership = rows?.find(x => x.user_id === user.id && x.org_id === orgId);
      if (!membership) throw new Error('이 조직에 대한 접근 권한이 없습니다.');
      return membership;
    },
    async services(orgId) {
      await this.ownMembership(orgId);
      return unwrap(await client.from('service_catalog')
        .select('id,org_id,name,template,duration_h,quote_only')
        .eq('org_id', orgId));
    },
    async activeSubscriptionPlans(orgId) {
      await this.ownMembership(orgId);
      // Only server-approved active plans are shown to customers. No client-side price override.
      return unwrap(await client.from('cm_subscription_plans')
        .select('id,org_id,plan_code,title,monthly_visits,price_krw,status')
        .eq('org_id', orgId).eq('status', 'active'));
    },
    async mySubscriptions(orgId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'customer') throw new Error('고객의 구독 내역만 조회할 수 있습니다.');
      return unwrap(await client.from('cm_subscriptions')
        .select('id,org_id,customer_id,plan_id,status,agreed_at,visits_per_cycle,agreed_price_krw,created_at')
        .eq('org_id', orgId).eq('customer_id', membership.customer_id)
        .order('created_at', {ascending:false}));
    },
    async myBillingCycles(orgId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'customer') throw new Error('고객 전용 이용내역입니다.');
      // Subscription billing RLS must independently enforce ownership.
      return unwrap(await client.from('cm_billing_cycles')
        .select('id,org_id,subscription_id,cycle_number,period_start,period_end,amount_krw,included_visits,status,paid_at')
        .eq('org_id', orgId).order('period_start', {ascending:false}));
    },
    async mySubscriptionVisits(orgId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'customer') throw new Error('고객 전용 방문 내역입니다.');
      return unwrap(await client.from('cm_subscription_visits')
        .select('id,org_id,cycle_id,booking_id,status,created_at')
        .eq('org_id', orgId).order('created_at', {ascending:false}));
    },
    async requestSubscription(orgId, planId, agreed) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'customer' || !membership.customer_id)
        throw new Error('연결된 고객 계정만 구독을 신청할 수 있습니다.');
      if (agreed !== true || !planId || typeof planId !== 'string')
        throw new Error('구독 상품과 약관 동의를 확인해 주세요.');
      // RPC selects the trusted price and creates pending_payment only.
      // No paid/active state is ever set by this client.
      return unwrap(await client.rpc('cm_request_subscription',
        {p_org:orgId,p_plan:planId,p_agreed:true}));
    },
    async cancelSubscription(orgId, subscriptionId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'customer' || !membership.customer_id)
        throw new Error('고객만 구독 취소를 요청할 수 있습니다.');
      if (!subscriptionId || typeof subscriptionId !== 'string')
        throw new Error('구독번호가 필요합니다.');
      // Database checks ownership and safely handles pending/period-end cancellation.
      return unwrap(await client.rpc('cm_cancel_subscription', {p_subscription:subscriptionId}));
    },
    async adminBookings(orgId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'admin') throw new Error('관리자 권한이 필요합니다.');
      return unwrap(await client.from('bookings')
        .select('id,org_id,customer_id,cleaner_id,service_id,visit_date,start_hour,duration_h,size_py,status,created_at')
        .eq('org_id', orgId).order('visit_date', {ascending:true}));
    },
    async adminSubscriptions(orgId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'admin') throw new Error('관리자 권한이 필요합니다.');
      return unwrap(await client.from('cm_subscriptions')
        .select('id,org_id,customer_id,plan_id,status,visits_per_cycle,agreed_price_krw,created_at')
        .eq('org_id', orgId).order('created_at', {ascending:false}));
    },
    async adminCleaners(orgId) {
      const membership = await this.ownMembership(orgId);
      if (membership.role !== 'admin') throw new Error('관리자 권한이 필요합니다.');
      return unwrap(await client.from('cleaners')
        .select('id,org_id,name,skills').eq('org_id', orgId));
    },
    async photoUrl() {
      // No client-side signing until Storage RLS + server validation are implemented.
      throw new Error('운영 사진 접근은 서버의 승인된 권한 확인 및 서명 URL 발급 구현 후 가능합니다.');
    }
  });
}
