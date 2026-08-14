import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

// ──────────────────── DADOS ────────────────────
const pdfCollection = [
  { file: "./shared/pdfs/razao.pdf", title: "Razão e Proporção (Parte 1) – Razão, quociente e exemplo de concurso", category: "Razão", icon: "📐" },
  { file: "./shared/pdfs/frações.pdf", title: "Frações (Parte 1) – Conceito, operações com MMC", category: "Frações", icon: "🍕" },
  { file: "./shared/pdfs/decimais e porcentagem.pdf", title: "Números decimais – Definição e operações", category: "Decimais", icon: "🔢" },
  { file: "./shared/pdfs/porcentagem.pdf", title: "Porcentagem de um número – Exemplo 30% de 90", category: "Porcentagem", icon: "🎯" },
  { file: "./shared/pdfs/potenciação.pdf", title: "Propriedades das potências – P1 a P5", category: "Álgebra", icon: "⚡" },
  { file: "./shared/pdfs/radiciação.pdf", title: "Página de créditos – Missão PMAL (Radiciação)", category: "Complementar", icon: "📄" },
  { file: "./shared/pdfs/racionalização de denominadores.pdf", title: "Racionalização de denominadores (1º caso – introdução)", category: "Radiciação", icon: "🧩" },
  { file: "./shared/pdfs/racionalização de denominadores.pdf", title: "Racionalização – 2º caso (√a ± √b) com exemplos", category: "Radiciação", icon: "🧩" },
  { file: "./shared/pdfs/conjuntos.pdf", title: "Conjuntos – Subconjunto (N ⊂ A) e relação de inclusão", category: "Conjuntos", icon: "📁" },
  { file: "./shared/pdfs/matrizes.pdf", title: "Matrizes (Parte 1) – Definição e aplicação em sistemas lineares", category: "Matrizes", icon: "📊" },
  { file: "./shared/pdfs/sistema linear.pdf", title: "Método da adição para sistemas lineares", category: "Sistemas", icon: "➕" },
  { file: "./shared/pdfs/números complexos.pdf", title: "Números Complexos (Parte 1) – Definição a+bi, i² = -1", category: "Complexos", icon: "🌀" },
  { file: "./shared/pdfs/escala.pdf", title: "Escala – Definição E = d/R e exemplo prático (1:2000)", category: "Escala", icon: "📏" },
  { file: "./shared/pdfs/juros.pdf", title: "Juros", category: "Complementar", icon: "📄" }
];

// ──────────────────── ESTADO ────────────────────
let currentSelectedTag = "todos";
let currentPdfDoc = null;
let currentPageNum = 1;
let totalPages = 0;

// ──────────────────── TAGS ────────────────────
function buildCategoryTags() {
  const tagContainer = document.getElementById("tagContainer");
  if (!tagContainer) return;

  tagContainer.innerHTML = `<button class="tag-btn active" data-category="todos"><span class="tag-icon">📚</span> Todos</button>`;
  const categories = [...new Set(pdfCollection.map(item => item.category))];

  const iconMap = {
    'Razão': '📐', 'Frações': '🍕', 'Decimais': '🔢', 'Porcentagem': '🎯',
    'Álgebra': '⚡', 'Complementar': '📄', 'Radiciação': '🧩',
    'Conjuntos': '📁', 'Matrizes': '📊', 'Sistemas': '➕',
    'Complexos': '🌀', 'Escala': '📏'
  };

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "tag-btn";
    const icon = iconMap[cat] || '📌';
    btn.innerHTML = `<span class="tag-icon">${icon}</span> ${escapeHtml(cat)}`;
    btn.dataset.category = cat.toLowerCase();
    tagContainer.appendChild(btn);
  });

  const catCount = document.getElementById("catCount");
  if (catCount) catCount.textContent = categories.length;
}

