
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "POST only",
    });
  }

  try {
    const { type, area, memo, name, phone, address, service_type, message, preferred_date } = req.body || {};

    const finalServiceType = service_type || type || "";
    const finalAddress = address || area || "";
    const finalMessage = message || memo || "";

    if (!finalServiceType || !finalAddress || !finalMessage) {
      return res.status(400).json({
        ok: false,
        message: "서비스 유형, 지역, 문의 내용을 입력해 주세요.",
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        ok: false,
        message: "Supabase 환경변수가 설정되지 않았습니다.",
      });
    }

    const payload = {
      name: name || "",
      phone: phone || "",
      address: finalAddress,
      service_type: finalServiceType,
      message: finalMessage,
      preferred_date: preferred_date || "",
      status: "new",
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/consultations`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    const resultText = await response.text();

    if (!response.ok) {
      console.error("SUPABASE_INSERT_ERROR", resultText);

      return res.status(500).json({
        ok: false,
        message: "상담 요청 저장 중 오류가 발생했습니다.",
        detail: resultText,
      });
    }

    let saved = null;
    try {
      saved = JSON.parse(resultText);
    } catch {
      saved = resultText;
    }

    return res.status(200).json({
      ok: true,
      message: "상담 요청이 서버에 접수되었습니다.",
      saved,
    });
  } catch (error) {
    console.error("CONTACT_API_ERROR", error);

    return res.status(500).json({
      ok: false,
      message: "상담 요청 처리 중 서버 오류가 발생했습니다.",
    });
  }
}
