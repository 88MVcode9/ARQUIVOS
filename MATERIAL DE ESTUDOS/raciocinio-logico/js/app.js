/**
 * app.js - Aplicação principal
 * Inicializa o roteador, o menu e o sistema de conteúdo.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa o roteador (criado aqui, inicialização será feita após o content existir)
    const router = new Router();

    // Inicializa o menu (instância criada agora, inicialização fará depois)
    const menu = new Menu();

    // Inicializa o gerenciador de conteúdo (iframe container)
    const content = new ContentManager();

    // Torna o router e o content acessíveis globalmente para outros módulos
    window.app = {
        router,
        menu,
        content
    };

    // Inicializa o roteador agora que window.app.content existe
    router.init();

    // Inicializa o menu (agora que window.app e router existem)
    menu.init();

    // Ouve eventos customizados 'navigate' (disparado pelo menu) e usa o roteador para navegar
    document.addEventListener('navigate', function(e) {
        const path = (e.detail && e.detail.path) || e.detail || '/inicio';
        router.navigate(path);
    });

    // Evento para abrir/fechar menu no mobile
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    function toggleSidebar(open) {
        if (open === undefined) {
            sidebar.classList.toggle('open');
        } else if (open) {
            sidebar.classList.add('open');
        } else {
            sidebar.classList.remove('open');
        }
        const isOpen = sidebar.classList.contains('open');
        overlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    openBtn.addEventListener('click', () => toggleSidebar(true));
    closeBtn.addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));

    // Fechar menu ao selecionar um item no mobile
    document.addEventListener('menuItemSelected', function(e) {
        if (window.innerWidth <= 1024) {
            toggleSidebar(false);
        }
    });

    // Ajustar comportamento do menu collapse em desktop
    let collapseTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(collapseTimeout);
        collapseTimeout = setTimeout(() => {
            if (window.innerWidth > 1024) {
                // Se o menu estava aberto via mobile, fechamos o overlay
                overlay.classList.remove('active');
                sidebar.classList.remove('open');
                document.body.style.overflow = '';
            }
        }, 200);
    });

    // Persistir estado do collapse no localStorage (opcional)
    const collapseToggle = document.getElementById('collapseToggle');
    if (collapseToggle) {
        collapseToggle.addEventListener('click', function() {
            const isCollapsed = sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
        });
    }

    // Recuperar estado do collapse
    const savedCollapse = localStorage.getItem('sidebarCollapsed');
    if (savedCollapse === 'true' && window.innerWidth > 1024) {
        sidebar.classList.add('collapsed');
    }
});