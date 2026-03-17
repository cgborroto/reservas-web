var SPREADSHEET_ID = "10wXR2SeMqURamitzJT2SDb01lELdg79Y_JRLJlWHGsA";

function doGet() {
  try {
    var spreadsheet = getSpreadsheetOrThrow();
    return jsonResponse({
      ok: true,
      message: "Apps Script publicado correctamente",
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName()
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error)
    });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var spreadsheet = getSpreadsheetOrThrow();

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
  var sheet = spreadsheet.getSheetByName("Reservas");
  sheet.appendRow([
    payload.id,
    payload.propertyName,
    payload.propertyId,
    payload.start,
    payload.end,
    payload.channel,
    payload.guest,
    payload.income
  ]);
}

function appendCleaning(spreadsheet, payload) {
  var sheet = spreadsheet.getSheetByName("Limpieza");
  sheet.appendRow([
    payload.propertyName,
    payload.propertyId,
    payload.date
  ]);
}

function updateReservation(spreadsheet, payload) {
  var sheet = spreadsheet.getSheetByName("Reservas");
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(payload.id)) {
      sheet.getRange(i + 1, 1, 1, 8).setValues([[
        payload.id,
        payload.propertyName,
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
  var sheet = spreadsheet.getSheetByName("Reservas");
  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(reservationId)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw new Error("Reserva no encontrada");
}

function getSpreadsheetOrThrow() {
  if (!SPREADSHEET_ID) {
    throw new Error("Falta configurar SPREADSHEET_ID");
  }

  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    throw new Error("No fue posible abrir el Google Sheet configurado: " + error);
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
