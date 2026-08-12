/* ============================================================
   ESTUDA/ — app.js
   Detecta automaticamente os arquivos de assuntos/, monta o
   menu, a navegação, os cards e a barra de progresso.
   Não é necessário editar este arquivo para adicionar conteúdo:
   basta colocar um novo .json dentro da pasta assuntos/.
   ============================================================ */

(() => {
  'use strict';

  const ASSUNTOS_DIR = 'assuntos/';
  const STORAGE_KEY = 'estuda_progresso_v1';
  const SIDEBAR_STORAGE_KEY = 'estuda_sidebar_open';

  /* ---- Mapeamento de tipos de card: ícone + rótulo ----
     As cores vêm do CSS (classes card--<tipo>); aqui só
     definimos ícone e texto de exibição em pt-BR. */
  const TYPE_META = {
    conteudo:   { icon: '📘', label: 'Conteúdo' },
    exemplo:    { icon: '💡', label: 'Exemplo' },
    resumo:     { icon: '📝', label: 'Resumo' },
    bizu:       { icon: '🧠', label: 'Bizu' },
    atencao:    { icon: '⚠️', label: 'Atenção' },
    importante: { icon: '🚨', label: 'Muito importante' },
    observacao: { icon: '📌', label: 'Observação' },
    tabela:     { icon: '📊', label: 'Tabela' },
    conceito:   { icon: '📖', label: 'Conceito' },
    legislacao: { icon: '📜', label: 'Legislação' },
    comparacao: { icon: '⚖️', label: 'Comparação' },
    pegadinha:  { icon: '🔥', label: 'Pegadinha' },
    certo:      { icon: '✅', label: 'Certo' },
    errado:     { icon: '❌', label: 'Errado' },
  };

  /* ---- Estado da aplicação ---- */
  const state = {
    subjects: [],        // [{ file, data }]
    activeIndex: 0,
    progress: {},         // { file: true }
    subjectTitle: 'Matéria', // nome do conjunto de assuntos (ex.: "Direito Penal")
  };

  /* ---- Referências DOM ---- */
  const el = {
    navRail: document.getElementById('nav-rail'),
    navIndicator: document.getElementById('nav-indicator'),
    content: document.getElementById('content'),
    subjectName: document.getElementById('subject-name'),
    progressFill: document.getElementById('progress-fill'),
    progressPct: document.getElementById('progress-pct'),
    progressSummary: document.getElementById('progress-summary'),
    crumbSubject: document.getElementById('crumb-subject'),
    crumbTopic: document.getElementById('crumb-topic'),
    doneToggle: document.getElementById('done-toggle'),
    hamburger: document.getElementById('hamburger'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    sidebarClose: document.getElementById('sidebar-close'),
    resetBtn: document.getElementById('reset-btn'),
  };

  /* ============================================================
     1. DESCOBERTA AUTOMÁTICA DOS ARQUIVOS EM assuntos/
     Funciona tanto em http:// (fetch + autoindex) quanto em
     file:// (script tags numerados 01.json, 02.json, ...)
     ============================================================ */

  async function discoverAndLoadSubjects() {
    /* --- Tentativa 1: listagem de diretório via fetch (http:// com autoindex) --- */
    try {
      const dirRes = await fetch(ASSUNTOS_DIR, { cache: 'no-store' });
      if (dirRes.ok) {
        const html = await dirRes.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let files = Array.from(doc.querySelectorAll('a'))
          .map(a => decodeURIComponent((a.getAttribute('href') || '').split('/').pop()))
          .filter(name => name.toLowerCase().endsWith('.json'));
        files = Array.from(new Set(files));
        if (files.length) {
          files.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
          const loaded = await Promise.all(files.map(async (file) => {
            try {
              const res = await fetch(ASSUNTOS_DIR + file, { cache: 'no-store' });
              if (!res.ok) throw new Error();
              return { file, data: await res.json(), error: null };
            } catch (err) { return { file, data: null, error: err.message }; }
          }));
          state.subjects = loaded.filter(s => s.data);
          if (state.subjects.length) return;
        }
      }
    } catch {}

    /* --- Tentativa 2: script tags numerados (file:// ou sem autoindex) ---
       Carrega automaticamente 01.json, 02.json, 03.json ... até encontrar
       MAX_GAP arquivos consecutivos ausentes. Basta adicionar um novo .json
       com o próximo número — sem precisar editar nenhum arquivo de configuração. */
    const MAX_GAP = 5;
    const MAX_TRY = 99;
    const foundFiles = [];
    let consecutiveMisses = 0;

    for (let i = 1; i <= MAX_TRY && consecutiveMisses < MAX_GAP; i++) {
      const file = String(i).padStart(2, '0') + '.json';
      try {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = ASSUNTOS_DIR + file;
          s.onload = () => { foundFiles.push(file); consecutiveMisses = 0; resolve(); };
          s.onerror = () => { consecutiveMisses++; resolve(); };
          document.head.appendChild(s);
        });
      } catch { consecutiveMisses++; }
    }

    if (foundFiles.length && window.__ESTUDA_DATA__) {
      const loaded = foundFiles.map(file => ({
        file,
        data: window.__ESTUDA_DATA__[file] || null,
        error: window.__ESTUDA_DATA__[file] ? null : 'Not loaded'
      }));
      state.subjects = loaded.filter(s => s.data);
      if (state.subjects.length) return;
    }

    throw new Error('Nenhum arquivo .json encontrado em ' + ASSUNTOS_DIR);
  }

  /* ============================================================
     2. PROGRESSO (localStorage)
     ============================================================ */

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.progress = raw ? JSON.parse(raw) : {};
    } catch {
      state.progress = {};
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  }

  function isDone(file) { return !!state.progress[file]; }

  function setDone(file, done) {
    if (done) state.progress[file] = true;
    else delete state.progress[file];
    saveProgress();
    updateProgressUI();
  }

  function updateProgressUI() {
    const total = state.subjects.length;
    const done = state.subjects.filter(s => isDone(s.file)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    el.progressFill.style.width = pct + '%';
    el.progressPct.textContent = pct + '%';
    el.progressSummary.textContent = `${done} de ${total} concluídos`;

    // reflete nos itens do menu
    document.querySelectorAll('.nav__item').forEach((item) => {
      const file = item.dataset.file;
      item.classList.toggle('is-done', isDone(file));
    });

    // reflete no botão da topbar
    const current = state.subjects[state.activeIndex];
    if (current) {
      el.doneToggle.classList.toggle('is-done', isDone(current.file));
    }
  }

  /* ============================================================
     3. RENDERIZAÇÃO — MENU LATERAL
     ============================================================ */

  function renderNav() {
    el.navRail.querySelectorAll('.nav__item').forEach(n => n.remove());

    state.subjects.forEach((subject, index) => {
      const { file, data } = subject;
      const item = document.createElement('div');
      item.className = 'nav__item';
      item.dataset.file = file;
      item.dataset.index = String(index);
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');

      const num = document.createElement('span');
      num.className = 'nav__num';
      num.textContent = String(index + 1).padStart(2, '0');

      const label = document.createElement('span');
      label.className = 'nav__label';
      label.textContent = data.titulo || file;

      const check = document.createElement('span');
      check.className = 'nav__check';
      check.innerHTML = '<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.2 6L8 1" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      check.addEventListener('click', (e) => {
        e.stopPropagation();
        setDone(file, !isDone(file));
      });

      item.appendChild(num);
      item.appendChild(label);
      item.appendChild(check);

      item.addEventListener('click', () => selectSubject(index, true));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSubject(index, true); }
      });

      el.navRail.appendChild(item);
    });
  }

  function moveIndicatorTo(itemEl) {
    if (!itemEl) { el.navIndicator.style.opacity = '0'; return; }
    const railRect = el.navRail.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();
    el.navIndicator.style.opacity = '1';
    el.navIndicator.style.transform = `translateY(${itemRect.top - railRect.top}px)`;
    el.navIndicator.style.height = itemRect.height + 'px';
  }

  function highlightActiveNav() {
    const items = Array.from(document.querySelectorAll('.nav__item'));
    let activeEl = null;
    items.forEach((item) => {
      const active = Number(item.dataset.index) === state.activeIndex;
      item.classList.toggle('is-active', active);
      if (active) activeEl = item;
    });
    moveIndicatorTo(activeEl);
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ============================================================
     4. RENDERIZAÇÃO — CONTEÚDO DO ASSUNTO
     ============================================================ */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Formata texto inline: **negrito** e escaping
  function formatInline(str) {
    return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  // Verifica se a linha é separador de tabela markdown (|---|---|)
  function isTableSep(line) {
    return /^\s*\|?([\s\-:]+\|)+[\s\-:]*\|?\s*$/.test(line);
  }

  // Verifica se a linha parece uma linha de tabela (contém |)
  function isTableRow(line) {
    return line.trim().includes('|');
  }

  // Converte array de linhas de tabela markdown em HTML
  function buildTableHtml(lines) {
    const parseRow = (line) =>
      line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());

    // Linha 0 = cabeçalho, linha 1 = separador, linhas 2+ = dados
    const headers = parseRow(lines[0]);
    const headHtml = headers.map(h => `<th>${formatInline(h)}</th>`).join('');

    const rowsHtml = lines.slice(2)
      .filter(l => l.trim() && isTableRow(l) && !isTableSep(l))
      .map(line => {
        const cells = parseRow(line);
        return `<tr>${cells.map(c => `<td>${formatInline(c)}</td>`).join('')}</tr>`;
      }).join('');

    return `<div class="table-wrap"><table class="data-table"><thead><tr>${headHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
  }

  // suporte a **negrito**, parágrafos (\n\n) e tabelas markdown (|col|col|)
  // Processa linha a linha para detectar tabelas mesmo dentro de blocos maiores
  function renderRichText(text) {
    if (!text) return '';

    const allLines = text.split('\n');
    const segments = []; // { type: 'text'|'table', lines: [] }
    let i = 0;

    while (i < allLines.length) {
      // Detecta início de tabela: linha com | seguida de linha separadora
      if (isTableRow(allLines[i]) && i + 1 < allLines.length && isTableSep(allLines[i + 1])) {
        // Coleta todas as linhas da tabela
        const tableLines = [allLines[i], allLines[i + 1]];
        i += 2;
        while (i < allLines.length && (isTableRow(allLines[i]) || allLines[i].trim() === '')) {
          if (allLines[i].trim() === '') break; // linha em branco termina a tabela
          tableLines.push(allLines[i]);
          i++;
        }
        segments.push({ type: 'table', lines: tableLines });
      } else {
        // Linha de texto normal
        if (segments.length === 0 || segments[segments.length - 1].type !== 'text') {
          segments.push({ type: 'text', lines: [] });
        }
        segments[segments.length - 1].lines.push(allLines[i]);
        i++;
      }
    }

    // Renderiza cada segmento
    return segments.map(seg => {
      if (seg.type === 'table') {
        return buildTableHtml(seg.lines);
      }
      // Texto: agrupa em parágrafos separados por linhas em branco
      const raw = seg.lines.join('\n');
      const paras = raw.split(/\n\s*\n/).filter(p => p.trim());
      if (paras.length === 0) return '';
      return paras.map(p => {
        const formatted = formatInline(p);
        return `<p>${formatted.replace(/\n/g, '<br>')}</p>`;
      }).join('');
    }).join('');
  }

  function renderTable(tabela) {
    if (!tabela || !tabela.colunas) return '';
    const head = tabela.colunas.map(c => `<th>${escapeHtml(c)}</th>`).join('');
    const rows = (tabela.linhas || []).map(linha =>
      `<tr>${linha.map(cell => `<td>${renderRichText(String(cell))}</td>`).join('')}</tr>`
    ).join('');
    return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderCard(card, cardIndex) {
    if (card.tipo === 'questao') return renderQuestion(card, cardIndex);

    const meta = TYPE_META[card.tipo] || TYPE_META.conteudo;
    const wrap = document.createElement('div');
    wrap.className = `card card--${card.tipo || 'conteudo'}`;

    let html = `
      <div class="card__head">
        <span class="card__icon">${card.icone || meta.icon}</span>
        <span class="card__tag">${escapeHtml(card.rotulo || meta.label)}</span>
      </div>`;

    if (card.titulo) html += `<div class="card__title">${escapeHtml(card.titulo)}</div>`;

    let body = '';
    if (card.texto) body += renderRichText(card.texto);
    if (card.itens && card.itens.length) {
      body += `<ul class="card__list">${card.itens.map(i => `<li>${renderRichText(i)}</li>`).join('')}</ul>`;
    }
    if (card.imagem) body += `<div class="card__image"><img src="${escapeHtml(card.imagem)}" alt="${escapeHtml(card.titulo || card.rotulo || meta.label)}" loading="lazy"></div>`;
    if (card.tabela) body += renderTable(card.tabela);

    html += `<div class="card__text">${body}</div>`;
    wrap.innerHTML = html;
    return wrap;
  }

  function renderQuestion(card, index) {
    const wrap = document.createElement('div');
    wrap.className = 'question';
    wrap.innerHTML = `
      ${card.banca ? `<div class="question__banca">${escapeHtml(card.banca)}</div>` : ''}
      <div class="question__enunciado">${renderRichText(card.enunciado || '')}</div>
      ${card.imagem ? `<div class="card__image"><img src="${escapeHtml(card.imagem)}" alt="Imagem da questão" loading="lazy"></div>` : ''}
      <div class="question__gabarito">👁 Ver gabarito comentado</div>
      <div class="question__resposta">${renderRichText(card.resposta || '')}</div>
    `;
    const trigger = wrap.querySelector('.question__gabarito');
    trigger.addEventListener('click', () => wrap.classList.toggle('is-revealed'));
    return wrap;
  }

  function renderSubject(index) {
    const subject = state.subjects[index];
    if (!subject) return;
    state.activeIndex = index;
    const { file, data } = subject;

    el.content.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'subject-header';
    header.innerHTML = `
      <div class="subject-header__icon">${data.icone || '📘'}</div>
      <h1 class="subject-header__title">${escapeHtml(data.titulo || file)}</h1>
      ${data.descricao ? `<p class="subject-header__desc">${escapeHtml(data.descricao)}</p>` : ''}
    `;
    el.content.appendChild(header);

    (data.topicos || []).forEach((topico, tIndex) => {
      const topicEl = document.createElement('section');
      topicEl.className = 'topic';

      const topicHeader = document.createElement('div');
      topicHeader.className = 'topic__header';
      topicHeader.innerHTML = `
        <span class="topic__index">${String(tIndex + 1).padStart(2, '0')}</span>
        <h2 class="topic__title">${escapeHtml(topico.titulo || '')}</h2>
      `;
      topicEl.appendChild(topicHeader);

      const renderCards = (cards, container) => {
        (cards || []).forEach((card, cIndex) => container.appendChild(renderCard(card, cIndex)));
      };

      const renderImage = (img, alt) => {
        if (!img) return null;
        const div = document.createElement('div');
        div.className = 'topic__image';
        div.innerHTML = `<img src="${escapeHtml(img)}" alt="${escapeHtml(alt || '')}" loading="lazy">`;
        return div;
      };

      if (topico.imagem) {
        const img = renderImage(topico.imagem, topico.titulo);
        if (img) topicEl.appendChild(img);
      }

      if (topico.subtopicos && topico.subtopicos.length) {
        topico.subtopicos.forEach((sub) => {
          const subEl = document.createElement('div');
          subEl.className = 'subtopic';
          if (sub.titulo) {
            const subTitle = document.createElement('div');
            subTitle.className = 'subtopic__title';
            subTitle.textContent = sub.titulo;
            subEl.appendChild(subTitle);
          }
          if (sub.imagem) {
            const img = renderImage(sub.imagem, sub.titulo);
            if (img) subEl.appendChild(img);
          }
          renderCards(sub.cards, subEl);
          topicEl.appendChild(subEl);
        });
      } else {
        renderCards(topico.cards, topicEl);
      }

      el.content.appendChild(topicEl);
    });

    // Cabeçalho / breadcrumb / título da aba
    el.crumbSubject.textContent = state.subjectTitle || 'Matéria';
    el.crumbTopic.textContent = data.titulo || file;
    document.title = `${data.titulo || file} · ${state.subjectTitle || 'Estuda/'}`;

    highlightActiveNav();
    updateProgressUI();
    el.content.scrollTop = 0;
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  function selectSubject(index, closeMobile) {
    renderSubject(index);
    if (closeMobile) closeSidebarOnMobile();
  }

  /* ============================================================
     5. INTERAÇÕES — topbar, hamburger, reset, ninja toggle
     ============================================================ */

  el.doneToggle.addEventListener('click', () => {
    const current = state.subjects[state.activeIndex];
    if (!current) return;
    setDone(current.file, !isDone(current.file));
  });

  function setSidebarToggleState(isOpen) {
    if (el.hamburger) {
      el.hamburger.classList.toggle('is-open', isOpen);
      el.hamburger.setAttribute('aria-expanded', String(!!isOpen));
      el.hamburger.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    }
    if (el.overlay) {
      el.overlay.classList.toggle('is-visible', isOpen);
      el.overlay.setAttribute('aria-hidden', String(!isOpen));
    }
  }

  function openSidebar() {
    el.sidebar.classList.add('is-open');
    el.sidebar.setAttribute('aria-expanded', 'true');
    setSidebarToggleState(true);
  }

  function closeSidebarOnMobile() {
    el.sidebar.classList.remove('is-open');
    el.sidebar.setAttribute('aria-expanded', 'false');
    setSidebarToggleState(false);
  }

  el.hamburger.addEventListener('click', () => {
    el.sidebar.classList.contains('is-open') ? closeSidebarOnMobile() : openSidebar();
  });
  el.overlay.addEventListener('click', closeSidebarOnMobile);
  if (el.sidebarClose) {
    el.sidebarClose.addEventListener('click', closeSidebarOnMobile);
  }

  /* ---- Ninja Toggle — Sidebar Colapsível ---- */
  const ninjaCheckbox = document.getElementById('ninja-checkbox');
  const appEl = document.querySelector('.app');
  const floatToggle = document.getElementById('sidebar-float-toggle');

  function collapseSidebar() {
    appEl.classList.add('sidebar-collapsed');
    document.body.classList.add('sidebar-is-collapsed');
    el.sidebar.setAttribute('aria-expanded', 'false');
    if (ninjaCheckbox) ninjaCheckbox.checked = false;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'closed');
  }

  function expandSidebar() {
    appEl.classList.remove('sidebar-collapsed');
    document.body.classList.remove('sidebar-is-collapsed');
    el.sidebar.setAttribute('aria-expanded', 'true');
    if (ninjaCheckbox) ninjaCheckbox.checked = true;
    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'open');
    // Recalcula indicador de navegação após a transição
    setTimeout(() => highlightActiveNav(), 320);
  }

  function toggleSidebar() {
    appEl.classList.contains('sidebar-collapsed') ? expandSidebar() : collapseSidebar();
  }

  // Restaura o estado salvo no localStorage
  function isCompactScreen() {
    return window.matchMedia('(max-width: 1024px)').matches;
  }

  function restoreSidebarState() {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const compact = isCompactScreen();

    if (compact) {
      // Em tablets e celulares, o menu deve ficar oculto por padrão.
      closeSidebarOnMobile();
      if (ninjaCheckbox) ninjaCheckbox.checked = false;
      return;
    }

    if (saved === 'closed') {
      // Aplica imediatamente sem animação
      appEl.style.transition = 'none';
      el.sidebar.style.transition = 'none';
      collapseSidebar();
      // Restaura as transições após o paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          appEl.style.transition = '';
          el.sidebar.style.transition = '';
        });
      });
    } else {
      // Estado padrão: sidebar aberta, checkbox marcado
      if (ninjaCheckbox) ninjaCheckbox.checked = true;
    }
  }

  // Evento do checkbox ninja
  if (ninjaCheckbox) {
    ninjaCheckbox.addEventListener('change', toggleSidebar);
  }

  // Evento do botão flutuante (aparece quando a sidebar está recolhida)
  if (floatToggle) {
    floatToggle.addEventListener('click', expandSidebar);
  }

  // Tecla ESC fecha o menu (mobile) ou recolhe a sidebar (desktop)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile && el.sidebar.classList.contains('is-open')) {
        closeSidebarOnMobile();
      } else if (!isMobile && !appEl.classList.contains('sidebar-collapsed')) {
        collapseSidebar();
        if (ninjaCheckbox) ninjaCheckbox.focus();
      }
    }
  });

  el.resetBtn.addEventListener('click', () => {
    if (confirm('Zerar todo o progresso salvo neste navegador?')) {
      state.progress = {};
      saveProgress();
      updateProgressUI();
    }
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(highlightActiveNav, 120);
  });

  /* ============================================================
     6. ESTADOS DE ERRO / VAZIO
     ============================================================ */

  function renderError(message) {
    el.content.innerHTML = `
      <div class="state-panel">
        <div class="state-panel__icon">⚠️</div>
        <div class="state-panel__title">Não foi possível carregar os assuntos</div>
        <div class="state-panel__text">
          ${escapeHtml(message)}<br><br>
          Verifique se a pasta <code>assuntos/</code> existe e contém arquivos numerados
          (ex.: <code>01.json</code>, <code>02.json</code>, <code>03.json</code>).
          Para adicionar um novo assunto, basta criar o próximo arquivo numerado.
        </div>
      </div>`;
    el.subjectName.textContent = 'Estuda/';
  }

  /* ============================================================
     7. INICIALIZAÇÃO
     ============================================================ */

  async function init() {
    loadProgress();
    try {
      await discoverAndLoadSubjects();
    } catch (err) {
      renderError(err.message);
      return;
    }

    try {
      // título da matéria = título do primeiro assunto (ex.: "Direitos Humanos")
      // convenção: cada JSON pode opcionalmente informar "materia" para nomear o conjunto
      const withMateria = state.subjects.find(s => s.data.materia);
      state.subjectTitle = withMateria ? withMateria.data.materia : (state.subjects[0].data.titulo || 'Matéria');

      el.subjectName.textContent = state.subjectTitle;
      el.crumbSubject.textContent = state.subjectTitle;

      renderNav();
      renderSubject(0);
      updateProgressUI();
      restoreSidebarState();
    } catch (err) {
      renderError('Um dos arquivos de assunto está com um formato inesperado (' + err.message + ').');
    }
  }

  init();
})();
