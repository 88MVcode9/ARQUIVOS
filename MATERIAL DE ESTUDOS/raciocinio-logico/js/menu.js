/**
 * menu.js - Gera menu dinâmico a partir de menu.json
 */
class Menu {
    constructor() {
        this.menuData = [];
        this.menuNav = document.getElementById('menuNav');
        this.searchInput = document.getElementById('searchInput');
        this.currentItemId = null;
    }

    async init() {
        try {
            await this.loadMenuData();
            this.render();
            this.setupSearch();
            this.highlightCurrentItem();
        } catch (error) {
            console.error('Erro ao carregar menu:', error);
            this.menuNav.innerHTML = '<p style="color:#94A3B8; padding:16px;">Erro ao carregar menu.</p>';
        }
    }

    async loadMenuData() {
        const response = await fetch('data/menu.json');
        if (!response.ok) throw new Error('Falha ao carregar menu.json');
        const data = await response.json();

        // Verifica se os arquivos .html existem (evita links quebrados)
        const filtered = [];
        for (const item of data) {
            if (item.tipo === 'pagina' && item.conteudo) {
                const url = `pages/${item.conteudo}.html`;
                try {
                    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
                    if (r.ok) {
                        filtered.push(item);
                    } else {
                        console.warn(`Arquivo não encontrado: ${url} — item "${item.nome}" ignorado.`);
                    }
                } catch {
                    console.warn(`Erro ao verificar ${url} — item ignorado.`);
                }
            } else {
                filtered.push(item);
            }
        }
        this.menuData = filtered;
    }

    render() {
        if (!this.menuNav) return;
        this.menuNav.innerHTML = '';

        // Lista simples, sem categorias/subpastas: um item por assunto.
        this.menuData.forEach(item => this.menuNav.appendChild(this.createMenuItem(item)));
    }

    createMenuItem(item) {
        const a = document.createElement('a');
        a.className = 'menu-item';
        a.href = '#';
        a.dataset.id = item.id;
        a.dataset.tipo = item.tipo || 'pagina';

        const icon = document.createElement('i');
        icon.className = item.icone ? `fas fa-${item.icone}` : 'fas fa-circle';
        a.appendChild(icon);

        const text = document.createElement('span');
        text.className = 'text';
        text.textContent = item.nome;
        a.appendChild(text);

        if (item.badge) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = item.badge;
            a.appendChild(badge);
        }

        // Só abre em outra aba se for realmente um link externo (http/https).
        const isExternal = item.tipo === 'link' && /^https?:\/\//i.test(item.url || '');

        if (isExternal) {
            a.classList.add('external-link');
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.href = item.url;
        } else {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectItem(item.id);
                const event = new CustomEvent('navigate', { detail: { path: `/${item.id}` } });
                document.dispatchEvent(event);
                document.dispatchEvent(new Event('menuItemSelected'));
            });
        }
        return a;
    }

    selectItem(id) {
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`.menu-item[data-id="${id}"]`);
        if (target) target.classList.add('active');
        this.currentItemId = id;
    }

    highlightCurrentItem() {
        const path = window.app?.router?.getCurrentPath() || '/inicio';
        const id = path.replace('/', '');
        if (id) this.selectItem(id);
    }

    setupSearch() {
        if (!this.searchInput) return;
        this.searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const items = this.menuNav.querySelectorAll('.menu-item');
            const categories = this.menuNav.querySelectorAll('.category');

            items.forEach(item => {
                const text = item.querySelector('.text')?.textContent?.toLowerCase() || '';
                item.classList.toggle('hidden', !text.includes(term));
            });

            categories.forEach(cat => {
                const subItems = cat.querySelectorAll('.menu-item');
                let hasVisible = false;
                subItems.forEach(sub => { if (!sub.classList.contains('hidden')) hasVisible = true; });
                cat.classList.toggle('hidden', !hasVisible && term !== '');
                if (hasVisible && term !== '') {
                    const sub = cat.querySelector('.sub-menu');
                    const icon = cat.querySelector('.toggle-icon');
                    if (sub) { sub.classList.add('open'); icon?.classList.add('open'); }
                }
            });
        });
    }
}