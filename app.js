const channels = {
  Airbnb: { color: "#ff6b6b" },
  Booking: { color: "#396afc" },
  Vrbo: { color: "#6b46c1" },
  Directo: { color: "#e9a93d" },
  Libre: { color: "#7cc58d" },
  Limpieza: { color: "#c7c7c7" },
};

const sampleProperties = [
  {
    id: "casa",
    name: "Casona",
    reservations: [
      { id: "res-casa-1", start: "2026-03-02", end: "2026-03-05", channel: "Airbnb", guest: "Laura", income: "4800" },
      { id: "res-casa-2", start: "2026-03-10", end: "2026-03-14", channel: "Booking", guest: "Carlos", income: "6200" },
      { id: "res-casa-3", start: "2026-03-21", end: "2026-03-24", channel: "Directo", guest: "Andrea", income: "5300" },
    ],
    cleaningDays: ["2026-03-06", "2026-03-15", "2026-03-25"],
  },
  {
    id: "departamento-1",
    name: "Departamento 1",
    reservations: [
      { id: "res-dep1-1", start: "2026-03-01", end: "2026-03-03", channel: "Vrbo", guest: "Megan", income: "3100" },
      { id: "res-dep1-2", start: "2026-03-11", end: "2026-03-16", channel: "Airbnb", guest: "Pedro", income: "5900" },
      { id: "res-dep1-3", start: "2026-03-26", end: "2026-03-29", channel: "Booking", guest: "Sofia", income: "4100" },
    ],
    cleaningDays: ["2026-03-04", "2026-03-17", "2026-03-30"],
  },
  {
    id: "departamento-2",
    name: "Departamento 2",
    reservations: [
      { id: "res-dep2-1", start: "2026-03-05", end: "2026-03-09", channel: "Directo", guest: "Juan", income: "4500" },
      { id: "res-dep2-2", start: "2026-03-18", end: "2026-03-20", channel: "Booking", guest: "Paula", income: "2800" },
    ],
    cleaningDays: ["2026-03-10", "2026-03-21"],
  },
  {
    id: "departamento-3",
    name: "Departamento 3",
    reservations: [
      { id: "res-dep3-1", start: "2026-03-07", end: "2026-03-11", channel: "Airbnb", guest: "Hector", income: "5200" },
      { id: "res-dep3-2", start: "2026-03-19", end: "2026-03-23", channel: "Vrbo", guest: "Julia", income: "5600" },
    ],
    cleaningDays: ["2026-03-12", "2026-03-24"],
  },
  {
    id: "chicxulub",
    name: "Chicxulub",
    reservations: [
      { id: "res-chic-1", start: "2026-03-03", end: "2026-03-08", channel: "Booking", guest: "Daniel", income: "7600" },
      { id: "res-chic-2", start: "2026-03-14", end: "2026-03-18", channel: "Directo", guest: "Elena", income: "4900" },
      { id: "res-chic-3", start: "2026-03-27", end: "2026-03-31", channel: "Airbnb", guest: "Marco", income: "6100" },
    ],
    cleaningDays: ["2026-03-09", "2026-03-19"],
  },
];

const state = {
  properties: [],
  selectedPropertyId: "",
  currentMonth: new Date(2026, 2, 1),
  dataSourceLabel: "Datos de ejemplo",
  activeReservation: null,
  modalMode: "view",
  backgroundRefreshTimer: null,
};

const googleSheetsConfig = {
  enabled: true,
  spreadsheetId: "10wXR2SeMqURamitzJT2SDb01lELdg79Y_JRLJlWHGsA",
  publishedSpreadsheetId: "2PACX-1vR4fJLg7E2VtqQ3lG0GA-ZO0sWWBaN_nOymI4aaddApWiATiapKTbEJF-ypPBMHFljSRTN6V9MQNRNw",
  writeAppsScriptUrl: "https://reservas-write-backend.cgborroto-reservas.workers.dev",
  sheets: {
    properties: { name: "Propiedades", gid: "0" },
    reservations: { name: "Reservas", gid: "570953344" },
    cleaning: { name: "Limpieza", gid: "577762975" },
  },
};

