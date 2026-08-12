'use strict';

/* ══ UTILS ═════════════════════════════════════ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const escapeHTML = (str = '') =>
    String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/* ══ ESTADO GLOBAL ═════════════════════════════ */
const AppState = {
    currentTopic: null,
    studyProgress: {},
    viewMode: 'aprender',
    
    breakpoints: {
        mobile: window.matchMedia('(max-width: 480px)'),
        tablet: window.matchMedia('(max-width: 1024px)'),
    },

    get isSmallScreen() { 
        return this.breakpoints.mobile.matches || this.breakpoints.tablet.matches; 
    },

    getData() {
        if (window.DA) return window.DA;
        const key = Object.keys(window).find(k => k.startsWith('DATA_'));
        if (key) {
            window.DA = window[key];
            return window.DA;
        }
        return null;
    }
};

/* ══ TEMA ═════════════════════════════════════ */
const ThemeManager = {
    init() {
        const saved = localStorage.getItem('mv_theme') || 'dark';
        this.apply(saved);
        $('#btn-theme')?.addEventListener('click', () => this.toggle());
    },

    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mv_theme', theme);
        const icon = $('#btn-theme .material-symbols-outlined');
        if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    },

    toggle() {
        const cur = document.documentElement.getAttribute('data-theme');
        this.apply(cur === 'dark' ? 'light' : 'dark');
    }
};

/* ══ PROGRESSO ════════════════════════════════ */
const Progress = {
    key: 'mv_progress_v7',

    load() {
        try {
            AppState.studyProgress = JSON.parse(localStorage.getItem(this.key)) || {};
        } catch { AppState.studyProgress = {}; }
    },

    save() {
        localStorage.setItem(this.key, JSON.stringify(AppState.studyProgress));
    },

    toggle(topic) {
        if (!topic) return;
        AppState.studyProgress[topic] ? delete AppState.studyProgress[topic] : AppState.studyProgress[topic] = true;
        this.save();
        this.updateUI();
        Sidebar.render();
    },

    getStats() {
        const da = AppState.getData();
        if (!da) return { total: 0, done: 0, pending: 0, pct: 0 };
        const topics = Object.keys(da);
        const done = topics.filter(t => AppState.studyProgress[t]).length;
        return {
            total: topics.length,
            done,
            pending: topics.length - done,
            pct: topics.length ? Math.round((done / topics.length) * 100) : 0
        };
    },

    updateUI() {
        const s = this.getStats();
        if ($('#prog-pct')) $('#prog-pct').textContent = `${s.pct}%`;
        if ($('#sidebar-prog-fill')) $('#sidebar-prog-fill').style.width = `${s.pct}%`;
        if ($('#top-prog .chip-text')) $('#top-prog .chip-text').textContent = `${s.done} / ${s.total} tópicos`;
    }
};

/* ══ SIDEBAR ═════════════════════════════════ */
const Sidebar = {
    init() {
        $('#search-input')?.addEventListener('input', e => this.render(e.target.value));
        $('#sidebar-list')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.topic-btn');
            if (btn) selectTopic(btn.dataset.topic);
        });
        this.render();
    },

    render(filter = '') {
        const container = $('#sidebar-list');
        const data = AppState.getData();
        if (!container || !data) return;

        const entries = Object.entries(data);
        const f = filter.toLowerCase();
        const list = filter ? entries.filter(([t]) => t.toLowerCase().includes(f)) : entries;

        if (!list.length) {
            container.innerHTML = `<div class="no-results">🔍 Nenhum tópico encontrado</div>`;
            return;
        }

        container.innerHTML = list.map(([topic, info]) => {
            const done = !!AppState.studyProgress[topic];
            const active = topic === AppState.currentTopic;
            return `
            <button class="topic-btn ${active ? 'active' : ''} ${done ? 'is-done' : ''}" 
                    data-topic="${escapeHTML(topic)}">
                <span class="topic-icon">${info.icon || '📚'}</span>
                <span class="topic-lbl">${escapeHTML(topic)}</span>
                <span class="topic-check">${done ? '✓' : ''}</span>
            </button>`;
        }).join('');
    }
};

/* ══ NAVEGAÇÃO E REGRAS MOBILE ═══════════════ */
function selectTopic(topic) {
    if (!AppState.getData()?.[topic]) return;
    AppState.currentTopic = topic;
    AppState.viewMode = 'aprender';
    
    const tabAprender = $('#tab-aprender');
    if (tabAprender) tabAprender.checked = true;

    Sidebar.render();
    renderCurrentView();

    if (AppState.isSmallScreen) {
        closeMobileSidebar();
    }
}

function openMobileSidebar() {
    const sidebar = $('#sidebar');
    const overlay = $('#sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    const sidebar = $('#sidebar');
    const overlay = $('#sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/* ══ RENDERIZAÇÃO ════════════════════════════ */
function renderCurrentView() {
    const area = $('#view-area');
    if (!area) return;

    if (AppState.viewMode === 'progresso') {
        const s = Progress.getStats();
        area.innerHTML = `
            <div class="progress-view fade-in">
                <h2>📊 Seu Desempenho</h2>
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-num">${s.done}</div>
                        <div class="stat-lbl">Concluídos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-num">${s.pct}%</div>
                        <div class="stat-lbl">Progresso Total</div>
                    </div>
                </div>
            </div>`;
        return;
    }

    if (!AppState.currentTopic) return;

    const data = AppState.getData()[AppState.currentTopic];
    const done = !!AppState.studyProgress[AppState.currentTopic];

    area.innerHTML = `
        <article class="topic-content fade-in">
            <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                <h1>${AppState.currentTopic}</h1>
                <button class="progress-btn ${done ? 'done' : ''}" onclick="toggleProgress()">
                    ${done ? '✅ Concluído' : '⏳ Marcar'}
                </button>
            </header>
            <div class="markdown-body">
                ${data.aprendizado || '<p>Conteúdo em desenvolvimento...</p>'}
            </div>
        </article>`;
    area.scrollTo({ top: 0, behavior: 'smooth' });
}

window.toggleProgress = function() {
    Progress.toggle(AppState.currentTopic);
    renderCurrentView();
};

/* ══ INICIALIZAÇÃO ══════════════════════════ */
function initializeApp() {
    ThemeManager.init();
    Progress.load();
    Sidebar.init();

    $$('input[name="main-tab"]').forEach(input => {
        input.addEventListener('change', (e) => {
            AppState.viewMode = e.target.id.replace('tab-', '');
            renderCurrentView();
        });
    });

    // Eventos Mobile
    $('#mobile-toggle')?.addEventListener('click', openMobileSidebar);
    $('#sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

    window.addEventListener('resize', () => {
        if (!AppState.isSmallScreen) closeMobileSidebar();
    });

    Progress.updateUI();
}

document.addEventListener('DOMContentLoaded', initializeApp);