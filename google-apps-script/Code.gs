var ALLOWED_EMAILS = [
  "cgborroto@gmail.com",
  "odasabina@gmail.com"
];

var GOOGLE_CLIENT_ID = "890425856815-hhcq7r8geu8aluue9om96m6d25cmjs0j.apps.googleusercontent.com";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var user = verifyGoogleCredential(data.credential);
    ensureAllowedEmail(user.email);
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "verifyLogin") {
      return jsonResponse({ ok: true, email: user.email });
    }

    if (data.action === "getCalendarData") {
      return jsonResponse({ ok: true, properties: getCalendarData(spreadsheet) });
    }

    if (data.action === "addReservation") {
      appendReservation(spreadsheet, data.payload);
      return jsonResponse({ ok: true });
    }

    if (data.action === "addCleaning") {
      appendCleaning(spreadsheet, data.payload);
      return jsonResponse({ ok: true });
    }

    if (data.action === "updateReservation") {
      updateReservation(spreadsheet, data.payload);
      return jsonResponse({ ok: true });
    }

    if (data.action === "deleteReservation") {
      deleteReservation(spreadsheet, data.payload.id);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "Accion no soportada" });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function appendReservation(spreadsheet, payload) {
  var sheet = spreadsheet.getSheetByName("reservas");
  sheet.appendRow([
    payload.id,
    payload.propertyId,
    payload.start,
    payload.end,
    payload.channel,
    payload.guest,
    payload.income
  ]);
}

function appendCleaning(spreadsheet, payload) {
  var sheet = spreadsheet.getSheetByName("limpieza");
  sheet.appendRow([
    payload.propertyId,
    payload.date
  ]);
}

function updateReservation(spreadsheet, payload) {
  var sheet = spreadsheet.getSheetByName("reservas");
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(payload.id)) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[
        payload.id,
        payload.propertyId,
        payload.start,
        payload.end,
        payload.channel,
        payload.guest,
        payload.income
      ]]);
      return;
    }
  }

  throw new Error("Reserva no encontrada");
}

function deleteReservation(spreadsheet, reservationId) {
  var sheet = spreadsheet.getSheetByName("reservas");
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(reservationId)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw new Error("Reserva no encontrada");
}

function getCalendarData(spreadsheet) {
  var propertiesSheet = spreadsheet.getSheetByName("propiedades").getDataRange().getValues();
  var reservationsSheet = spreadsheet.getSheetByName("reservas").getDataRange().getValues();
  var cleaningSheet = spreadsheet.getSheetByName("limpieza").getDataRange().getValues();
  var map = {};

  for (var i = 1; i < propertiesSheet.length; i++) {
    var propertyId = String(propertiesSheet[i][0]);
    map[propertyId] = {
      id: propertyId,
      name: String(propertiesSheet[i][1]),
      reservations: [],
      cleaningDays: []
    };
  }

  for (var j = 1; j < reservationsSheet.length; j++) {
    var reservationId = String(reservationsSheet[j][0]);
    var reservationPropertyId = String(reservationsSheet[j][1]);
    if (!map[reservationPropertyId]) {
      map[reservationPropertyId] = {
        id: reservationPropertyId,
        name: reservationPropertyId,
        reservations: [],
        cleaningDays: []
      };
    }

    map[reservationPropertyId].reservations.push({
      id: reservationId,
      start: String(reservationsSheet[j][2]),
      end: String(reservationsSheet[j][3]),
      channel: String(reservationsSheet[j][4]),
      guest: String(reservationsSheet[j][5]),
      income: String(reservationsSheet[j][6] || "")
    });
  }

  for (var k = 1; k < cleaningSheet.length; k++) {
    var cleaningPropertyId = String(cleaningSheet[k][0]);
    if (!map[cleaningPropertyId]) {
      map[cleaningPropertyId] = {
        id: cleaningPropertyId,
        name: cleaningPropertyId,
        reservations: [],
        cleaningDays: []
      };
    }

    map[cleaningPropertyId].cleaningDays.push(String(cleaningSheet[k][1]));
  }

  return Object.keys(map).map(function(key) {
    return map[key];
  });
}

function verifyGoogleCredential(credential) {
  if (!credential) {
    throw new Error("Falta el token de Google");
  }

  var response = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential)
  );
  var data = JSON.parse(response.getContentText());

  if (data.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Client ID invalido");
  }

  if (!data.email_verified || !data.email) {
    throw new Error("Correo no verificado");
  }

  return data;
}

function ensureAllowedEmail(email) {
  if (ALLOWED_EMAILS.indexOf(email) === -1) {
    throw new Error("Correo no autorizado");
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
