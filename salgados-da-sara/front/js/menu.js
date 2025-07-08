const Menu = {
    items: [],
    currentFilter: 'todos',
    currentItem: null,

    init: () => {
        Menu.loadMenuItems();
        Menu.setupQuantityModal();
    },

    loadMenuItems: async () => {
        if (typeof ApiClient === 'undefined') {
            console.error('ApiClient não está disponível');
            Menu.renderMenuItems(); 
            return;
        }
        
        try {
            const response = await ApiClient.get(API_CONFIG.endpoints.products);
            
            if (response.sucesso) {
                Menu.items = response.dados;
                Menu.renderMenuItems();
            } else {
                console.error('Erro ao carregar produtos:', response.mensagem);
                Menu.renderMenuItems(); 
            }
        } catch (error) {
            console.error('Erro ao carregar menu:', error);
            Utils.showMessage('Erro ao carregar cardápio. Tente novamente.', 'error');
            Menu.renderMenuItems(); 
        }
    },

    
    renderMenuItems: () => {
        const menuItemsEl = document.getElementById('menu-items');
        if (!menuItemsEl) return;

        const filteredItems = Menu.currentFilter === 'todos' 
            ? Menu.items 
            : Menu.items.filter(item => item.categoria === Menu.currentFilter);

        if (filteredItems.length === 0) {
            menuItemsEl.innerHTML = `
                <div class="menu-empty">
                    <h3>Nenhum item encontrado</h3>
                    <p>Não há itens nesta categoria no momento.</p>
                </div>
            `;
            return;
        }

        menuItemsEl.innerHTML = filteredItems.map(item => `
            <div class="menu-item" onclick="Menu.selectItem(${item.id})">
                <h3>${item.nome}</h3>
                <div class="price">
                    ${item.eh_porcionado ? Utils.formatCurrency(item.preco) : Utils.formatCurrency(item.preco) + ' / cento'}
                </div>
                <div class="category">${Menu.getCategoryName(item.categoria)}</div>
                ${item.descricao ? `<div class="description">${item.descricao}</div>` : ''}
            </div>
        `).join('');
    },

    getCategoryName: (category) => {
        const names = {
            'salgados': 'Salgados Fritos',
            'sortidos': 'Sortidos',
            'assados': 'Assados',
            'especiais': 'Especiais',
            'opcionais': 'Opcionais'
        };
        return names[category] || category;
    },

    filterMenu: (category) => {
        Menu.currentFilter = category;
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        Menu.renderMenuItems();
    },

    selectItem: (itemId) => {
        if (!Auth.isLoggedIn()) {
            App.showAuthPages();
            Utils.showMessage('Você precisa fazer login para adicionar itens ao carrinho!', 'error');
            return;
        }

        Menu.currentItem = Menu.items.find(item => item.id === itemId);
        
        if (Menu.currentItem) {
            if (Menu.currentItem.eh_porcionado) {
                Cart.addItem({
                    ...Menu.currentItem,
                    quantityType: 'porção',
                    unitCount: 1,
                    totalPrice: Menu.currentItem.preco
                });
                Utils.showMessage(`${Menu.currentItem.nome} adicionado ao carrinho!`);
            } else {
                Menu.showQuantityModal();
            }
        }
    },

    showQuantityModal: () => {
        if (!Menu.currentItem) return;

        const modal = document.getElementById('quantity-modal');
        const itemName = document.getElementById('modal-item-name');
        const priceCento = document.getElementById('price-cento');
        const priceMeioCento = document.getElementById('price-meio-cento');
        const priceUnidade = document.getElementById('price-unidade');
        const unitQuantity = document.getElementById('unit-quantity');
        const unitCount = document.getElementById('unit-count');

        itemName.textContent = Menu.currentItem.nome;

        priceCento.textContent = Utils.formatCurrency(Menu.currentItem.preco);
        priceMeioCento.textContent = Utils.formatCurrency(Menu.currentItem.preco / 2);
        priceUnidade.textContent = Utils.formatCurrency(Menu.currentItem.preco / 100);

        document.querySelector('input[name="quantity-type"][value="cento"]').checked = true;
        unitCount.value = 10;
        unitQuantity.style.display = 'none';

        modal.style.display = 'flex';
    },

    setupQuantityModal: () => {
        document.querySelectorAll('input[name="quantity-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const unitQuantity = document.getElementById('unit-quantity');
                if (e.target.value === 'unidade') {
                    unitQuantity.style.display = 'block';
                } else {
                    unitQuantity.style.display = 'none';
                }
            });
        });

        document.getElementById('unit-count').addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            if (count < 10) {
                e.target.value = 10;
            }
        });
    }
};

function filterMenu(category) {
    Menu.currentFilter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = Array.from(document.querySelectorAll('.category-btn')).find(btn => 
        btn.textContent.toLowerCase().includes(category) || 
        (category === 'todos' && btn.textContent === 'TODOS')
    );
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    Menu.renderMenuItems();
}

function closeModal() {
    document.getElementById('quantity-modal').style.display = 'none';
    Menu.currentItem = null;
}

function addToCart() {
    if (!Menu.currentItem) return;

    const quantityType = document.querySelector('input[name="quantity-type"]:checked').value;
    const unitCount = parseInt(document.getElementById('unit-count').value) || 10;

    const cartItem = {
        ...Menu.currentItem,
        quantityType: quantityType,
        unitCount: quantityType === 'unidade' ? unitCount : 1,
        totalPrice: Utils.calculateItemPrice(Menu.currentItem.preco, quantityType, unitCount)
    };

    Cart.addItem(cartItem);
    closeModal();
    
    const quantityLabel = Utils.getQuantityLabel(quantityType, unitCount);
    Utils.showMessage(`${Menu.currentItem.nome} (${quantityLabel}) adicionado ao carrinho!`);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('menu-items')) {
        Menu.init();
    }
});