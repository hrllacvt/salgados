const Cart = {
    items: [],
    deliveryFee: 10.00,
    selectedAddress: null,

    init: () => {
        Cart.loadCart();
        Cart.updateCartCount();
        Cart.setupDeliveryOptions();
        Cart.loadDeliveryFee();
    },

    loadDeliveryFee: async () => {
        if (typeof ApiClient === 'undefined') {
            console.error('ApiClient não está disponível');
            return;
        }
        
        try {
            const response = await ApiClient.get(`${API_CONFIG.endpoints.config}?key=taxa_entrega`);
            if (response.sucesso && response.dados.taxa_entrega) {
                Cart.deliveryFee = parseFloat(response.dados.taxa_entrega);
            }
        } catch (error) {
            console.error('Erro ao carregar taxa de entrega:', error);
        }
    },

    loadCart: () => {
        Cart.items = Utils.storage.get('cart') || [];
        Cart.renderCart();
        Cart.updateCartCount();
        Cart.updateCartSummary();
    },

    saveCart: () => {
        Utils.storage.set('cart', Cart.items);
        Cart.updateCartCount();
    },

    addItem: (item) => {
        const existingItemIndex = Cart.items.findIndex(cartItem => 
            cartItem.id === item.id && 
            cartItem.quantityType === item.quantityType &&
            cartItem.unitCount === item.unitCount
        );

        if (existingItemIndex >= 0) {
            Cart.items[existingItemIndex].quantity = (Cart.items[existingItemIndex].quantity || 1) + 1;
            Cart.items[existingItemIndex].totalPrice = Cart.items[existingItemIndex].totalPrice + item.totalPrice;
        } else {
            Cart.items.push({
                ...item,
                cartId: Utils.generateId(),
                quantity: 1,
                addedAt: new Date().toISOString()
            });
        }

        Cart.saveCart();
        Cart.renderCart();
        Cart.updateCartSummary();
    },

    removeItem: (cartId) => {
        Cart.items = Cart.items.filter(item => item.cartId !== cartId);
        Cart.saveCart();
        Cart.renderCart();
        Cart.updateCartSummary();
        Utils.showMessage('Item removido do carrinho!');
    },

    updateQuantity: (cartId, change) => {
        const item = Cart.items.find(item => item.cartId === cartId);
        if (!item) return;

        const newQuantity = (item.quantity || 1) + change;
        
        if (newQuantity <= 0) {
            Cart.removeItem(cartId);
            return;
        }

        const basePrice = item.totalPrice / (item.quantity || 1);
        
        item.quantity = newQuantity;
        item.totalPrice = basePrice * newQuantity;

        Cart.saveCart();
        Cart.renderCart();
        Cart.updateCartSummary();
    },

    updateCartCount: () => {
        const cartCountEl = document.getElementById('cart-count');
        if (cartCountEl) {
            const totalItems = Cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCountEl.textContent = totalItems;
            cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    },

    renderCart: () => {
        const cartItemsEl = document.getElementById('cart-items');
        if (!cartItemsEl) return;

        if (Cart.items.length === 0) {
            cartItemsEl.innerHTML = `
                <div class="cart-empty">
                    <h3>Seu carrinho está vazio</h3>
                    <p>Adicione alguns itens deliciosos do nosso cardápio!</p>
                    <button class="btn btn-primary" onclick="showPage('cardapio')">Ver Cardápio</button>
                </div>
            `;
            return;
        }

        cartItemsEl.innerHTML = Cart.items.map(item => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div class="cart-item-info">
                        <h3>${item.nome}</h3>
                        <div class="quantity-type">
                            ${Utils.getQuantityLabel(item.quantityType, item.unitCount)}
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="Cart.updateQuantity('${item.cartId}', -1)">-</button>
                            <span class="quantity-display">${item.quantity || 1}</span>
                            <button class="quantity-btn" onclick="Cart.updateQuantity('${item.cartId}', 1)">+</button>
                        </div>
                        <button class="remove-btn" onclick="Cart.removeItem('${item.cartId}')">Remover</button>
                    </div>
                </div>
                <div class="cart-item-details">
                    <div class="unit-price">
                        ${Utils.formatCurrency(item.totalPrice / (item.quantity || 1))} cada
                    </div>
                    <div class="total-price">
                        ${Utils.formatCurrency(item.totalPrice)}
                    </div>
                </div>
            </div>
        `).join('');
    },

    setupDeliveryOptions: () => {
        const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
        deliveryOptions.forEach(option => {
            option.addEventListener('change', () => {
                Cart.updateCartSummary();
                Cart.toggleAddressSelection();
            });
        });
    },

    toggleAddressSelection: () => {
        const isDelivery = document.querySelector('input[name="delivery"]:checked')?.value === 'delivery';
        const addressSelection = document.getElementById('delivery-address-selection');
        
        if (addressSelection) {
            if (isDelivery) {
                addressSelection.style.display = 'block';
                Cart.loadAddressOptions();
            } else {
                addressSelection.style.display = 'none';
                Cart.selectedAddress = null;
            }
            
            if (typeof App !== 'undefined' && App.updateNavbarForLoginStatus) {
                App.updateNavbarForLoginStatus();
            }
        }
    },

    loadAddressOptions: () => {
        const addressOptionsEl = document.getElementById('address-options');
        if (!addressOptionsEl) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            addressOptionsEl.innerHTML = `
                <div class="login-required">
                    <p>Você precisa estar logado para selecionar endereço de entrega.</p>
                    <button class="btn btn-primary" onclick="App.showAuthPages()">Fazer Login</button>
                </div>
            `;
            return;
        }

        const mainAddress = {
            id: 'main',
            name: 'Endereço Principal',
            address: currentUser.endereco,
            number: currentUser.numero,
            complement: currentUser.complemento,
            city: currentUser.cidade
        };

        const additionalAddresses = Utils.storage.get(`addresses_${currentUser.id}`) || [];
        const allAddresses = [mainAddress, ...additionalAddresses];

        addressOptionsEl.innerHTML = allAddresses.map(address => `
            <label class="radio-label address-option">
                <input type="radio" name="delivery-address" value="${address.id}" ${address.id === 'main' ? 'checked' : ''}>
                <span class="radio-custom"></span>
                <div class="address-info">
                    <strong>${address.name}</strong>
                    <div>${address.address}, ${address.number}${address.complement ? `, ${address.complement}` : ''}</div>
                    <div>${address.city}</div>
                </div>
            </label>
        `).join('');

        Cart.selectedAddress = mainAddress;

        document.querySelectorAll('input[name="delivery-address"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                Cart.selectedAddress = allAddresses.find(addr => addr.id === selectedId);
            });
        });
    },

    updateCartSummary: () => {
        const subtotalEl = document.getElementById('subtotal');
        const deliveryFeeEl = document.getElementById('delivery-fee');
        const totalEl = document.getElementById('total');
        const continueBtn = document.getElementById('continue-btn');

        if (!subtotalEl) return;

        const subtotal = Cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const isDelivery = document.querySelector('input[name="delivery"]:checked')?.value === 'delivery';
        const deliveryFee = isDelivery ? Cart.deliveryFee : 0;
        const total = subtotal + deliveryFee;

        subtotalEl.textContent = Utils.formatCurrency(subtotal);
        deliveryFeeEl.textContent = Utils.formatCurrency(deliveryFee);
        totalEl.textContent = Utils.formatCurrency(total);

        if (continueBtn) {
            continueBtn.disabled = Cart.items.length === 0;
            continueBtn.style.opacity = Cart.items.length === 0 ? '0.5' : '1';
        }
    },

    getDeliveryFee: () => {
        return Cart.deliveryFee;
    },

    clearCart: () => {
        Cart.items = [];
        Cart.saveCart();
        Cart.renderCart();
        Cart.updateCartSummary();
    },

    getOrderSummary: () => {
        const subtotal = Cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const isDelivery = document.querySelector('input[name="delivery"]:checked')?.value === 'delivery';
        const deliveryFee = isDelivery ? Cart.getDeliveryFee() : 0;
        const total = subtotal + deliveryFee;
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cash';

        return {
            items: Cart.items,
            subtotal,
            deliveryFee,
            total,
            isDelivery,
            paymentMethod,
            selectedAddress: Cart.selectedAddress,
            itemCount: Cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
        };
    }
};

function showPayment() {
    if (Cart.items.length === 0) {
        Utils.showMessage('Seu carrinho está vazio!', 'error');
        return;
    }

    if (!Auth.isLoggedIn()) {
        App.showAuthPages();
        Utils.showMessage('Você precisa fazer login para finalizar o pedido!', 'error');
        return;
    }
    
    showPage('payment');
}

async function finalizeOrder() {
    if (Cart.items.length === 0) {
        Utils.showMessage('Seu carrinho está vazio!', 'error');
        return;
    }

    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
        Utils.showMessage('Você precisa estar logado para finalizar o pedido!', 'error');
        App.showAuthPages();
        return;
    }

    const orderSummary = Cart.getOrderSummary();
    
    let customerData = {
        name: currentUser.nome,
        phone: currentUser.telefone,
        email: currentUser.email,
        address: currentUser.endereco,
        number: currentUser.numero,
        complement: currentUser.complemento || '',
        city: currentUser.cidade
    };
    
    if (orderSummary.isDelivery && orderSummary.selectedAddress && orderSummary.selectedAddress.id !== 'main') {
        customerData = {
            ...customerData,
            address: orderSummary.selectedAddress.address,
            number: orderSummary.selectedAddress.number,
            complement: orderSummary.selectedAddress.complement || '',
            city: orderSummary.selectedAddress.city
        };
    }
    
    const orderData = {
        user_id: currentUser.id,
        items: orderSummary.items.map(item => ({
            id: item.id,
            quantity: item.quantity || 1,
            quantityType: item.quantityType,
            unitCount: item.unitCount,
            totalPrice: item.totalPrice
        })),
        total: orderSummary.total,
        payment_method: orderSummary.paymentMethod === 'cash' ? 'dinheiro' : 
                       orderSummary.paymentMethod === 'card' ? 'cartao' : 'pix',
        is_delivery: orderSummary.isDelivery,
        customer_data: customerData,
        notes: ''
    };

    try {
        Utils.showMessage('Finalizando pedido...', 'info');
        
        const response = await ApiClient.post(API_CONFIG.endpoints.createOrder, orderData);
        
        if (response.sucesso) {
            Cart.clearCart();
            
            Utils.showMessage(`Pedido ${response.numero_pedido} realizado com sucesso!`);
            
            setTimeout(() => {
                showPage('historico');
            }, 2000);
        } else {
            Utils.showMessage(response.mensagem || 'Erro ao finalizar pedido', 'error');
        }
    } catch (error) {
        console.error('Erro ao finalizar pedido:', error);
        Utils.showMessage('Erro ao finalizar pedido. Tente novamente.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    Cart.init();
});