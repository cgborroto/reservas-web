const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(env, request) });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, env, request);
    }

    try {
      validateOrigin(request, env);
      const body = await request.json();
      validateRequestBody(body);
      const accessToken = await getGoogleAccessToken(env);
      const service = createSheetsService(env, accessToken);

      if (body.action === "addReservation") {
        validateReservationDates(body.payload, env);
        await appendReservation(service, body.payload);
        return jsonResponse({ ok: true }, 200, env, request);
      }

      if (body.action === "addCleaning") {
        validateCleaningPayload(body.payload);
        await appendCleaning(service, body.payload);
        return jsonResponse({ ok: true }, 200, env, request);
      }

      if (body.action === "updateReservation") {
        validateReservationDateRange(body.payload);
        await updateReservation(service, body.payload);
        return jsonResponse({ ok: true }, 200, env, request);
      }

      if (body.action === "deleteReservation") {
        validateDeletePayload(body.payload);
        await deleteReservation(service, body.payload.id);
        return jsonResponse({ ok: true }, 200, env, request);
      }

      if (body.action === "deleteCleaning") {
        validateDeleteCleaningPayload(body.payload);
        await deleteCleaning(service, body.payload);
        return jsonResponse({ ok: true }, 200, env, request);
      }

      return jsonResponse({ ok: false, error: "Accion no soportada" }, 400, env, request);
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      return jsonResponse(
        { ok: false, error: String(error && error.message ? error.message : error) },
        status,
        env,
        request
      );
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
  validateReservationPayload(payload);

  validateReservationDateRange(payload);

  const start = String(payload?.start || "");
  const today = getTodayDateKey(env);

  if (start < today) {
    throw new Error("La fecha de entrada no puede ser anterior a hoy.");
  }
}

function validateReservationDateRange(payload) {
  validateReservationPayload(payload);

  const start = String(payload?.start || "");
  const end = String(payload?.end || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error("Fechas invalidas.");
  }

  if (end < start) {
    throw new Error("La fecha de salida no puede ser menor que la fecha de entrada.");
  }
}

function validateRequestBody(body) {
  if (!body || typeof body !== "object") {
    throwHttpError(400, "Payload invalido.");
  }

  if (!body.action || typeof body.action !== "string") {
    throwHttpError(400, "Falta action.");
  }
}

function validateReservationPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throwHttpError(400, "Payload de reserva invalido.");
  }

  const requiredFields = ["id", "propertyId", "propertyName", "start", "end", "channel", "guest"];
  for (const field of requiredFields) {
    if (!String(payload[field] || "").trim()) {
      throwHttpError(400, `Falta ${field}.`);
    }
  }
}

function validateCleaningPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throwHttpError(400, "Payload de limpieza invalido.");
  }

  const requiredFields = ["propertyId", "propertyName", "date"];
  for (const field of requiredFields) {
    if (!String(payload[field] || "").trim()) {
      throwHttpError(400, `Falta ${field}.`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date))) {
    throwHttpError(400, "Fecha de limpieza invalida.");
  }
}

function validateDeletePayload(payload) {
  if (!payload || typeof payload !== "object" || !String(payload.id || "").trim()) {
    throwHttpError(400, "Falta id.");
  }
}

function validateDeleteCleaningPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throwHttpError(400, "Payload de limpieza invalido.");
  }

  if (!String(payload.propertyId || "").trim()) {
    throwHttpError(400, "Falta propertyId.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ""))) {
    throwHttpError(400, "Fecha de limpieza invalida.");
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

async function deleteCleaning(service, payload) {
  const { rowNumber } = await findCleaningRow(service, payload);
  const sheetId = await getSheetIdByTitle(service, service.cleaningSheet);

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

async function findCleaningRow(service, payload) {
  const data = await googleApiFetch(
    `${GOOGLE_SHEETS_BASE_URL}/${service.spreadsheetId}/values/${encodeURIComponent(service.cleaningSheet)}!A:Z`,
    service.accessToken
  );

  const values = data.values || [];
  if (values.length < 2) {
    throw new Error("Limpieza no encontrada");
  }

  const headers = values[0].map((header) => normalizeHeader(header));
  const propertyIdIndex = findHeaderIndex(headers, ["property_id", "propiedad_id", "property"]);
  const propertyNameIndex = findHeaderIndex(headers, ["propiedad", "name", "nombre"]);
  const dateIndex = findHeaderIndex(headers, ["date", "fecha"]);

  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const rowPropertyId = normalizeId(
      propertyIdIndex >= 0 ? row[propertyIdIndex] : row[1] || row[0]
    );
    const rowPropertyName = normalizeId(
      propertyNameIndex >= 0 ? row[propertyNameIndex] : row[0]
    );
    const rowDate = normalizeSheetDate(dateIndex >= 0 ? row[dateIndex] : row[2] || row[1]);

    if (
      rowDate === payload.date &&
      (rowPropertyId === normalizeId(payload.propertyId) || rowPropertyName === normalizeId(payload.propertyId))
    ) {
      return { rowNumber: index + 1 };
    }
  }

  throw new Error("Limpieza no encontrada");
}

function findHeaderIndex(headers, options) {
  return headers.findIndex((header) => options.includes(header));
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSheetDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(text)) {
    const separator = text.includes("/") ? "/" : "-";
    const [first, second, year] = text.split(separator).map((part) => Number(part));
    let month = first;
    let day = second;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return text;
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

function validateOrigin(request, env) {
  const allowedOrigin = String(env.ALLOWED_ORIGIN || "*").trim();
  if (!allowedOrigin || allowedOrigin === "*") {
    return;
  }

  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin !== allowedOrigin) {
    throwHttpError(403, "Origen no permitido.");
  }
}

function buildCorsHeaders(env, request) {
  const allowedOrigin = String(env.ALLOWED_ORIGIN || "*").trim();
  const requestOrigin = request?.headers?.get("Origin");

  return {
    "Access-Control-Allow-Origin":
      allowedOrigin === "*" ? "*" : requestOrigin === allowedOrigin ? allowedOrigin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(payload, status, env, request) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(env, request),
    },
  });
}

function throwHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
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
