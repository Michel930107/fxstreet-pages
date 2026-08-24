"use strict";

const catalog = document.querySelector("#catalog");
const status = document.querySelector("#catalog-status");
const pageCount = document.querySelector("#page-count");

function makeCard(page) {
  const link = document.createElement("a");
  link.className = "catalog-card";
  link.href = `template.html?dataset=${encodeURIComponent(page.id)}`;

  const category = document.createElement("span");
  category.className = "tag";
  category.textContent = page.category || "Dataset";

  const title = document.createElement("h3");
  title.textContent = page.title;

  const description = document.createElement("p");
  description.textContent = page.description || "Abrir dataset";

  const open = document.createElement("span");
  open.className = "open-link";
  open.textContent = "Abrir página →";

  link.append(category, title, description, open);
  return link;
}

async function loadCatalog() {
  try {
    const response = await fetch("data/pages.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const pages = await response.json();
    if (!Array.isArray(pages)) throw new Error("El catálogo no es una lista");

    catalog.replaceChildren(...pages.map(makeCard));
    pageCount.textContent = `${pages.length} página${pages.length === 1 ? "" : "s"}`;
    status.hidden = pages.length > 0;
    if (!pages.length) status.textContent = "Todavía no hay páginas en el catálogo.";
  } catch (error) {
    pageCount.textContent = "Error";
    status.textContent = `No se pudo cargar el catálogo: ${error.message}`;
    status.classList.add("error");
  }
}

loadCatalog();