const weekdays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const propertyTabs = document.getElementById("property-tabs");
const legendList = document.getElementById("legend-list");
const weekdaysContainer = document.getElementById("weekdays");
const calendarGrid = document.getElementById("calendar-grid");
const monthLabel = document.getElementById("month-label");
const propertyTitle = document.getElementById("property-title");
const propertySubtitle = document.getElementById("property-subtitle");
const monthlyReservations = document.getElementById("monthly-reservations");
const dataSource = document.getElementById("data-source");
const reservationForm = document.getElementById("reservation-form");
const reservationProperty = document.getElementById("reservation-property");
const formStatus = document.getElementById("form-status");
const reservationModal = document.getElementById("reservation-modal");
const modalContent = document.getElementById("modal-content");
const modalTitle = document.getElementById("modal-title");
const modalStatus = document.getElementById("modal-status");
const modalEditForm = document.getElementById("modal-edit-form");
const adminCard = document.getElementById("admin-card");
const modalActions = document.getElementById("modal-actions");
const reservationStartInput = reservationForm.elements.start;
const reservationEndInput = reservationForm.elements.end;
const modalStartInput = document.getElementById("modal-start");
const modalEndInput = document.getElementById("modal-end");

document.getElementById("prev-month").addEventListener("click", () => changeMonth(-1));
document.getElementById("next-month").addEventListener("click", () => changeMonth(1));
reservationForm.addEventListener("submit", handleReservationSubmit);
modalEditForm.addEventListener("submit", handleReservationEditSubmit);
document.getElementById("edit-reservation").addEventListener("click", beginReservationEdit);
document.getElementById("delete-reservation").addEventListener("click", handleReservationDelete);
document.getElementById("cancel-edit").addEventListener("click", cancelReservationEdit);
document.getElementById("close-modal").addEventListener("click", closeReservationModal);
reservationStartInput.addEventListener("change", () => syncDateBounds(reservationStartInput, reservationEndInput));
modalStartInput.addEventListener("change", () => syncDateBounds(modalStartInput, modalEndInput));
reservationModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeReservationModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeReservationModal();
  }
});

renderWeekdays();
renderLegend();
applyDateInputRules();
initializeApp();

function renderWeekdays() {
  weekdaysContainer.innerHTML = "";
  weekdays.forEach((day) => {
    const node = document.createElement("div");
    node.className = "weekday";
    node.textContent = day;
    weekdaysContainer.appendChild(node);
  });
}

function renderLegend() {
  legendList.innerHTML = "";

  Object.entries(channels).forEach(([name, config]) => {
    const item = document.createElement("li");
    item.innerHTML = `<span class="swatch" style="background:${config.color}"></span>${name}`;
    legendList.appendChild(item);
  });
}

function renderPropertyTabs() {
  propertyTabs.innerHTML = "";

  state.properties.forEach((property) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `property-tab${property.id === state.selectedPropertyId ? " active" : ""}`;
    button.textContent = property.name;
    button.addEventListener("click", () => {
      state.selectedPropertyId = property.id;
      renderPropertyTabs();
      renderCalendar();
    });
    propertyTabs.appendChild(button);
  });

  renderPropertySelects();
}

function renderCalendar() {
  const property = getSelectedProperty();
  if (!property) {
    propertyTitle.textContent = "Sin propiedades";
    propertySubtitle.textContent = "Revisa tu configuración";
    dataSource.textContent = state.dataSourceLabel;
    monthLabel.textContent = "";
    calendarGrid.innerHTML = "";
    monthlyReservations.innerHTML = '<p class="empty-state">No hay propiedades para mostrar.</p>';
    return;
  }

  propertyTitle.textContent = property.name;
  propertySubtitle.textContent = "Calendario mensual";
  dataSource.textContent = state.dataSourceLabel;
  monthLabel.textContent = capitalize(monthFormatter.format(state.currentMonth));
  calendarGrid.innerHTML = "";

  const firstDay = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
  const monthStartOffset = (firstDay.getDay() + 6) % 7;
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - monthStartOffset);

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + i);
    calendarGrid.appendChild(buildDayCell(day, property));
  }

  renderMonthlyReservations(property);
}

