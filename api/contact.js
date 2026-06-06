const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

const MAX = {
  name: 80,
  company: 120,
  email: 160,
  tel: 40,
  type: 80,
  message: 4000
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function clean(value, limit) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, limit);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseBody(req) {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string" && req.body.length) return JSON.parse(req.body);
  return {};
}

function buildMail(fields) {
  const rows = [
    ["お名前", fields.name],
    ["会社名・医療機関名", fields.company || "-"],
    ["メールアドレス", fields.email],
    ["電話番号", fields.tel || "-"],
    ["お問い合わせ種別", fields.type],
    ["お問い合わせ内容", fields.message]
  ];

  const text = rows.map(([label, value]) => `${label}:\n${value}`).join("\n\n");
  const htmlRows = rows.map(([label, value]) => {
    const body = escapeHtml(value).replace(/\n/g, "<br>");
    return `<tr><th style="text-align:left;vertical-align:top;padding:10px 14px;background:#f5f8fc;border:1px solid #dce7f5;width:180px;">${escapeHtml(label)}</th><td style="padding:10px 14px;border:1px solid #dce7f5;">${body}</td></tr>`;
  }).join("");

  return {
    subject: `【Medixus HP】${fields.type} / ${fields.name}`,
    text,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#12244a;line-height:1.7;"><p>Medixus HPのお問い合わせフォームから送信がありました。</p><table style="border-collapse:collapse;width:100%;max-width:760px;">${htmlRows}</table></div>`
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 200, { ok: true });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 405, { ok: false, error: "許可されていないリクエストです。" });
  }

  let body;
  try {
    body = parseBody(req);
  } catch (err) {
    return json(res, 400, { ok: false, error: "送信内容を読み取れませんでした。" });
  }

  if (clean(body.website, 200)) {
    return json(res, 200, { ok: true });
  }

  const fields = {
    name: clean(body.name, MAX.name),
    company: clean(body.company, MAX.company),
    email: clean(body.email, MAX.email),
    tel: clean(body.tel, MAX.tel),
    type: clean(body.type, MAX.type),
    message: clean(body.message, MAX.message)
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email);
  if (!fields.name || !emailOk || !fields.type || !fields.message || body.consent !== true) {
    return json(res, 400, { ok: false, error: "必須項目を確認してください。" });
  }

  const to = process.env.CONTACT_TO_EMAIL || "info@medixus.co.jp";
  const from = process.env.CONTACT_FROM_EMAIL || to;
  const region = process.env.SES_REGION || process.env.AWS_REGION || "ap-northeast-1";

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return json(res, 503, { ok: false, error: "フォームの送信設定が未完了です。" });
  }

  const mail = buildMail(fields);
  const client = new SESv2Client({ region });

  try {
    await client.send(new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      ReplyToAddresses: [fields.email],
      Content: {
        Simple: {
          Subject: { Data: mail.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: mail.text, Charset: "UTF-8" },
            Html: { Data: mail.html, Charset: "UTF-8" }
          }
        }
      }
    }));
  } catch (err) {
    console.error("SES send failed", err);
    return json(res, 502, { ok: false, error: "送信に失敗しました。時間をおいて再度お試しください。" });
  }

  return json(res, 200, { ok: true });
};
