"use strict";

const catalog = document.querySelector("#catalog");
const status = document.querySelector("#catalog-status");

function makeCard(page) {
  const link = document.createElement("a");
  link.className = "catalog-row";
  link.href = `template.html?dataset=${encodeURIComponent(page.id)}`;

  const title = document.createElement("h3");
  title.textContent = page.title;

  const description = document.createElement("p");
  description.textContent = page.description || "Abrir dataset";

  const open = document.createElement("span");
  open.className = "open-link";
  open.textContent = "Abrir página →";

  const copy = document.createElement("span");
  copy.className = "catalog-copy";
  copy.append(title, description);

  link.append(copy, open);
  return link;
}

async function loadCatalog() {
  try {
    const response = await fetch("data/pages.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const pages = await response.json();
    if (!Array.isArray(pages)) throw new Error("El catálogo no es una lista");

    catalog.replaceChildren(...pages.map(makeCard));
    status.hidden = pages.length > 0;
    if (!pages.length) status.textContent = "Todavía no hay páginas en el catálogo.";
  } catch (error) {
    status.textContent = `No se pudo cargar el catálogo: ${error.message}`;
    status.classList.add("error");
  }
}

loadCatalog();