function buildDayCell(day, property) {
  const dateKey = toDateKey(day);
  const inCurrentMonth = day.getMonth() === state.currentMonth.getMonth();
  const status = getDayStatus(dateKey, property);
  const reservation = getReservationForDate(dateKey, property);
  const isPastFreeDay = !reservation && dateKey < getTodayDateKey();

  const cell = document.createElement("article");
  cell.className = `day-cell ${inCurrentMonth ? "" : "outside-month"} ${status.className}`;
  if (status.background) {
    cell.style.background = status.background;
  }

  const dayNumber = document.createElement("div");
  dayNumber.className = "day-number";
  dayNumber.textContent = String(day.getDate());

  const dayStatus = document.createElement("div");
  dayStatus.className = "day-status";
  dayStatus.innerHTML = `<span class="status-chip">${status.label}</span>${status.details ? `<div>${status.details}</div>` : ""}`;

  if (reservation) {
    cell.classList.add("clickable-day");
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-label", `Ver detalle de ${reservation.guest || "reserva"}`);
    cell.addEventListener("click", () => openReservationModal(property, reservation));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openReservationModal(property, reservation);
      }
    });
  } else if (!isPastFreeDay) {
    cell.classList.add("clickable-day");
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-label", `Crear reserva para ${property.name} el ${dateKey}`);
    cell.addEventListener("click", () => openCreateReservationModal(property, dateKey));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCreateReservationModal(property, dateKey);
      }
    });
  }

  cell.append(dayNumber, dayStatus);
  return cell;
}

function getDayStatus(dateKey, property) {
  if (property.cleaningDays.includes(dateKey)) {
    return {
      label: "Limpieza",
      details: "Bloqueado",
      className: "cleaning",
      background: "",
    };
  }

  const reservation = property.reservations.find((item) => isDateInRange(dateKey, item.start, item.end));
  if (reservation) {
    const reservationChannel = channels[reservation.channel] ? reservation.channel : "Directo";
    return {
      label: reservation.channel,
      details: reservation.channel === "Limpieza"
        ? (reservation.guest || "Bloqueado")
        : (reservation.guest || "Reservado"),
      className: "booked",
      background: channels[reservationChannel].color,
    };
  }

  return {
    label: "Libre",
    details: "Disponible",
    className: "free",
    background: "",
  };
}

function getReservationForDate(dateKey, property) {
  return property.reservations.find((item) => isDateInRange(dateKey, item.start, item.end)) || null;
}

function renderMonthlyReservations(property) {
  const visibleMonth = state.currentMonth.getMonth();
  const visibleYear = state.currentMonth.getFullYear();

  const monthReservations = property.reservations.filter((reservation) => {
    const start = new Date(`${reservation.start}T00:00:00`);
    const end = new Date(`${reservation.end}T00:00:00`);
    return (
      (start.getMonth() === visibleMonth && start.getFullYear() === visibleYear) ||
      (end.getMonth() === visibleMonth && end.getFullYear() === visibleYear) ||
      (start < new Date(visibleYear, visibleMonth, 1) &&
        end > new Date(visibleYear, visibleMonth + 1, 0))
    );
  });

  monthlyReservations.innerHTML = "";
  if (!monthReservations.length) {
    monthlyReservations.innerHTML = '<p class="empty-state">No hay reservas registradas para este mes.</p>';
    return;
  }

  monthReservations
    .sort((a, b) => a.start.localeCompare(b.start))
    .forEach((reservation) => {
      const item = document.createElement("article");
      item.className = "reservation-item";
      item.innerHTML = `
        <strong>${reservation.channel} - ${reservation.guest || "Sin detalle"}</strong>
        <span>${formatDate(reservation.start)} a ${formatDate(reservation.end)}</span>
        <span>${reservation.channel === "Limpieza" ? "Sin ingreso" : formatCurrency(reservation.income)}</span>
      `;
      monthlyReservations.appendChild(item);
    });
}

function changeMonth(delta) {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + delta, 1);
  renderCalendar();
}

function getSelectedProperty() {
  return state.properties.find((property) => property.id === state.selectedPropertyId);
}

