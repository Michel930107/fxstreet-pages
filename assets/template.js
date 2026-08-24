"use strict";

const ui = {
  title: document.querySelector("#dataset-title"),
  description: document.querySelector("#dataset-description"),
  sourceLink: document.querySelector("#source-link"),
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error"),
  viewer: document.querySelector("#viewer"),
  filters: document.querySelector("#filters"),
  search: document.querySelector("#search"),
  exchange: document.querySelector("#exchange-filter"),
  type: document.querySelector("#type-filter"),
  currency: document.querySelector("#currency-filter"),
  rows: document.querySelector("#symbol-rows"),
  resultCount: document.querySelector("#result-count"),
  xmlStatus: document.querySelector("#xml-status"),
  summary: document.querySelector("#dataset-summary"),
  testDialog: document.querySelector("#test-dialog"),
  testDialogForm: document.querySelector("#test-dialog-form"),
  testWarnings: document.querySelector("#test-warnings"),
  testAsset: document.querySelector("#test-asset"),
  testProviderCode: document.querySelector("#test-provider-code"),
  testSession: document.querySelector("#test-session"),
  testType: document.querySelector("#test-type"),
  testUrl: document.querySelector("#test-url"),
  testDialogError: document.querySelector("#test-dialog-error"),
  testCancel: document.querySelector("#test-cancel"),
};

const TEST_BASE_URL = "https://qa.fxstreet.com/rates-charts/chart-interactive";

const state = {
  symbols: [],
  sortKey: "tickerSymbol",
  sortDirection: 1,
};

