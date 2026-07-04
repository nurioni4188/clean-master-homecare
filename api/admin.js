const ALLOWED_STATUS = new Set(["new", "contacted", "done"]);

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function json(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

export default async function handler(req, res) {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

    if (req.method === "GET") {
      const url = `${supabaseUrl}/rest/v1/consultations?select=*&order=created_at.desc&limit=200`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();

      if (!response.ok) {
        return json(res, 500, {
          ok: false,
          message: "상담 목록 조회 중 오류가 발생했습니다.",
          detail: text,
        });
      }

      let rows = [];
      try {
        rows = JSON.parse(text);
      } catch {
        rows = [];
      }

      return json(res, 200, {
        ok: true,
        rows,
      });
    }

    if (req.method === "PATCH") {
      const { id, status } = req.body || {};

      if (!id || !ALLOWED_STATUS.has(status)) {
        return json(res, 400, {
          ok: false,
          message: "id와 상태값(new/contacted/done)이 필요합니다.",
        });
      }

      const url = `${supabaseUrl}/rest/v1/consultations?id=eq.${encodeURIComponent(id)}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ status }),
      });

      const text = await response.text();

      if (!response.ok) {
        return json(res, 500, {
          ok: false,
          message: "상태 변경 중 오류가 발생했습니다.",
          detail: text,
        });
      }

      let updated = null;
      try {
        updated = JSON.parse(text);
      } catch {
        updated = text;
      }

      return json(res, 200, {
        ok: true,
        updated,
      });
    }

    return json(res, 405, {
      ok: false,
      message: "GET 또는 PATCH만 지원합니다.",
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      message: "관리자 API 처리 중 서버 오류가 발생했습니다.",
      detail: error.message,
    });
  }
}