function isDateInRange(target, start, end) {
  return target >= start && target <= end;
}

function dateRangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

function findReservationConflict(propertyId, start, end, excludedReservationId = "") {
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) {
    return null;
  }

  return property.reservations.find((reservation) => {
    if (excludedReservationId && reservation.id === excludedReservationId) {
      return false;
    }

    return dateRangesOverlap(start, end, reservation.start, reservation.end);
  }) || null;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  return fullDateFormatter.format(new Date(`${dateString}T00:00:00`));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function initializeApp() {
  await bootstrapData();
}

async function loadProperties() {
  if (!googleSheetsConfig.enabled) {
    state.dataSourceLabel = "Mostrando datos de ejemplo";
    return sampleProperties;
  }

  try {
    const [propertiesRows, reservationRows, cleaningRows] = await Promise.all([
      fetchSheetRows(googleSheetsConfig.sheets.properties),
      fetchSheetRows(googleSheetsConfig.sheets.reservations),
      fetchSheetRows(googleSheetsConfig.sheets.cleaning),
    ]);

    const merged = buildPropertiesFromSheets(propertiesRows, reservationRows, cleaningRows);
    state.dataSourceLabel = "Sincronizado con Google Sheets";
    return merged.length ? merged : sampleProperties;
  } catch (error) {
    console.error("No fue posible cargar Google Sheets:", error);
    state.dataSourceLabel = "Error con Google Sheets, usando datos de ejemplo";
    return sampleProperties;
  }
}

async function fetchSheetRows(sheetName) {
  const sheetConfig = typeof sheetName === "string" ? { name: sheetName, gid: "" } : sheetName;
  const params = new URLSearchParams({ output: "csv", single: "true" });
  if (sheetConfig.gid) {
    params.set("gid", sheetConfig.gid);
  }
  params.set("ts", String(Date.now()));

  const url = `https://docs.google.com/spreadsheets/d/e/${googleSheetsConfig.publishedSpreadsheetId}/pub?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Error cargando hoja ${sheetConfig.name || sheetConfig.gid || "sin nombre"}`);
  }

  const csvText = await response.text();
  return parseCsv(csvText);
}

function buildPropertiesFromSheets(propertyRows, reservationRows, cleaningRows) {
  const propertyMap = new Map();

  propertyRows.forEach((row) => {
    const id = normalizeId(row.id || row.propiedad || row.property);
    const name = row.name || row.nombre || row.propiedad || row.property;
    if (!id || !name) {
      return;
    }

    propertyMap.set(id, {
      id,
      name,
      reservations: [],
      cleaningDays: [],
    });
  });

  reservationRows.forEach((row) => {
    const propertyId = resolvePropertyId(row, propertyMap);
    if (!propertyId || !row.start || !row.end || !row.channel) {
      return;
    }

    ensureProperty(propertyMap, propertyId);
    propertyMap.get(propertyId).reservations.push({
      id: row.id || createId("res"),
      start: normalizeDate(row.start),
      end: normalizeDate(row.end),
      channel: normalizeChannel(row.channel),
      guest: row.guest || row.huesped || row.cliente || "",
      income: normalizeMoney(row.income || row.ingreso || ""),
    });
  });

  cleaningRows.forEach((row) => {
    const propertyId = resolvePropertyId(row, propertyMap);
    const cleaningDate = normalizeDate(row.date || row.fecha);
    if (!propertyId || !cleaningDate) {
      return;
    }

    ensureProperty(propertyMap, propertyId);
    propertyMap.get(propertyId).cleaningDays.push(cleaningDate);
    propertyMap.get(propertyId).reservations.push({
      id: row.id || `clean-${propertyId}-${cleaningDate}`,
      start: cleaningDate,
      end: normalizeDate(row.end || row.fecha_fin || row.hasta || row.end_date) || cleaningDate,
      channel: "Limpieza",
      guest: row.note || row.notes || row.nota || row.detalle || "Limpieza",
      income: "0",
    });
  });

  return Array.from(propertyMap.values());
}

function ensureProperty(propertyMap, propertyId) {
  if (!propertyMap.has(propertyId)) {
    propertyMap.set(propertyId, {
      id: propertyId,
      name: denormalizeId(propertyId),
      reservations: [],
      cleaningDays: [],
    });
  }
}

