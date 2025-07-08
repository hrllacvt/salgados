// Main Application Module
const App = {
    currentPage: 'cardapio',
    
    // Initialize application
    init: () => {
        Utils.setLoading(true);
        
        // Check URL for admin access
        if (window.location.pathname.includes('/admin') || window.location.hash.includes('admin')) {
            App.showAdminPage();
            Utils.setLoading(false);
            return;
        }
        
        // Always show main app first (cardápio) - no login required
        App.showMainApp();
        
        Utils.setLoading(false);
    },

    // Show authentication pages
    showAuthPages: () => {
        document.getElementById('navbar').style.display = 'none';
        document.querySelectorAll('.main-page').forEach(page => {
            page.style.display = 'none';
        });
        document.getElementById('admin-page').style.display = 'none';
        document.getElementById('login-page').style.display = 'flex';
    },

    // Show main application
    showMainApp: () => {
        document.querySelectorAll('.auth-page').forEach(page => {
            page.style.display = 'none';
        });
        document.getElementById('admin-page').style.display = 'none';
        document.getElementById('navbar').style.display = 'block';
        
        // Show default page (cardapio)
        App.showPage('cardapio');
        
        // Initialize modules
        Menu.init();
        Cart.init();
        
        // Update navbar based on login status
        App.updateNavbarForLoginStatus();
    },

    // Update navbar based on login status
    updateNavbarForLoginStatus: () => {
        const isLoggedIn = Auth.isLoggedIn();
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            const onclick = btn.getAttribute('onclick');
            if (onclick && (onclick.includes('historico') || onclick.includes('perfil'))) {
                if (!isLoggedIn) {
                    btn.style.opacity = '0.6';
                    btn.title = 'Faça login para acessar';
                } else {
                    btn.style.opacity = '1';
                    btn.title = '';
                }
            }
        });

        // Show/hide login and logout buttons
        const loginBtn = document.querySelector('.login-btn');
        const logoutBtn = document.querySelector('.logout-btn');
        
        if (loginBtn) {
            loginBtn.style.display = isLoggedIn ? 'none' : 'block';
        }
        if (logoutBtn) {
            logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
        }
    },

    // Show admin page
    showAdminPage: () => {
        document.querySelectorAll('.auth-page').forEach(page => {
            page.style.display = 'none';
        });
        document.querySelectorAll('.main-page').forEach(page => {
            page.style.display = 'none';
        });
        document.getElementById('navbar').style.display = 'none';
        document.getElementById('admin-page').style.display = 'block';
        
        // Check if admin is logged in
        if (Auth.isAdminLoggedIn()) {
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'flex';
            Admin.init();
        } else {
            document.getElementById('admin-login').style.display = 'flex';
            document.getElementById('admin-panel').style.display = 'none';
        }
    },

    // Show specific page
    showPage: (pageName) => {
        // Check if user needs to be logged in for certain pages
        if ((pageName === 'historico' || pageName === 'perfil') && !Auth.isLoggedIn()) {
            App.showAuthPages();
            Utils.showMessage('Você precisa fazer login para acessar esta página!', 'error');
            return;
        }

        // For cart page, allow access but show login prompt when trying to checkout
        if (pageName === 'carrinho' && !Auth.isLoggedIn()) {
            // Allow access to cart page but will require login at checkout
        }

        App.currentPage = pageName;
        
        // Hide all main pages
        document.querySelectorAll('.main-page').forEach(page => {
            page.style.display = 'none';
        });
        
        // Show selected page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        // Update navigation
        App.updateNavigation(pageName);
        
        // Load page-specific data
        switch (pageName) {
            case 'cardapio':
                Menu.loadMenuItems();
                break;
            case 'carrinho':
                Cart.renderCart();
                Cart.updateCartSummary();
                if (Auth.isLoggedIn()) {
                    Cart.loadAddressOptions();
                }
                break;
            case 'historico':
                if (Auth.isLoggedIn()) {
                    History.loadHistory();
                }
                break;
            case 'perfil':
                if (Auth.isLoggedIn()) {
                    Profile.loadProfile();
                }
                break;
        }
    },

    // Update navigation active state
    updateNavigation: (activePage) => {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the corresponding nav button
        const activeBtn = document.querySelector(`.nav-btn[onclick*="${activePage}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    },

    // Check if user needs login for action
    requireLogin: (callback) => {
        if (!Auth.isLoggedIn()) {
            App.showAuthPages();
            Utils.showMessage('Você precisa fazer login para continuar!', 'error');
            return false;
        }
        callback();
        return true;
    }
};

// History Module
const History = {
    // Initialize history
    init: () => {
        History.loadHistory();
    },

    // Load user's order history
    loadHistory: async () => {
        const historyContainer = document.getElementById('history-items');
        if (!historyContainer) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        try {
            const response = await ApiClient.get(`${API_CONFIG.endpoints.orders}?user_id=${currentUser.id}`);
            
            if (response.sucesso) {
                const userOrders = response.dados.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

                if (userOrders.length === 0) {
                    historyContainer.innerHTML = `
                        <div class="history-empty">
                            <h3>Nenhum pedido encontrado</h3>
                            <p>Você ainda não fez nenhum pedido. Que tal dar uma olhada no nosso cardápio?</p>
                            <button class="btn btn-primary" onclick="showPage('cardapio')">Ver Cardápio</button>
                        </div>
                    `;
                    return;
                }

                historyContainer.innerHTML = userOrders.map(order => `
                    <div class="history-item">
                        <div class="history-item-header">
                            <div class="history-order-id">${order.numero_pedido}</div>
                            <div class="history-date">${Utils.formatDate(order.criado_em)}</div>
                            <div class="history-status ${order.status}">
                                ${Admin.getStatusLabel(order.status)}
                            </div>
                        </div>
                        
                        <div class="history-items-list">
                            ${order.itens.map(item => `
                                <div class="order-item">
                                    <span>
                                        ${item.quantity}x ${item.nome}
                                        (${Utils.getQuantityLabel(item.quantityType, item.unitCount)})
                                    </span>
                                    <span>${Utils.formatCurrency(item.totalPrice)}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="history-total">
                            Total: ${Utils.formatCurrency(order.total)}
                        </div>
                        
                        ${order.status === 'rejeitado' && order.motivo_rejeicao ? `
                            <div class="rejection-reason">
                                <strong>Motivo da recusa:</strong> ${order.motivo_rejeicao}
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = `
                    <div class="history-empty">
                        <h3>Erro ao carregar histórico</h3>
                        <p>${response.mensagem}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            historyContainer.innerHTML = `
                <div class="history-empty">
                    <h3>Erro ao carregar histórico</h3>
                    <p>Verifique sua conexão e tente novamente.</p>
                </div>
            `;
        }
    }
};

// Global navigation function
function showPage(pageName) {
    App.showPage(pageName);
}

// Global password toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

// Handle URL changes for admin access
window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('admin')) {
        App.showAdminPage();
    }
});

// Handle direct admin URL access
if (window.location.pathname.includes('/admin')) {
    window.location.hash = '#admin';
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle page refresh
window.addEventListener('beforeunload', () => {
    // Save any pending data
    Cart.saveCart();
});

// Service Worker Registration (for future PWA features)
// Service Worker desabilitado por enquanto
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/sw.js')
//             .then(registration => {
//                 console.log('SW registered: ', registration);
//             })
//             .catch(registrationError => {
//                 console.log('SW registration failed: ', registrationError);
//             });
//     });
// }

// Handle online/offline status
window.addEventListener('online', () => {
    Utils.showMessage('Conexão restaurada!');
});

window.addEventListener('offline', () => {
    Utils.showMessage('Você está offline. Algumas funcionalidades podem não funcionar.', 'error');
});

// Prevent form submission on Enter key in certain inputs
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.type === 'number') {
        e.preventDefault();
    }
});

// Auto-format phone numbers
document.addEventListener('input', (e) => {
    if (e.target.type === 'tel') {
        e.target.value = Utils.formatPhone(e.target.value);
    }
});

// Handle escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal[style*="flex"]');
        if (modal) {
            modal.style.display = 'none';
        }
    }
});

// Click outside modal to close
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});