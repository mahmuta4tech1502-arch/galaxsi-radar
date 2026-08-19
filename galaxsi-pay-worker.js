/* ============================================================================
   GALAXSI ÖDEME WORKER'I  (Cloudflare Workers — ÜCRETSİZ)
   Ödeme gelince otomatik Pro kodu üretir, müşteriye gösterir, üyeliği doğrular.
   Para AKIŞINA dokunmaz — para NOWPayments'tan direkt senin cüzdanına gider.
   Bu Worker sadece "kim ödedi → kod ver → Pro aç" işini yapar.

   KURULUM (aşağıda rehber var):
   1) Cloudflare hesabı aç (bedava) → Workers & Pages → Create Worker
   2) Bu dosyanın TAMAMINI yapıştır → Deploy
   3) KV namespace oluştur (isim: CODES) → Worker'a "CODES" adıyla bağla
   4) Settings → Variables → Secret ekle: IPN_SECRET = (NOWPayments IPN anahtarın)
      (opsiyonel) TG_TOKEN + TG_CHAT = her satışta Telegram'a bildirim
   5) Worker URL'ini (https://...workers.dev) bana ver — siteye bağlarım
   6) NOWPayments → Settings → IPN URL = https://<worker-url>/ipn
                              Success URL = https://vekilo.app/basarili.html
   ============================================================================ */

const PLANS = [
  { min: 600, name: "1 Yıl", days: 365 },
  { min: 80, name: "30 Gün", days: 30 },
  { min: 0, name: "7 Gün", days: 7 },
];

function planFromAmount(amount) {
  const a = Math.round(Number(amount) || 0);
  return PLANS.find((p) => a >= p.min) || PLANS[PLANS.length - 1];
}

function genCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // karışması zor karakterler
  let s = "";
  for (const b of bytes) s += abc[b % abc.length];
  return "GXP-" + s.slice(0, 5) + "-" + s.slice(5, 10);
}

/* NOWPayments IPN imza doğrulama: anahtarları özyinelemeli sırala → JSON → HMAC-SHA512 */
function sortObject(obj) {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((r, k) => {
        r[k] = sortObject(obj[k]);
        return r;
      }, {});
  }
  return obj;
}

async function hmac512Hex(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj, cors, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    /* ---- NOWPayments ödeme bildirimi (IPN) ---- */
    if (url.pathname === "/ipn" && req.method === "POST") {
      const raw = await req.text();
      const sig = req.headers.get("x-nowpayments-sig") || "";
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return new Response("bad json", { status: 400, headers: cors });
      }
      const expected = await hmac512Hex(JSON.stringify(sortObject(data)), env.IPN_SECRET || "");
      if (!sig || sig.toLowerCase() !== expected.toLowerCase()) {
        return new Response("bad signature", { status: 401, headers: cors });
      }
      const status = String(data.payment_status || "").toLowerCase();
      const pid = String(data.payment_id || data.invoice_id || "");
      if ((status === "finished" || status === "confirmed") && pid) {
        const existing = await env.CODES.get("pid:" + pid);
        let code;
        if (existing) {
          code = JSON.parse(existing).code; // aynı ödeme tekrar bildirilirse aynı kod
        } else {
          const plan = planFromAmount(data.price_amount);
          code = genCode();
          const exp = Date.now() + plan.days * 86400000;
          const ttl = 60 * 60 * 24 * 400;
          await env.CODES.put("pid:" + pid, JSON.stringify({ code, plan: plan.name, exp }), { expirationTtl: ttl });
          await env.CODES.put("code:" + code, JSON.stringify({ plan: plan.name, exp, pid }), { expirationTtl: ttl });
          if (env.TG_TOKEN && env.TG_CHAT) {
            try {
              await fetch("https://api.telegram.org/bot" + env.TG_TOKEN + "/sendMessage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: env.TG_CHAT,
                  text: "💰 GALAXSI YENİ SATIŞ!\nTutar: " + data.price_amount + " " + (data.price_currency || "") +
                        "\nPlan: " + plan.name + "\nKod: " + code + "\nÖdeme: " + pid,
                }),
              });
            } catch (e) {}
          }
        }
      }
      return new Response("ok", { headers: cors });
    }

    /* ---- Başarılı sayfası bu ödemenin kodunu ister ---- */
    if (url.pathname === "/code") {
      const pid = url.searchParams.get("pid") || "";
      const v = pid ? await env.CODES.get("pid:" + pid) : null;
      if (!v) return json({ ready: false }, cors);
      return json({ ready: true, ...JSON.parse(v) }, cors);
    }

    /* ---- Pro alanı: kod geçerli mi? ---- */
    if (url.pathname === "/validate") {
      const code = (url.searchParams.get("code") || "").toUpperCase().trim();
      const v = code ? await env.CODES.get("code:" + code) : null;
      if (!v) return json({ valid: false }, cors);
      const o = JSON.parse(v);
      if (o.exp && Date.now() > o.exp) return json({ valid: false, expired: true }, cors);
      return json({ valid: true, plan: o.plan, exp: o.exp }, cors);
    }

    return new Response("GALAXSI pay worker — calisiyor", { headers: cors });
  },
};