function resolvePropertyId(row, propertyMap) {
  const explicitId = normalizeId(row.property_id || row.propiedad_id || row.property);
  if (explicitId) {
    return explicitId;
  }

  const visibleName = normalizeId(row.propiedad || row.name || "");
  if (visibleName && propertyMap.has(visibleName)) {
    return visibleName;
  }

  return visibleName;
}

function normalizeChannel(channel) {
  const normalized = String(channel).trim().toLowerCase();
  if (normalized === "airbnb") return "Airbnb";
  if (normalized === "booking") return "Booking";
  if (normalized === "bokking") return "Booking";
  if (normalized === "vrbo") return "Vrbo";
  if (normalized === "directo") return "Directo";
  if (normalized === "limpieza") return "Limpieza";
  return String(channel).trim();
}

function normalizeId(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function denormalizeId(value) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(text)) {
    const separator = text.includes("/") ? "/" : "-";
    const [first, second, year] = text.split(separator).map((part) => Number(part));

    // Google Sheets published CSV is currently exporting dates as month/day/year.
    // If the first segment is > 12, we fall back to day/month/year to keep manual entries working.
    let month = first;
    let day = second;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return text;
}

function parseCsv(csvText) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  return rows
    .slice(1)
    .filter((columns) => columns.some((value) => String(value).trim() !== ""))
    .map((columns) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = (columns[index] || "").trim();
      });
      return item;
    });
}

