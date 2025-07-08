const Admin = {
    currentSection: 'pedidos',

    init: () => {
        Admin.checkPermissions();
        Admin.loadOrders();
        Admin.loadProducts();
        Admin.loadAdmins();
        Admin.loadConfig();
    },

    checkPermissions: () => {
        const admin = Auth.getCurrentAdmin();
        if (!admin) return;

        if (admin.funcao === 'admin') {
            const restrictedSections = ['produtos', 'administradores', 'configuracoes'];
            restrictedSections.forEach(section => {
                const btn = document.querySelector(`.admin-btn[onclick*="${section}"]`);
                if (btn) {
                    btn.style.display = 'none';
                }
                const sectionEl = document.getElementById(`admin-${section}`);
                if (sectionEl) {
                    sectionEl.style.display = 'none';
                }
            });
        }
    },

    loadOrders: async () => {
        if (typeof ApiClient === 'undefined') {
            console.error('ApiClient não está disponível');
            return;
        }
        
        const ordersContainer = document.getElementById('admin-orders');
        if (!ordersContainer) return;

        try {
            const response = await ApiClient.get(API_CONFIG.endpoints.orders);
            
            if (response.sucesso) {
                const orders = response.dados;
                const sortedOrders = orders.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

                if (sortedOrders.length === 0) {
                    ordersContainer.innerHTML = `
                        <div class="text-center">
                            <h4>Nenhum pedido encontrado</h4>
                            <p>Os pedidos aparecerão aqui quando forem realizados.</p>
                        </div>
                    `;
                    return;
                }

                ordersContainer.innerHTML = sortedOrders.map(order => `
                    <div class="admin-order ${order.status}">
                        <div class="order-header">
                            <div class="order-id">${order.numero_pedido}</div>
                            <div class="order-status ${order.status}">
                                ${Admin.getStatusLabel(order.status)}
                            </div>
                        </div>
                        
                        <div class="order-details">
                            <div class="order-customer">
                                <div class="customer-info">
                                    <strong>Cliente:</strong>
                                    ${order.dados_cliente.name}
                                </div>
                                <div class="customer-info">
                                    <strong>Telefone:</strong>
                                    ${order.dados_cliente.phone}
                                </div>
                                <div class="customer-info">
                                    <strong>Entrega:</strong>
                                    ${order.eh_entrega ? 'Delivery' : 'Retirada'}
                                </div>
                                <div class="customer-info">
                                    <strong>Pagamento:</strong>
                                    ${Admin.getPaymentLabel(order.metodo_pagamento)}
                                </div>
                                <div class="customer-info">
                                    <strong>Data:</strong>
                                    ${Utils.formatDate(order.criado_em)}
                                </div>
                                <div class="customer-info">
                                    <strong>Total:</strong>
                                    ${Utils.formatCurrency(order.total)}
                                </div>
                            </div>
                            
                            <div class="order-items">
                                <strong>Itens:</strong>
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
                        </div>
                        
                        <div class="order-actions">
                            ${order.status === 'pendente' ? `
                                <button class="btn btn-success" onclick="Admin.updateOrderStatus('${order.id}', 'confirmado')">
                                    Confirmar
                                </button>
                                <button class="btn btn-danger" onclick="Admin.showRejectModal('${order.id}')">
                                    Recusar
                                </button>
                            ` : ''}
                            
                            ${order.status === 'confirmado' ? `
                                <button class="btn btn-primary" onclick="Admin.updateOrderStatus('${order.id}', 'pronto')">
                                    Pronto
                                </button>
                            ` : ''}
                            
                            ${order.status === 'pronto' ? `
                                <button class="btn btn-success" onclick="Admin.updateOrderStatus('${order.id}', 'entregue')">
                                    Entregue
                                </button>
                            ` : ''}
                            
                            ${order.status === 'rejeitado' && order.motivo_rejeicao ? `
                                <div class="rejection-reason">
                                    <strong>Motivo da recusa:</strong> ${order.motivo_rejeicao}
                                </div>
                            ` : ''}
                            
                            ${Auth.hasAdminPermission('pedidos') ? `
                                <button class="btn btn-danger" onclick="Admin.deleteOrder('${order.id}')">
                                    Excluir
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                ordersContainer.innerHTML = `
                    <div class="text-center">
                        <h4>Erro ao carregar pedidos</h4>
                        <p>${response.mensagem}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            ordersContainer.innerHTML = `
                <div class="text-center">
                    <h4>Erro ao carregar pedidos</h4>
                    <p>Verifique sua conexão e tente novamente.</p>
                </div>
            `;
        }
    },

    deleteOrder: async (orderId) => {
        if (!Auth.hasAdminPermission('pedidos')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        if (confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
            try {
                const response = await ApiClient.delete(API_CONFIG.endpoints.deleteOrder, {
                    id: orderId
                });
                
                if (response.sucesso) {
                    Admin.loadOrders();
                    Utils.showMessage('Pedido excluído com sucesso!');
                } else {
                    Utils.showMessage(response.mensagem || 'Erro ao excluir pedido', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir pedido:', error);
                Utils.showMessage('Erro ao excluir pedido. Tente novamente.', 'error');
            }
        }
    },

    getStatusLabel: (status) => {
        const labels = {
            'pendente': 'Aguardando Confirmação',
            'confirmado': 'Em Preparação',
            'pronto': 'Pronto',
            'entregue': 'Entregue',
            'rejeitado': 'Recusado'
        };
        return labels[status] || status;
    },

    getPaymentLabel: (method) => {
        const labels = {
            'dinheiro': 'Dinheiro',
            'cartao': 'Cartão',
            'pix': 'PIX'
        };
        return labels[method] || method;
    },

    updateOrderStatus: async (orderId, newStatus) => {
        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.updateOrderStatus, {
                id: orderId,
                status: newStatus
            });
            
            if (response.sucesso) {
                Admin.loadOrders();
                Utils.showMessage(`Pedido atualizado para: ${Admin.getStatusLabel(newStatus)}`);
            } else {
                Utils.showMessage(response.mensagem || 'Erro ao atualizar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar pedido:', error);
            Utils.showMessage('Erro ao atualizar pedido. Tente novamente.', 'error');
        }
    },

    showRejectModal: (orderId) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Recusar Pedido</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="rejection-reason">Motivo da recusa:</label>
                        <textarea id="rejection-reason" rows="4" placeholder="Explique o motivo da recusa do pedido..." required></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-danger" onclick="Admin.rejectOrder('${orderId}', document.getElementById('rejection-reason').value, this.closest('.modal'))">Recusar Pedido</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    },

    rejectOrder: async (orderId, reason, modal) => {
        if (!reason || reason.trim() === '') {
            Utils.showMessage('Por favor, informe o motivo da recusa!', 'error');
            return;
        }

        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.updateOrderStatus, {
                id: orderId,
                status: 'rejeitado',
                rejection_reason: reason.trim()
            });
            
            if (response.sucesso) {
                Admin.loadOrders();
                Utils.showMessage('Pedido foi recusado.');
                modal.remove();
            } else {
                Utils.showMessage(response.mensagem || 'Erro ao recusar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao recusar pedido:', error);
            Utils.showMessage('Erro ao recusar pedido. Tente novamente.', 'error');
        }
    },

    loadProducts: async () => {
        if (!Auth.hasAdminPermission('produtos')) return;
        
        if (typeof ApiClient === 'undefined') {
            console.error('ApiClient não está disponível');
            return;
        }
        
        const productsContainer = document.getElementById('admin-products');
        if (!productsContainer) return;

        try {
            const response = await ApiClient.get(API_CONFIG.endpoints.products);
            
            if (response.sucesso) {
                const products = response.dados;

                productsContainer.innerHTML = products.map(item => `
                    <div class="admin-product">
                        <div class="product-info">
                            <h4>${item.nome}</h4>
                            <div class="product-price">
                                ${item.eh_porcionado ? Utils.formatCurrency(item.preco) : Utils.formatCurrency(item.preco) + ' / cento'}
                            </div>
                            <div class="product-category">${Menu.getCategoryName(item.categoria)}</div>
                            ${item.descricao ? `<p>${item.descricao}</p>` : ''}
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-secondary" onclick="Admin.editProduct(${item.id})">Editar</button>
                            ${item.eh_personalizado ? `
                                <button class="btn btn-danger" onclick="Admin.deleteProduct(${item.id})">Excluir</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    },

    showAddProduct: () => {
        if (!Auth.hasAdminPermission('produtos')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content admin-modal">
                <div class="modal-header">
                    <h3>Adicionar Produto</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="add-product-form">
                    <div class="form-group">
                        <label for="product-name">Nome do Produto</label>
                        <input type="text" id="product-name" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="product-flavor">Sabor (opcional)</label>
                        <input type="text" id="product-flavor" name="flavor">
                    </div>
                    <div class="form-group">
                        <label for="product-price">Preço (R$)</label>
                        <input type="number" id="product-price" name="price" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="product-category">Categoria</label>
                        <select id="product-category" name="category" required>
                            <option value="salgados">Salgados Fritos</option>
                            <option value="sortidos">Sortidos</option>
                            <option value="assados">Assados</option>
                            <option value="especiais">Especiais</option>
                            <option value="opcionais">Opcionais</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_portioned"> Item vendido por porção
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Adicionar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        modal.querySelector('#add-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const newProduct = {
                name: formData.get('name'),
                flavor: formData.get('flavor') || '',
                price: parseFloat(formData.get('price')),
                category: formData.get('category'),
                is_portioned: formData.has('is_portioned')
            };

            try {
                const response = await ApiClient.post(API_CONFIG.endpoints.createProduct, newProduct);
                
                if (response.sucesso) {
                    Admin.loadProducts();
                    Menu.loadMenuItems();
                    Utils.showMessage('Produto adicionado com sucesso!');
                    modal.remove();
                } else {
                    Utils.showMessage(response.mensagem || 'Erro ao adicionar produto', 'error');
                }
            } catch (error) {
                console.error('Erro ao adicionar produto:', error);
                Utils.showMessage('Erro ao adicionar produto. Tente novamente.', 'error');
            }
        });
    },

    editProduct: async (productId) => {
        if (!Auth.hasAdminPermission('produtos')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        const product = Menu.items.find(item => item.id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content admin-modal">
                <div class="modal-header">
                    <h3>Editar Produto</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="edit-product-form">
                    <div class="form-group">
                        <label for="edit-product-name">Nome do Produto</label>
                        <input type="text" id="edit-product-name" name="name" value="${product.nome}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-flavor">Sabor (opcional)</label>
                        <input type="text" id="edit-product-flavor" name="flavor" value="${product.sabor || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-product-price">Preço (R$)</label>
                        <input type="number" id="edit-product-price" name="price" value="${product.preco}" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-product-category">Categoria</label>
                        <select id="edit-product-category" name="category" required>
                            <option value="salgados" ${product.categoria === 'salgados' ? 'selected' : ''}>Salgados Fritos</option>
                            <option value="sortidos" ${product.categoria === 'sortidos' ? 'selected' : ''}>Sortidos</option>
                            <option value="assados" ${product.categoria === 'assados' ? 'selected' : ''}>Assados</option>
                            <option value="especiais" ${product.categoria === 'especiais' ? 'selected' : ''}>Especiais</option>
                            <option value="opcionais" ${product.categoria === 'opcionais' ? 'selected' : ''}>Opcionais</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_portioned" ${product.eh_porcionado ? 'checked' : ''}> Item vendido por porção
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        modal.querySelector('#edit-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const updatedProduct = {
                id: productId,
                name: formData.get('name'),
                flavor: formData.get('flavor') || '',
                price: parseFloat(formData.get('price')),
                category: formData.get('category'),
                is_portioned: formData.has('is_portioned')
            };

            try {
                const response = await ApiClient.post(API_CONFIG.endpoints.updateProduct, updatedProduct);
                
                if (response.sucesso) {
                    Admin.loadProducts();
                    Menu.loadMenuItems(); 
                    Utils.showMessage('Produto atualizado com sucesso!');
                    modal.remove();
                } else {
                    Utils.showMessage(response.mensagem || 'Erro ao atualizar produto', 'error');
                }
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                Utils.showMessage('Erro ao atualizar produto. Tente novamente.', 'error');
            }
        });
    },

    deleteProduct: async (productId) => {
        if (!Auth.hasAdminPermission('produtos')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                const response = await ApiClient.delete(API_CONFIG.endpoints.deleteProduct, {
                    id: productId
                });
                
                if (response.sucesso) {
                    Admin.loadProducts();
                    Menu.loadMenuItems(); 
                    Utils.showMessage('Produto excluído com sucesso!');
                } else {
                    Utils.showMessage(response.mensagem || 'Erro ao excluir produto', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                Utils.showMessage('Erro ao excluir produto. Tente novamente.', 'error');
            }
        }
    },


    loadAdmins: async () => {
        if (!Auth.hasAdminPermission('administradores')) return;
        
        if (typeof ApiClient === 'undefined') {
            console.error('ApiClient não está disponível');
            return;
        }
        
        const adminsContainer = document.getElementById('admin-admins');
        if (!adminsContainer) return;

        try {
            const response = await ApiClient.get(API_CONFIG.endpoints.admins);
            
            if (response.sucesso) {
                const admins = response.dados;

                adminsContainer.innerHTML = admins.map(admin => `
                    <div class="admin-admin">
                        <div class="admin-info">
                            <h4>${admin.nome_usuario}</h4>
                            <div class="admin-role">${admin.funcao === 'super_admin' ? 'Super Admin' : 'Admin'}</div>
                        </div>
                        <div class="admin-actions">
                            ${admin.nome_usuario !== 'sara' ? `
                                <button class="btn btn-danger" onclick="Admin.deleteAdmin('${admin.id}')">Excluir</button>
                            ` : `
                                <small>Administrador principal</small>
                            `}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar administradores:', error);
        }
    },

    showAddAdmin: () => {
        if (!Auth.hasAdminPermission('administradores')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content admin-modal">
                <div class="modal-header">
                    <h3>Adicionar Administrador</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form id="add-admin-form">
                    <div class="form-group">
                        <label for="admin-username">Nome de Usuário</label>
                        <input type="text" id="admin-username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="admin-password">Senha</label>
                        <input type="password" id="admin-password" name="password" required>
                    </div>
                    <div class="form-group">
                        <label for="admin-role">Função</label>
                        <select id="admin-role" name="role" required>
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Adicionar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        modal.querySelector('#add-admin-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const newAdmin = {
                username: formData.get('username'),
                password: formData.get('password'),
                role: formData.get('role')
            };

            try {
                const response = await ApiClient.post(API_CONFIG.endpoints.admins, newAdmin);
                
                if (response.sucesso) {
                    Admin.loadAdmins();
                    Utils.showMessage('Administrador adicionado com sucesso!');
                    modal.remove();
                } else {
                    Utils.showMessage(response.mensagem || 'Erro ao adicionar administrador', 'error');
                }
            } catch (error) {
                console.error('Erro ao adicionar administrador:', error);
                Utils.showMessage('Erro ao adicionar administrador. Tente novamente.', 'error');
            }
        });
    },

    deleteAdmin: async (adminId) => {
        if (!Auth.hasAdminPermission('administradores')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        if (confirm('Tem certeza que deseja excluir este administrador?')) {
            try {
                const response = await ApiClient.delete(API_CONFIG.endpoints.admins, {
                    id: adminId
                });
                
                if (response.sucesso) {
                    Admin.loadAdmins();
                    Utils.showMessage('Administrador excluído com sucesso!');
                } else {
                    Utils.showMessage(response.mensagem || 'Erro ao excluir administrador', 'error');
                }
            } catch (error) {
                console.error('Erro ao excluir administrador:', error);
                Utils.showMessage('Erro ao excluir administrador. Tente novamente.', 'error');
            }
        }
    },

    loadConfig: async () => {
        if (!Auth.hasAdminPermission('configuracoes')) return;
        
    
        if (typeof ApiClient === 'undefined') {
            console.error('ApiClient não está disponível');
            return;
        }
        
        const deliveryPriceInput = document.getElementById('delivery-price');
        if (!deliveryPriceInput) return;

        try {
            const response = await ApiClient.get(`${API_CONFIG.endpoints.config}?key=taxa_entrega`);
            if (response.sucesso && response.dados.taxa_entrega) {
                deliveryPriceInput.value = response.dados.taxa_entrega;
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
        }
    },

    updateDeliveryPrice: async () => {
        if (!Auth.hasAdminPermission('configuracoes')) {
            Utils.showMessage('Você não tem permissão para esta ação!', 'error');
            return;
        }
        
        const deliveryPriceInput = document.getElementById('delivery-price');
        const newPrice = parseFloat(deliveryPriceInput.value) || 0;

        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.config, {
                key: 'taxa_entrega',
                value: newPrice
            });
            
            if (response.sucesso) {
                Utils.showMessage('Valor da entrega atualizado com sucesso!');
                Cart.deliveryFee = newPrice;
            } else {
                Utils.showMessage(response.mensagem || 'Erro ao atualizar configuração', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            Utils.showMessage('Erro ao atualizar configuração. Tente novamente.', 'error');
        }
    }
};


function showAdminSection(section) {

    if (!Auth.hasAdminPermission(section)) {
        Utils.showMessage('Você não tem permissão para acessar esta seção!', 'error');
        return;
    }
    
    Admin.currentSection = section;
    

    document.querySelectorAll('.admin-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    document.getElementById(`admin-${section}`).style.display = 'block';
    
    switch (section) {
        case 'pedidos':
            Admin.loadOrders();
            break;
        case 'produtos':
            Admin.loadProducts();
            break;
        case 'administradores':
            Admin.loadAdmins();
            break;
        case 'configuracoes':
            Admin.loadConfig();
            break;
    }
}

function showAddProduct() {
    Admin.showAddProduct();
}

function showAddAdmin() {
    Admin.showAddAdmin();
}

function updateDeliveryPrice() {
    Admin.updateDeliveryPrice();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('admin-page')) {
        Admin.init();
    }
});