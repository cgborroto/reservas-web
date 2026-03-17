const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(env) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, env);
    }

    try {
      const body = await request.json();
      const accessToken = await getGoogleAccessToken(env);
      const service = createSheetsService(env, accessToken);

      if (body.action === "addReservation") {
        validateReservationDates(body.payload, env);
        await appendReservation(service, body.payload);
        return jsonResponse({ ok: true }, 200, env);
      }

      if (body.action === "addCleaning") {
        await appendCleaning(service, body.payload);
        return jsonResponse({ ok: true }, 200, env);
      }

      if (body.action === "updateReservation") {
        validateReservationDates(body.payload, env);
        await updateReservation(service, body.payload);
        return jsonResponse({ ok: true }, 200, env);
      }

      if (body.action === "deleteReservation") {
        await deleteReservation(service, body.payload.id);
        return jsonResponse({ ok: true }, 200, env);
      }

      return jsonResponse({ ok: false, error: "Accion no soportada" }, 400, env);
    } catch (error) {
      return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) }, 500, env);
    }
  },
};

function createSheetsService(env, accessToken) {
  return {
    spreadsheetId: env.GOOGLE_SHEET_ID,
    reservationsSheet: env.RESERVATIONS_SHEET_NAME || "Reservas",
    cleaningSheet: env.CLEANING_SHEET_NAME || "Limpieza",
    accessToken,
  };
}

function validateReservationDates(payload, env) {
  const start = String(payload?.start || "");
  const end = String(payload?.end || "");
  const today = getTodayDateKey(env);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error("Fechas invalidas.");
  }

  if (start < today) {
    throw new Error("La fecha de entrada no puede ser anterior a hoy.");
  }

  if (end < start) {
    throw new Error("La fecha de salida no puede ser menor que la fecha de entrada.");
  }
}

function getTodayDateKey(env) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE || "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

async function appendReservation(service, payload) {
  const values = [[
    payload.id,
    payload.propertyName,
    payload.propertyId,
    payload.start,
    payload.end,
    payload.channel,
    payload.guest,
    payload.income,
  ]];

  await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}/values/${encodeURIComponent(service.reservationsSheet)}!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    service.accessToken,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    }
  );
}

async function appendCleaning(service, payload) {
  const values = [[payload.propertyName, payload.propertyId, payload.date]];

  await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}/values/${encodeURIComponent(service.cleaningSheet)}!A:C:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    service.accessToken,
    {
      method: "POST",
      body: JSON.stringify({ values }),
    }
  );
}

async function updateReservation(service, payload) {
  const { rowNumber } = await findReservationRow(service, payload.id);
  const values = [[
    payload.id,
    payload.propertyName,
    payload.propertyId,
    payload.start,
    payload.end,
    payload.channel,
    payload.guest,
    payload.income,
  ]];

  await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}/values/${encodeURIComponent(service.reservationsSheet)}!A${rowNumber}:H${rowNumber}?valueInputOption=USER_ENTERED`,
    service.accessToken,
    {
      method: "PUT",
      body: JSON.stringify({ values }),
    }
  );
}

async function deleteReservation(service, reservationId) {
  const { rowNumber } = await findReservationRow(service, reservationId);
  const sheetId = await getSheetIdByTitle(service, service.reservationsSheet);

  await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}:batchUpdate`,
    service.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      }),
    }
  );
}

async function findReservationRow(service, reservationId) {
  const data = await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}/values/${encodeURIComponent(service.reservationsSheet)}!A:H`,
    service.accessToken
  );

  const values = data.values || [];
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][0] || "") === String(reservationId)) {
      return { rowNumber: index + 1 };
    }
  }

  throw new Error("Reserva no encontrada");
}

async function getSheetIdByTitle(service, title) {
  const data = await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}?fields=sheets.properties`,
    service.accessToken
  );

  const match = (data.sheets || []).find((sheet) => sheet.properties && sheet.properties.title === title);
  if (!match) {
    throw new Error(`No se encontro la hoja ${title}`);
  }

  return match.properties.sheetId;
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signServiceAccountJwt(
    {
      iss: env.GOOGLE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: GOOGLE_TOKEN_URL,
      exp: now + 3600,
      iat: now,
    },
    env.GOOGLE_PRIVATE_KEY
  );

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`No se pudo obtener access token de Google: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function signServiceAccountJwt(payload, privateKeyPem) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

async function googleApiFetch(url, accessToken, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${JSON.stringify(data)}`);
  }

  return data;
}

function buildCorsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(payload, status, env) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(env),
    },
  });
}

function pemToArrayBuffer(pem) {
  const normalized = String(pem)
    .trim()
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n");
  const base64 = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64UrlEncode(value) {
  let bytes;
  if (typeof value === "string") {
    bytes = new TextEncoder().encode(value);
  } else if (value instanceof ArrayBuffer) {
    bytes = new Uint8Array(value);
  } else {
    bytes = new Uint8Array(value);
  }

  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