function normalizeHeader(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function renderPropertySelects() {
  const options = state.properties
    .map((property) => `<option value="${property.id}">${property.name}</option>`)
    .join("");

  reservationProperty.innerHTML = options;

  if (state.selectedPropertyId) {
    reservationProperty.value = state.selectedPropertyId;
  }
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applyDateInputRules() {
  const today = getTodayDateKey();
  reservationStartInput.min = today;
  reservationEndInput.min = today;
  modalStartInput.min = today;
  modalEndInput.min = today;
}

function syncDateBounds(startInput, endInput) {
  const minDate = startInput.value || getTodayDateKey();
  endInput.min = minDate;
  if (endInput.value && endInput.value < minDate) {
    endInput.value = minDate;
  }
}

function getReservationDateError(reservation) {
  const today = getTodayDateKey();

  if (reservation.start < today) {
    return "La fecha de entrada no puede ser anterior a hoy.";
  }

  if (reservation.end < reservation.start) {
    return "La fecha de salida no puede ser menor que la fecha de entrada.";
  }

  return "";
}

async function handleReservationSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const reservation = {
    propertyId: form.get("propertyId"),
    guest: String(form.get("guest")).trim(),
    channel: form.get("channel"),
    start: form.get("start"),
    end: form.get("end"),
    income: normalizeMoney(form.get("income")),
  };

  if (!reservation.propertyId || !reservation.guest || !reservation.channel || !reservation.start || !reservation.end) {
    setFormStatus("Completa todos los campos de la reserva.");
    return;
  }

  if (reservation.channel === "Limpieza" && !reservation.income) {
    reservation.income = "0";
  }

  if (!reservation.income) {
    setFormStatus("Completa todos los campos de la reserva.");
    return;
  }

  const dateError = getReservationDateError(reservation);
  if (dateError) {
    setFormStatus(dateError);
    return;
  }

  if (findReservationConflict(reservation.propertyId, reservation.start, reservation.end)) {
    setFormStatus("No disponible: esa propiedad ya tiene una reserva en esas fechas.");
    return;
  }

  try {
    await saveReservation(reservation);
    event.currentTarget.reset();
    reservationProperty.value = state.selectedPropertyId;
    setFormStatus("Reserva guardada correctamente.");
    updateUiAfterLocalMutation(reservation.propertyId);
  } catch (error) {
    console.error(error);
    setFormStatus("No se pudo guardar la reserva.");
  }
}

async function saveReservation(reservation) {
  const nextReservation = {
    id: reservation.id || createId("res"),
    start: reservation.start,
    end: reservation.end,
    channel: reservation.channel,
    guest: reservation.guest,
    income: reservation.income,
  };

  if (isWriteBackendEnabled()) {
    await postToWriteBackend({
      action: "addReservation",
      payload: buildWriteReservationPayload({ ...reservation, id: nextReservation.id }),
    });
  }

  const property = state.properties.find((item) => item.id === reservation.propertyId);
  property.reservations.push(nextReservation);
}

function isWriteBackendEnabled() {
  return googleSheetsConfig.writeAppsScriptUrl && googleSheetsConfig.writeAppsScriptUrl.startsWith("https://");
}

function getPropertyName(propertyId) {
  const property = state.properties.find((item) => item.id === propertyId);
  return property ? property.name : propertyId;
}

function buildWriteReservationPayload(reservation) {
  return {
    id: reservation.id || createId("res"),
    propertyId: reservation.propertyId,
    propertyName: getPropertyName(reservation.propertyId),
    start: reservation.start,
    end: reservation.end,
    channel: reservation.channel,
    guest: reservation.guest,
    income: reservation.income,
  };
}

async function postToWriteBackend(body) {
  const response = await fetch(googleSheetsConfig.writeAppsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Apps Script devolvio HTTP ${response.status}.`);
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (error) {
    throw new Error("Apps Script respondio un formato invalido.");
  }

  if (!data.ok) {
    throw new Error(data.error || "Error en Apps Script");
  }

  return data;
}

async function refreshData(preferredPropertyId) {
  if (googleSheetsConfig.enabled) {
    state.properties = await loadProperties();
  }

  state.selectedPropertyId = preferredPropertyId || state.selectedPropertyId;
  renderPropertyTabs();
  renderCalendar();
}

function updateUiAfterLocalMutation(preferredPropertyId) {
  state.selectedPropertyId = preferredPropertyId || state.selectedPropertyId;
  renderPropertyTabs();
  renderCalendar();
  scheduleBackgroundRefresh(preferredPropertyId);
}

function scheduleBackgroundRefresh(preferredPropertyId) {
  if (!googleSheetsConfig.enabled) {
    return;
  }

  window.clearTimeout(state.backgroundRefreshTimer);
  state.backgroundRefreshTimer = window.setTimeout(async () => {
    try {
      await refreshData(preferredPropertyId);
    } catch (error) {
      console.error("No fue posible refrescar en segundo plano:", error);
    }
  }, 4000);
}

function setFormStatus(message) {
  if (!message && isSimpleAccessMode()) {
    formStatus.textContent = "Modo simple: el calendario se lee del Google Sheet publicado. Los cambios locales no se sincronizan.";
    return;
  }

  formStatus.textContent = message;
}

function openReservationModal(property, reservation) {
  state.activeReservation = {
    propertyId: property.id,
    reservationId: reservation.id,
  };
  state.modalMode = "view";
  modalTitle.textContent = property.name;
  modalContent.innerHTML = `
    <div class="modal-row">
      <span class="modal-label">Nombre</span>
      <strong>${reservation.guest || "Sin nombre"}</strong>
    </div>
    <div class="modal-row">
      <span class="modal-label">Tipo</span>
      <span>${reservation.channel}</span>
    </div>
    <div class="modal-row">
      <span class="modal-label">Fecha de entrada</span>
      <span>${formatDate(reservation.start)}</span>
    </div>
    <div class="modal-row">
      <span class="modal-label">Fecha de salida</span>
      <span>${formatDate(reservation.end)}</span>
    </div>
    <div class="modal-row">
      <span class="modal-label">Ingreso</span>
      <span>${reservation.channel === "Limpieza" ? "Sin ingreso" : formatCurrency(reservation.income)}</span>
    </div>
  `;
  modalStatus.textContent = "";
  modalEditForm.classList.add("hidden");
  if (isSimpleAccessMode()) {
    modalActions.classList.add("hidden");
  } else {
    modalActions.classList.remove("hidden");
    document.getElementById("edit-reservation").classList.remove("hidden");
    document.getElementById("delete-reservation").classList.remove("hidden");
  }
  reservationModal.classList.remove("hidden");
  reservationModal.setAttribute("aria-hidden", "false");
}

function openCreateReservationModal(property, dateKey) {
  if (dateKey < getTodayDateKey()) {
    return;
  }

  state.activeReservation = {
    propertyId: property.id,
    reservationId: "",
    draftDate: dateKey,
  };
  state.modalMode = "create";
  modalTitle.textContent = `${property.name} · Nueva reserva o bloqueo`;
  modalContent.innerHTML = `
    <div class="modal-row">
      <span class="modal-label">Estado</span>
      <strong>Disponible</strong>
    </div>
    <div class="modal-row">
      <span class="modal-label">Fecha sugerida</span>
      <span>${formatDate(dateKey)}</span>
    </div>
  `;
  document.getElementById("modal-guest").value = "";
  document.getElementById("modal-channel").value = "Airbnb";
  modalStartInput.value = dateKey;
  modalEndInput.value = dateKey;
  document.getElementById("modal-income").value = "";
  syncDateBounds(modalStartInput, modalEndInput);
  modalActions.classList.add("hidden");
  modalEditForm.classList.remove("hidden");
  modalStatus.textContent = isWriteBackendEnabled()
    ? ""
    : "Esta reserva se guardara solo en esta sesion del navegador.";
  reservationModal.classList.remove("hidden");
  reservationModal.setAttribute("aria-hidden", "false");
}

function closeReservationModal() {
  reservationModal.classList.add("hidden");
  reservationModal.setAttribute("aria-hidden", "true");
  state.activeReservation = null;
  state.modalMode = "view";
  modalStatus.textContent = "";
  cancelReservationEdit();
}

function beginReservationEdit() {
  if (state.modalMode === "create") {
    return;
  }

  const context = getActiveReservationContext();
  if (!context) {
    return;
  }

  document.getElementById("modal-guest").value = context.reservation.guest || "";
  document.getElementById("modal-channel").value = context.reservation.channel;
  modalStartInput.value = context.reservation.start;
  modalEndInput.value = context.reservation.end;
  document.getElementById("modal-income").value = context.reservation.income || "";
  syncDateBounds(modalStartInput, modalEndInput);
  modalEditForm.classList.remove("hidden");
}

function cancelReservationEdit() {
  modalEditForm.reset();
  if (state.modalMode === "create") {
    closeReservationModal();
    return;
  }

  modalEditForm.classList.add("hidden");
}

async function handleReservationEditSubmit(event) {
  event.preventDefault();
  if (state.modalMode === "create") {
    await handleCreateReservationFromModal(event);
    return;
  }

  const context = getActiveReservationContext();
  if (!context) {
    return;
  }

  const updatedReservation = {
    id: context.reservation.id,
    propertyId: context.property.id,
    guest: document.getElementById("modal-guest").value.trim(),
    channel: document.getElementById("modal-channel").value,
    start: document.getElementById("modal-start").value,
    end: document.getElementById("modal-end").value,
    income: normalizeMoney(document.getElementById("modal-income").value),
  };

  if (!updatedReservation.guest || !updatedReservation.start || !updatedReservation.end) {
    modalStatus.textContent = "Completa todos los campos.";
    return;
  }

  if (updatedReservation.channel === "Limpieza" && !updatedReservation.income) {
    updatedReservation.income = "0";
  }

  if (!updatedReservation.income) {
    modalStatus.textContent = "Completa todos los campos.";
    return;
  }

  const dateError = getReservationDateError(updatedReservation);
  if (dateError) {
    modalStatus.textContent = dateError;
    return;
  }

  if (findReservationConflict(updatedReservation.propertyId, updatedReservation.start, updatedReservation.end, updatedReservation.id)) {
    modalStatus.textContent = "No disponible: esa propiedad ya tiene una reserva en esas fechas.";
    return;
  }

  try {
    await updateReservation(updatedReservation);
    modalStatus.textContent = "Reserva actualizada.";
    updateUiAfterLocalMutation(context.property.id);
    const refreshed = getReservationById(context.property.id, updatedReservation.id);
    if (refreshed) {
      openReservationModal(getSelectedProperty(), refreshed);
    }
  } catch (error) {
    console.error(error);
    modalStatus.textContent = "No se pudo actualizar la reserva.";
  }
}

async function handleCreateReservationFromModal(event) {
  const context = state.activeReservation;
  if (!context || !context.propertyId) {
    return;
  }

  const reservation = {
    propertyId: context.propertyId,
    guest: document.getElementById("modal-guest").value.trim(),
    channel: document.getElementById("modal-channel").value,
    start: document.getElementById("modal-start").value,
    end: document.getElementById("modal-end").value,
    income: normalizeMoney(document.getElementById("modal-income").value),
  };

  if (!reservation.guest || !reservation.start || !reservation.end) {
    modalStatus.textContent = "Completa todos los campos.";
    return;
  }

  if (reservation.channel === "Limpieza" && !reservation.income) {
    reservation.income = "0";
  }

  if (!reservation.income) {
    modalStatus.textContent = "Completa todos los campos.";
    return;
  }

  const dateError = getReservationDateError(reservation);
  if (dateError) {
    modalStatus.textContent = dateError;
    return;
  }

  if (findReservationConflict(reservation.propertyId, reservation.start, reservation.end)) {
    modalStatus.textContent = "No disponible: esa propiedad ya tiene una reserva en esas fechas.";
    return;
  }

  try {
    await saveReservation(reservation);
    modalStatus.textContent = isWriteBackendEnabled()
      ? "Reserva guardada correctamente."
      : "Reserva creada en esta sesion. No se sincroniza con Google Sheets.";
    updateUiAfterLocalMutation(reservation.propertyId);
    closeReservationModal();
  } catch (error) {
    console.error(error);
    modalStatus.textContent = "No se pudo guardar la reserva.";
  }
}

async function handleReservationDelete() {
  const context = getActiveReservationContext();
  if (!context) {
    return;
  }

  const confirmed = window.confirm("Se borrará esta reserva. Deseas continuar?");
  if (!confirmed) {
    return;
  }

  try {
    await deleteReservation(context.property.id, context.reservation.id);
    closeReservationModal();
    updateUiAfterLocalMutation(context.property.id);
    modalStatus.textContent = "";
  } catch (error) {
    console.error(error);
    modalStatus.textContent = "No se pudo borrar la reserva.";
  }
}

async function updateReservation(reservation) {
  if (isWriteBackendEnabled()) {
    await postToWriteBackend({
      action: "updateReservation",
      payload: buildWriteReservationPayload(reservation),
    });
  }

  const current = getReservationById(reservation.propertyId, reservation.id);
  if (!current) {
    throw new Error("Reserva no encontrada");
  }

  Object.assign(current, reservation);
}

async function deleteReservation(propertyId, reservationId) {
  if (isWriteBackendEnabled()) {
    await postToWriteBackend({
      action: "deleteReservation",
      payload: { propertyId, id: reservationId },
    });
  }

  const property = state.properties.find((item) => item.id === propertyId);
  property.reservations = property.reservations.filter((item) => item.id !== reservationId);
}

function getActiveReservationContext() {
  if (!state.activeReservation) {
    return null;
  }

  const property = state.properties.find((item) => item.id === state.activeReservation.propertyId);
  if (!property) {
    return null;
  }

  const reservation = property.reservations.find((item) => item.id === state.activeReservation.reservationId);
  if (!reservation) {
    return null;
  }

  return { property, reservation };
}

function getReservationById(propertyId, reservationId) {
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) {
    return null;
  }
  return property.reservations.find((item) => item.id === reservationId) || null;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMoney(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/[^0-9.]/g, "");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

async function bootstrapData() {
  const properties = await loadProperties();
  state.properties = properties;
  state.selectedPropertyId = properties[0] ? properties[0].id : "";
  renderPropertyTabs();
  renderCalendar();
  syncSimpleModeUi();
  setFormStatus("");
}

function isSimpleAccessMode() {
  return googleSheetsConfig.enabled;
}

function syncSimpleModeUi() {
  if (!isSimpleAccessMode()) {
    adminCard.classList.remove("hidden");
    modalActions.classList.remove("hidden");
    return;
  }

  adminCard.classList.add("hidden");
  modalActions.classList.add("hidden");
  modalEditForm.classList.add("hidden");
}