function uniqueValues(key) {
  return [...new Set(state.symbols.map(symbol => symbol[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, values) {
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function parseSymbols(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseError = xml.querySelector("parsererror");
  if (parseError) throw new Error("El archivo XML no es válido");

  const nodes = [...xml.getElementsByTagNameNS("*", "Symbol")];
  if (!nodes.length) throw new Error("El XML no contiene elementos Symbol");

  const symbols = nodes.map(node => {
    const symbol = {};
    for (const attribute of node.attributes) symbol[attribute.name] = attribute.value;
    return symbol;
  });

  return {
    symbols,
    errorNumber: xml.documentElement.getAttribute("errorNumber") ?? "—",
  };
}

function timeRange(symbol) {
  const start = symbol.tradingTimeStart?.slice(0, 5) || "—";
  const end = symbol.tradingTimeEnd?.slice(0, 5) || "—";
  return `${start}–${end}`;
}

function makeTestUrl(parameters) {
  const url = new URL(TEST_BASE_URL);
  url.search = new URLSearchParams(parameters).toString();
  return url.href;
}

function buildTestTarget(symbol) {
  const warnings = [];
  const rawId = String(symbol.id || "");
  const idMatch = rawId.match(/^tts-(\d+)$/i);
  let providerCode = idMatch ? idMatch[1] : rawId.replace(/^tts-/i, "");

  if (!idMatch) warnings.push("El Symbol ID no tiene el formato tts-<número> esperado.");
  if (!/^\d+$/.test(providerCode)) {
    providerCode = "";
    warnings.push("No se pudo obtener un testProviderCode numérico.");
  }

  const fullDay = symbol.tradingTimeStart?.slice(0, 5) === "00:00"
    && symbol.tradingTimeEnd?.slice(0, 5) === "23:59";
  const session = fullDay ? "24x7" : "";
  if (!fullDay) warnings.push(`El horario ${timeRange(symbol)} no corresponde a 24x7. Revisa sessiontest si deseas utilizarlo.`);

  const isUsd = String(symbol.currency || "").toUpperCase() === "USD";
  const testType = isUsd ? "Forex" : "";
  if (!isUsd) warnings.push(`La moneda ${symbol.currency || "—"} no tiene una regla definida. Revisa testType si deseas utilizarlo.`);

  const parameters = {
    asset: "",
    testProviderCode: providerCode,
    sessiontest: session,
    testType,
  };

  return { url: makeTestUrl(parameters), parameters, warnings };
}

function openTestUrl(rawUrl) {
  const url = new URL(rawUrl.trim());
  const validTarget = url.protocol === "https:"
    && url.hostname === "qa.fxstreet.com"
    && url.pathname === "/rates-charts/chart-interactive";
  if (!validTarget) throw new Error("La URL debe apuntar al chart interactivo de qa.fxstreet.com.");
  window.open(url.href, "_blank", "noopener,noreferrer");
}

function showTestDialog(target) {
  ui.testWarnings.replaceChildren(...target.warnings.map(warning => {
    const item = document.createElement("li");
    item.textContent = warning;
    return item;
  }));
  const assetWarning = document.createElement("li");
  assetWarning.textContent = "Escribe testMode manualmente para habilitar la prueba.";
  ui.testWarnings.prepend(assetWarning);
  ui.testWarnings.hidden = false;
  ui.testAsset.value = target.parameters.asset;
  ui.testProviderCode.value = target.parameters.testProviderCode;
  ui.testSession.value = target.parameters.sessiontest;
  ui.testType.value = target.parameters.testType;
  updateTestUrlPreview();
  ui.testDialogError.hidden = true;
  ui.testDialog.showModal();
}

function updateTestUrlPreview() {
  ui.testUrl.value = makeTestUrl({
    asset: ui.testAsset.value.trim(),
    testProviderCode: ui.testProviderCode.value.trim(),
    sessiontest: ui.testSession.value.trim(),
    testType: ui.testType.value.trim(),
  });
}

function makeTestCell(symbol) {
  const target = buildTestTarget(symbol);
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "test-button";
  button.textContent = "TEST";
  button.dataset.testUrl = target.url;
  button.dataset.requiresVerification = String(target.warnings.length > 0);
  button.addEventListener("click", () => showTestDialog(target));
  cell.append(button);
  return cell;
}

function makeCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value || "—";
  if (className) cell.className = className;
  return cell;
}

function makeRow(symbol) {
  const row = document.createElement("tr");
  row.append(
    makeCell(symbol.tickerSymbol, "mono"),
    makeCell(symbol.name),
    makeCell(symbol.uniqueName, "mono")
  );

  const exchangeCell = document.createElement("td");
  const exchange = document.createElement("span");
  exchange.className = "exchange";
  exchange.textContent = symbol.stockExchangeName || "—";
  exchangeCell.append(exchange);

  row.append(
    exchangeCell,
    makeCell(symbol.currency),
    makeCell(symbol.typeNameEng || symbol.typeName),
    makeCell(timeRange(symbol), "mono"),
    makeCell(symbol.id, "mono"),
    makeTestCell(symbol)
  );
  return row;
}

function currentRows() {
  const query = ui.search.value.trim().toLocaleLowerCase();
  const exchange = ui.exchange.value;
  const type = ui.type.value;
  const currency = ui.currency.value;

  const filtered = state.symbols.filter(symbol => {
    const matchesQuery = !query || Object.values(symbol)
      .some(value => String(value).toLocaleLowerCase().includes(query));
    return matchesQuery
      && (!exchange || symbol.stockExchangeName === exchange)
      && (!type || (symbol.typeNameEng || symbol.typeName) === type)
      && (!currency || symbol.currency === currency);
  });

  return filtered.sort((left, right) => {
    const a = String(left[state.sortKey] || "");
    const b = String(right[state.sortKey] || "");
    return a.localeCompare(b, undefined, { numeric: true }) * state.sortDirection;
  });
}

function render() {
  const symbols = currentRows();
  ui.rows.replaceChildren(...symbols.map(makeRow));

  if (!symbols.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.className = "empty";
    cell.textContent = "No hay símbolos que coincidan con los filtros.";
    row.append(cell);
    ui.rows.append(row);
  }

  ui.resultCount.textContent = `${symbols.length} de ${state.symbols.length} símbolos`;
}

function updateSortHeader(activeHeader) {
  for (const header of document.querySelectorAll("th[data-key]")) {
    header.removeAttribute("data-direction");
  }
  activeHeader.dataset.direction = state.sortDirection === 1 ? "asc" : "desc";
}

function sortBy(header) {
  const key = header.dataset.key;
  if (state.sortKey === key) state.sortDirection *= -1;
  else {
    state.sortKey = key;
    state.sortDirection = 1;
  }
  updateSortHeader(header);
  render();
}

function setupInteractions() {
  ui.filters.addEventListener("input", render);
  ui.filters.addEventListener("reset", () => setTimeout(render));

  for (const header of document.querySelectorAll("th[data-key]")) {
    header.addEventListener("click", () => sortBy(header));
    header.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        sortBy(header);
      }
    });
  }

  ui.testCancel.addEventListener("click", () => ui.testDialog.close());
  ui.testDialogForm.addEventListener("input", updateTestUrlPreview);
  ui.testDialogForm.addEventListener("submit", event => {
    event.preventDefault();
    try {
      openTestUrl(ui.testUrl.value);
      ui.testDialog.close();
    } catch (error) {
      ui.testDialogError.textContent = error.message;
      ui.testDialogError.hidden = false;
    }
  });
}

function setSummary(symbols) {
  const exchanges = uniqueValues("stockExchangeName");
  const currencies = uniqueValues("currency");
  const hours = [...new Set(symbols.map(timeRange))];
  const currencyText = currencies.join(", ") || "—";
  const hoursText = hours.length === 1 ? hours[0] : `${hours.length} horarios`;
  ui.summary.textContent = `${symbols.length} TTS Symbols · ${exchanges.length} exchanges · ${currencyText} · ${hoursText}`;
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo leer ${url} (HTTP ${response.status})`);
  return response.json();
}

async function loadDataset() {
  try {
    const datasetId = new URLSearchParams(location.search).get("dataset");
    if (!datasetId) throw new Error("Falta el parámetro dataset en la URL");

    const catalog = await getJson("data/pages.json");
    const page = catalog.find(item => item.id === datasetId);
    if (!page) throw new Error(`El dataset “${datasetId}” no existe en el catálogo`);

    const sourceUrl = new URL(page.source, location.href);
    if (sourceUrl.origin !== location.origin) throw new Error("La fuente de datos debe pertenecer a este sitio");

    ui.title.textContent = page.title;
    ui.description.textContent = page.description || "";
    document.title = `${page.title} · TTS Symbols Guide`;
    ui.sourceLink.href = page.source;
    ui.sourceLink.hidden = false;

    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo leer el XML (HTTP ${response.status})`);
    const parsed = parseSymbols(await response.text());

    state.symbols = parsed.symbols;
    ui.xmlStatus.textContent = `errorNumber: ${parsed.errorNumber}`;
    fillSelect(ui.exchange, uniqueValues("stockExchangeName"));
    fillSelect(ui.type, [...new Set(state.symbols.map(s => s.typeNameEng || s.typeName).filter(Boolean))].sort());
    fillSelect(ui.currency, uniqueValues("currency"));
    setSummary(state.symbols);
    setupInteractions();

    const defaultHeader = document.querySelector('th[data-key="tickerSymbol"]');
    defaultHeader.dataset.direction = "asc";
    render();
    ui.loading.hidden = true;
    ui.viewer.hidden = false;
  } catch (error) {
    ui.loading.hidden = true;
    ui.error.textContent = error.message;
    ui.error.hidden = false;
    ui.title.textContent = "No se pudo abrir el dataset";
    ui.description.textContent = "Revisa el catálogo o la URL de la página.";
  }
}

loadDataset();
