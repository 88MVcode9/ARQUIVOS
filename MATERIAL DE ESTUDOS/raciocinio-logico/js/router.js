/**
 * router.js - Roteador SPA com History API
 * Carrega automaticamente qualquer .html da pasta 'pages'
 */
class Router {
    constructor() {
        this.routes = [];
        this.currentPath = '';
        this.basePath = '';
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Determina a basePath (diretório do index.html)
        const path = window.location.pathname;
        if (path.endsWith('/')) {
            this.basePath = path;
        } else {
            const parts = path.split('/');
            parts.pop();
            this.basePath = parts.join('/') + '/';
        }

        // Escuta popstate (voltar/avançar)
        window.addEventListener('popstate', (event) => {
            const statePath = event.state?.path || window.location.pathname;
            this.handleRoute(statePath);
        });

        // Rota inicial
        this.handleRoute(window.location.pathname);
    }

    // Registra uma rota específica (opcional)
    register(path, handler) {
        this.routes.push({ path, handler });
    }

    // Navega para uma rota
    navigate(path, replace = false) {
        if (!path.startsWith('/')) path = '/' + path;
        const fullPath = this.basePath + path.slice(1);
        const url = fullPath || '/';

        if (replace) {
            window.history.replaceState({ path }, '', url);
        } else {
            window.history.pushState({ path }, '', url);
        }
        this.handleRoute(path);
    }

    // Processa a rota
    handleRoute(path) {
        // Remove basePath se presente
        let routePath = path;
        if (this.basePath && routePath.startsWith(this.basePath)) {
            routePath = '/' + routePath.slice(this.basePath.length);
        }
        if (routePath.length > 1 && routePath.endsWith('/')) {
            routePath = routePath.slice(0, -1);
        }
        // Trata acesso direto a index.html (ex: .../index.html) como rota raiz
        if (/^\/index\.html?$/i.test(routePath)) {
            routePath = '/';
        }
        if (routePath === '' || routePath === '/') {
            routePath = '/inicio';
        }

        this.currentPath = routePath;

        // Verifica rotas registradas
        for (const route of this.routes) {
            if (route.path === routePath) {
                route.handler();
                return;
            }
        }

        // Fallback: carrega página da pasta pages
        const pageId = routePath.replace(/^\//, '');
        if (window.app?.content && typeof window.app.content.loadPage === 'function') {
            const safeId = pageId.replace(/[^a-zA-Z0-9\-_]/g, '').split('/').pop() || 'inicio';
            window.app.content.loadPage(safeId);
        } else {
            console.warn('ContentManager não disponível para rota:', routePath);
        }
    }

    getCurrentPath() {
        return this.currentPath;
    }

    getUrl(path) {
        if (!path.startsWith('/')) path = '/' + path;
        return this.basePath + path.slice(1);
    }
}