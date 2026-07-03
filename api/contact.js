export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "POST only" });
  }

  const { type, area, memo } = req.body || {};

  if (!type || !area || !memo) {
    return res.status(400).json({
      ok: false,
      message: "서비스 유형, 지역, 문의 내용을 입력해 주세요.",
    });
  }

  const received = {
    id: `CM-${Date.now()}`,
    type,
    area,
    memo,
    status: "신규 상담",
    createdAt: new Date().toISOString(),
  };

  console.log("CLEAN_MASTER_CONTACT_RECEIVED", received);

  return res.status(200).json({
    ok: true,
    message: "상담 요청이 서버에 접수되었습니다.",
    received,
  });
}