// ──────────────────── RENDER CARDS ────────────────────
function renderCards(filterText = "") {
  const grid = document.getElementById("pdfGrid");
  const resultsInfo = document.getElementById("resultsInfo");
  const resultsCount = document.getElementById("resultsCount");
  if (!grid) return;

  grid.innerHTML = "";
  const lower = filterText.toLowerCase().trim();
  let visible = 0;
  const frag = document.createDocumentFragment();

  pdfCollection.forEach((item, index) => {
    const matchTitle = item.title.toLowerCase().includes(lower);
    const matchCategory = item.category.toLowerCase().includes(lower);
    const matchTag = currentSelectedTag === "todos" || item.category.toLowerCase() === currentSelectedTag;
    const show = lower !== "" ? (matchTitle || matchCategory) : matchTag;

    if (!show) return;
    visible++;

    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = `${visible * 0.04}s`;
    card.addEventListener("click", () => openModal(item.file, item.title, item.icon || '📘'));
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Abrir: ${item.title}`);

    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">${escapeHtml(item.icon || '📘')}</span>
        <div class="card-title">${escapeHtml(item.title)}</div>
        <span class="badge">${escapeHtml(item.category)}</span>
      </div>
      <div class="card-body">
        <div class="card-description">Clique para visualizar o conteúdo completo com navegação página a página.</div>
      </div>
      <div class="card-footer">
        <span class="card-index">#${String(index + 1).padStart(2, "0")}</span>
        <span class="view-btn">Abrir Material <span class="arrow">→</span></span>
      </div>
    `;
    frag.appendChild(card);
  });

  grid.appendChild(frag);

  if (resultsCount) resultsCount.textContent = visible;
  if (resultsInfo) {
    if (visible === 0) {
      resultsInfo.innerHTML = 'Nenhum material encontrado. <span class="no-results-suggestion">Tente outro termo ou categoria.</span>';
    } else if (lower !== "") {
      resultsInfo.innerHTML = `Exibindo <strong>${visible}</strong> resultado${visible !== 1 ? 's' : ''} para a busca`;
    } else {
      resultsInfo.innerHTML = `Exibindo <strong>${visible}</strong> material${visible !== 1 ? 'is' : ''}`;
    }
  }

  const totalCount = document.getElementById("totalCount");
  if (totalCount && lower === "" && currentSelectedTag === "todos") {
    totalCount.textContent = visible;
  }

  if (visible === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <span class="no-results-icon">🔎</span>
        <p>Nenhum material encontrado.</p>
        <p class="no-results-suggestion">Tente ajustar os filtros ou limpar a busca.</p>
      </div>
    `;
  }
}

// ──────────────────── MODAL / PDF ────────────────────
async function openModal(pdfUrl, title, icon = '📘') {
  const modal = document.getElementById("pdfModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalIcon = document.querySelector(".modal-title-icon");
  const pageIndicator = document.getElementById("pageIndicator");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (!modal || !modalTitle || !modalBody) return;

  if (modalIcon) modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  if (pageIndicator) pageIndicator.textContent = "—";
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  currentPageNum = 1;
  totalPages = 0;

  if (currentPdfDoc) {
    try { currentPdfDoc.destroy(); } catch (_) {}
    currentPdfDoc = null;
  }

  modalBody.innerHTML = `
    <div class="pdf-loading" id="pdfLoading">
      <div class="pdf-loading-spinner"></div>
      <div class="pdf-loading-text">Carregando PDF...</div>
    </div>
  `;

  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    currentPdfDoc = pdf;
    totalPages = pdf.numPages;
    currentPageNum = 1;
    updatePageIndicator();
    updateNavButtons();
    await renderCurrentPage();
    scrollToTop();
  } catch (err) {
    console.error("Erro ao abrir PDF:", err);
    modalBody.innerHTML = `
      <div class="pdf-error">
        <span class="pdf-error-icon">⚠️</span>
        <p>Erro ao abrir o PDF.</p>
        <p style="font-size:0.8rem;color:var(--text-muted)">Verifique se o arquivo existe e tente novamente.</p>
      </div>
    `;
  }
}

// ─── RENDERIZAÇÃO COM ESCALA DINÂMICA ───
async function renderCurrentPage() {
  const modalBody = document.getElementById("modalBody");
  if (!modalBody || !currentPdfDoc) return;

  modalBody.innerHTML = `
    <div class="pdf-loading">
      <div class="pdf-loading-spinner"></div>
      <div class="pdf-loading-text">Renderizando página ${currentPageNum}...</div>
    </div>
  `;

  try {
    const page = await currentPdfDoc.getPage(currentPageNum);
    const width = window.innerWidth;

    // Escala adaptativa para mobile, tablet e desktop
    let scale;
    if (width < 480) {
      scale = 2.6;          // smartphones pequenos
    } else if (width < 768) {
      scale = 2.2;          // smartphones grandes
    } else if (width < 1024) {
      scale = 2.0;          // tablets
    } else {
      scale = 1.6;          // desktop
    }

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    modalBody.innerHTML = "";
    const container = document.createElement("div");
    container.className = "pdf-page-container";
    const wrapper = document.createElement("div");
    wrapper.className = "pdf-page";
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
    modalBody.appendChild(container);

    updatePageIndicator();
    updateNavButtons();
  } catch (err) {
    console.error("Erro ao renderizar página:", err);
    modalBody.innerHTML = `
      <div class="pdf-error">
        <span class="pdf-error-icon">⚠️</span>
        <p>Erro ao renderizar a página.</p>
      </div>
    `;
  }
}

// ─── UTILITÁRIOS ───
function scrollToTop() {
  const body = document.getElementById("modalBody");
  if (body) body.scrollTop = 0;
}

function updatePageIndicator() {
  const ind = document.getElementById("pageIndicator");
  if (ind) ind.textContent = totalPages > 0 ? `${currentPageNum} / ${totalPages}` : "—";
}

function updateNavButtons() {
  const prev = document.getElementById("prevPageBtn");
  const next = document.getElementById("nextPageBtn");
  if (prev) prev.disabled = currentPageNum <= 1;
  if (next) next.disabled = currentPageNum >= totalPages;
}

function goToPrevPage() {
  if (currentPageNum > 1) { currentPageNum--; renderCurrentPage(); scrollToTop(); }
}
function goToNextPage() {
  if (currentPageNum < totalPages) { currentPageNum++; renderCurrentPage(); scrollToTop(); }
}

function closeModal() {
  const modal = document.getElementById("pdfModal");
  const body = document.getElementById("modalBody");
  if (!modal || !body) return;
  modal.classList.remove("active");
  body.innerHTML = `<div class="pdf-loading"><div class="pdf-loading-spinner"></div><div class="pdf-loading-text">Carregando conteúdo...</div></div>`;
  document.body.style.overflow = "";
  currentPageNum = 1;
  totalPages = 0;
  const ind = document.getElementById("pageIndicator");
  if (ind) ind.textContent = "—";
  const prev = document.getElementById("prevPageBtn");
  const next = document.getElementById("nextPageBtn");
  if (prev) prev.disabled = true;
  if (next) next.disabled = true;
  if (currentPdfDoc) { try { currentPdfDoc.destroy(); } catch (_) {} currentPdfDoc = null; }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m] || m));
}

// ──────────────────── EVENTOS / INICIALIZAÇÃO ────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildCategoryTags();
  renderCards();

  // Tags
  const tagContainer = document.getElementById("tagContainer");
  if (tagContainer) {
    tagContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".tag-btn");
      if (!btn) return;
      document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSelectedTag = btn.dataset.category;
      const input = document.getElementById("filterInput");
      if (input) input.value = "";
      const clear = document.getElementById("searchClear");
      if (clear) clear.classList.remove("visible");
      renderCards();
    });
  }

  // Busca
  const filterInput = document.getElementById("filterInput");
  const searchClear = document.getElementById("searchClear");
  if (filterInput) {
    filterInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (searchClear) val.length ? searchClear.classList.add("visible") : searchClear.classList.remove("visible");
      if (val.length > 0) {
        document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
        const todos = document.querySelector('.tag-btn[data-category="todos"]');
        if (todos) todos.classList.add("active");
        currentSelectedTag = "todos";
      }
      renderCards(val);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== filterInput && !document.getElementById("pdfModal")?.classList.contains("active")) {
        e.preventDefault();
        filterInput.focus();
      }
    });
  }
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      if (filterInput) { filterInput.value = ""; filterInput.focus(); }
      searchClear.classList.remove("visible");
      currentSelectedTag = "todos";
      document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
      const def = document.querySelector('.tag-btn[data-category="todos"]');
      if (def) def.classList.add("active");
      renderCards();
    });
  }

  // Modal fechar
  const closeBtn = document.getElementById("closeModal");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  const modal = document.getElementById("pdfModal");
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // Navegação páginas
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  if (prevBtn) prevBtn.addEventListener("click", goToPrevPage);
  if (nextBtn) nextBtn.addEventListener("click", goToNextPage);

  // Teclado
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (document.getElementById("pdfModal")?.classList.contains("active")) {
        closeModal();
      } else if (filterInput && document.activeElement === filterInput && filterInput.value.length > 0) {
        filterInput.value = "";
        if (searchClear) searchClear.classList.remove("visible");
        currentSelectedTag = "todos";
        document.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("active"));
        const def = document.querySelector('.tag-btn[data-category="todos"]');
        if (def) def.classList.add("active");
        renderCards();
      }
    }
    if (document.getElementById("pdfModal")?.classList.contains("active")) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goToPrevPage(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goToNextPage(); }
    }
  });

  // Redimensionar
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (document.getElementById("pdfModal")?.classList.contains("active") && currentPdfDoc) {
        renderCurrentPage();
      }
    }, 300);
  });
});