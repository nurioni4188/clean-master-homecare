const STATUS_SET = new Set(["new", "contacted", "done"]);

function reply(res, code, body) {
  return res.status(code).json(body);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다.`);
  return value;
}

function checkToken(req) {
  const saved = process.env.ADMIN_TOKEN;
  const given = req.headers["x-admin-token"];
  return Boolean(saved && given && saved === given);
}

export default async function handler(req, res) {
  try {
    if (!checkToken(req)) {
      return reply(res, 401, { ok: false, message: "관리자 비밀번호가 필요합니다." });
    }

    const url = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    if (req.method === "GET") {
      const r = await fetch(`${url}/rest/v1/consultations?select=*&order=created_at.desc&limit=300`, { headers });
      const text = await r.text();
      if (!r.ok) return reply(res, 500, { ok: false, message: "상담 목록 조회 실패", detail: text });
      return reply(res, 200, { ok: true, rows: JSON.parse(text || "[]") });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};
      if (!id || !STATUS_SET.has(status)) {
        return reply(res, 400, { ok: false, message: "id와 상태값이 필요합니다." });
      }

      const r = await fetch(`${url}/rest/v1/consultations?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ status }),
      });

      const text = await r.text();
      if (!r.ok) return reply(res, 500, { ok: false, message: "상태 변경 실패", detail: text });
      return reply(res, 200, { ok: true, updated: JSON.parse(text || "[]") });
    }

    return reply(res, 405, { ok: false, message: "GET 또는 PATCH만 지원합니다." });
  } catch (error) {
    return reply(res, 500, { ok: false, message: "관리자 API 오류", detail: error.message });
  }
}
