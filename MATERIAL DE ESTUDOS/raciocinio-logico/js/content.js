/**
 * content.js - Gerencia o carregamento de páginas no iframe
 */
class ContentManager {
    constructor() {
        this.contentArea = document.getElementById('contentArea');
        this.pageTitle = document.getElementById('pageTitle');
        this.defaultPage = 'inicio';
        this.cache = {};

        // Cria wrapper e iframe
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'iframe-wrapper';

        this.iframe = document.createElement('iframe');
        this.iframe.className = 'content-iframe';
        this.iframe.setAttribute('frameborder', '0');
        this.iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms');
        this.wrapper.appendChild(this.iframe);

        // Loader
        this.loader = document.createElement('div');
        this.loader.className = 'iframe-loader';
        this.loader.innerHTML = '<div class="spinner"></div>';
        this.wrapper.appendChild(this.loader);

        // Substitui conteúdo
        if (this.contentArea) {
            this.contentArea.innerHTML = '';
            this.contentArea.appendChild(this.wrapper);
        }

        // Evento de load do iframe
        this.iframe.addEventListener('load', () => {
            this.loader.style.display = 'none';
            this.iframe.classList.add('loaded');
            try {
                const doc = this.iframe.contentDocument;
                const childTitle = doc?.title;
                if (childTitle) this.pageTitle.textContent = childTitle;

                // Esconde a barra de rolagem DENTRO da página carregada
                // (a rolagem continua funcionando normalmente, só não aparece)
                if (doc && doc.head) {
                    const style = doc.createElement('style');
                    style.setAttribute('data-injected', 'hide-scrollbar');
                    style.textContent = `
                        html, body {
                            scrollbar-width: none !important;
                            -ms-overflow-style: none !important;
                        }
                        html::-webkit-scrollbar,
                        body::-webkit-scrollbar {
                            display: none !important;
                        }
                    `;
                    doc.head.appendChild(style);
                }
            } catch (e) {
                // cross-origin: não é possível acessar o documento interno
            }
        });

        // Evento de erro (página não encontrada)
        this.iframe.addEventListener('error', () => {
            this.loader.style.display = 'none';
            this.iframe.classList.remove('loaded');
            this.iframe.srcdoc = `
                <html>
                    <head><title>Página não encontrada</title></head>
                    <body style="font-family: sans-serif; text-align: center; padding-top: 60px; color: #0f172a;">
                        <h1>📄 Página não encontrada</h1>
                        <p>O arquivo solicitado não existe na pasta <strong>pages</strong>.</p>
                        <p style="color: #64748b; font-size: 0.9rem;">Verifique o nome ou volte ao início.</p>
                    </body>
                </html>
            `;
            this.pageTitle.textContent = 'Página não encontrada';
        });
    }

    async loadPage(pageId) {
        if (!pageId) pageId = this.defaultPage;
        const safeId = pageId.replace(/[^a-zA-Z0-9\-_]/g, '');
        const url = `pages/${safeId}.html`;

        // Mostra loader
        this.loader.style.display = 'flex';
        this.iframe.classList.remove('loaded');

        // Define título provisório
        this.pageTitle.textContent = safeId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Carrega no iframe
        this.iframe.src = url;

        if (this.contentArea) this.contentArea.scrollTop = 0;
    }
}