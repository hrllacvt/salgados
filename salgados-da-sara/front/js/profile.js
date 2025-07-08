const Profile = {
    currentSection: 'info',

    init: () => {
        Profile.loadProfile();
        Profile.setupForms();
    },

    loadProfile: () => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        document.getElementById('profile-name').value = currentUser.name || '';
        document.getElementById('profile-phone').value = currentUser.phone || '';
        document.getElementById('profile-email').value = currentUser.email || '';
        document.getElementById('profile-address').value = currentUser.address || '';
        document.getElementById('profile-number').value = currentUser.number || '';
        document.getElementById('profile-complement').value = currentUser.complement || '';
        document.getElementById('profile-city').value = currentUser.city || '';

        Profile.loadAddresses();
    },

    loadAddresses: () => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const addressesListEl = document.getElementById('addresses-list');
        if (!addressesListEl) return;

        const addresses = Utils.storage.get(`addresses_${currentUser.id}`) || [];

        if (addresses.length === 0) {
            addressesListEl.innerHTML = `
                <div class="addresses-empty">
                    <p>Você ainda não tem endereços adicionais cadastrados.</p>
                </div>
            `;
            return;
        }

        addressesListEl.innerHTML = addresses.map(address => `
            <div class="address-item">
                <div class="address-info">
                    <h4>${address.name}</h4>
                    <div class="address-details">
                        ${address.address}, ${address.number}${address.complement ? `, ${address.complement}` : ''}
                        <br>
                        ${address.city}
                    </div>
                </div>
                <div class="address-actions">
                    <button class="btn btn-secondary" onclick="Profile.editAddress('${address.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="Profile.deleteAddress('${address.id}')">Excluir</button>
                </div>
            </div>
        `).join('');
    },

    setupForms: () => {
        const profileInfoForm = document.getElementById('profile-info-form');
        if (profileInfoForm) {
            profileInfoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Profile.updateUserInfo();
            });
        }

        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Profile.changePassword();
            });
        }

        const addAddressForm = document.getElementById('add-address-form');
        if (addAddressForm) {
            addAddressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Profile.saveNewAddress();
            });
        }
    },

    updateUserInfo: () => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const formData = new FormData(document.getElementById('profile-info-form'));
        
        const requiredFields = ['name', 'phone', 'email', 'address', 'number', 'city'];
        for (const field of requiredFields) {
            if (!formData.get(field) || formData.get(field).trim() === '') {
                const fieldNames = {
                    name: 'Nome completo',
                    phone: 'Telefone',
                    email: 'Email',
                    address: 'Endereço',
                    number: 'Número',
                    city: 'Cidade'
                };
                Utils.showMessage(`${fieldNames[field]} é obrigatório`, 'error');
                return;
            }
        }

        const email = formData.get('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Utils.showMessage('Email inválido', 'error');
            return;
        }

        const users = Utils.storage.get('users') || [];
        const emailExists = users.find(user => user.email === email && user.id !== currentUser.id);
        if (emailExists) {
            Utils.showMessage('Este email já está sendo usado por outro usuário', 'error');
            return;
        }

        const updatedUser = {
            ...currentUser,
            name: formData.get('name').trim(),
            phone: Utils.formatPhone(formData.get('phone')),
            email: email.trim(),
            address: formData.get('address').trim(),
            number: formData.get('number').trim(),
            complement: formData.get('complement') ? formData.get('complement').trim() : '',
            city: formData.get('city')
        };

        const userIndex = users.findIndex(user => user.id === currentUser.id);
        if (userIndex >= 0) {
            users[userIndex] = updatedUser;
            Utils.storage.set('users', users);
            Utils.storage.set('currentUser', updatedUser);
            
            Utils.showMessage('Informações atualizadas com sucesso!');
        }
    },

    changePassword: () => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const formData = new FormData(document.getElementById('change-password-form'));
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmNewPassword = formData.get('confirmNewPassword');

        if (currentPassword !== currentUser.password) {
            Utils.showMessage('Senha atual incorreta', 'error');
            return;
        }

        const passwordErrors = Auth.validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            Utils.showMessage(passwordErrors.join('. '), 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Utils.showMessage('As senhas não coincidem', 'error');
            return;
        }

        const users = Utils.storage.get('users') || [];
        const userIndex = users.findIndex(user => user.id === currentUser.id);
        if (userIndex >= 0) {
            users[userIndex].password = newPassword;
            currentUser.password = newPassword;
            
            Utils.storage.set('users', users);
            Utils.storage.set('currentUser', currentUser);
            
            Utils.showMessage('Senha alterada com sucesso!');
            
            document.getElementById('change-password-form').reset();
        }
    },

    saveNewAddress: () => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const formData = new FormData(document.getElementById('add-address-form'));
        
        const requiredFields = ['name', 'address', 'number', 'city'];
        for (const field of requiredFields) {
            if (!formData.get(field) || formData.get(field).trim() === '') {
                const fieldNames = {
                    name: 'Nome do endereço',
                    address: 'Endereço',
                    number: 'Número',
                    city: 'Cidade'
                };
                Utils.showMessage(`${fieldNames[field]} é obrigatório`, 'error');
                return;
            }
        }

        const newAddress = {
            id: Utils.generateId(),
            name: formData.get('name').trim(),
            address: formData.get('address').trim(),
            number: formData.get('number').trim(),
            complement: formData.get('complement') ? formData.get('complement').trim() : '',
            city: formData.get('city'),
            createdAt: new Date().toISOString()
        };

        const addresses = Utils.storage.get(`addresses_${currentUser.id}`) || [];
        addresses.push(newAddress);
        Utils.storage.set(`addresses_${currentUser.id}`, addresses);

        Profile.loadAddresses();
        
        closeAddressModal();
        Utils.showMessage('Endereço adicionado com sucesso!');
    },

    editAddress: (addressId) => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const addresses = Utils.storage.get(`addresses_${currentUser.id}`) || [];
        const address = addresses.find(addr => addr.id === addressId);
        
        if (!address) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Endereço</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="edit-address-form">
                        <div class="form-group">
                            <label for="edit-address-name">Nome do Endereço</label>
                            <input type="text" id="edit-address-name" name="name" value="${address.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-address-street">Endereço</label>
                            <input type="text" id="edit-address-street" name="address" value="${address.address}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-address-number">Número</label>
                            <input type="text" id="edit-address-number" name="number" value="${address.number}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-address-complement">Complemento</label>
                            <input type="text" id="edit-address-complement" name="complement" value="${address.complement || ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit-address-city">Cidade</label>
                            <select id="edit-address-city" name="city" required>
                                <option value="">Selecione uma cidade</option>
                                <option value="Quinze de Novembro" ${address.city === 'Quinze de Novembro' ? 'selected' : ''}>Quinze de Novembro</option>
                                <option value="Selbach" ${address.city === 'Selbach' ? 'selected' : ''}>Selbach</option>
                                <option value="Colorado" ${address.city === 'Colorado' ? 'selected' : ''}>Colorado</option>
                                <option value="Alto Alegre" ${address.city === 'Alto Alegre' ? 'selected' : ''}>Alto Alegre</option>
                                <option value="Fortaleza dos Valos" ${address.city === 'Fortaleza dos Valos' ? 'selected' : ''}>Fortaleza dos Valos</option>
                                <option value="Tapera" ${address.city === 'Tapera' ? 'selected' : ''}>Tapera</option>
                                <option value="Lagoa dos Três Cantos" ${address.city === 'Lagoa dos Três Cantos' ? 'selected' : ''}>Lagoa dos Três Cantos</option>
                                <option value="Saldanha Marinho" ${address.city === 'Saldanha Marinho' ? 'selected' : ''}>Saldanha Marinho</option>
                                <option value="Espumoso" ${address.city === 'Espumoso' ? 'selected' : ''}>Espumoso</option>
                                <option value="Campos Borges" ${address.city === 'Campos Borges' ? 'selected' : ''}>Campos Borges</option>
                                <option value="Santa Bárbara do Sul" ${address.city === 'Santa Bárbara do Sul' ? 'selected' : ''}>Santa Bárbara do Sul</option>
                                <option value="Não-Me-Toque" ${address.city === 'Não-Me-Toque' ? 'selected' : ''}>Não-Me-Toque</option>
                                <option value="Boa Vista do Cadeado" ${address.city === 'Boa Vista do Cadeado' ? 'selected' : ''}>Boa Vista do Cadeado</option>
                                <option value="Boa Vista do Incra" ${address.city === 'Boa Vista do Incra' ? 'selected' : ''}>Boa Vista do Incra</option>
                                <option value="Carazinho" ${address.city === 'Carazinho' ? 'selected' : ''}>Carazinho</option>
                                <option value="Ibirubá" ${address.city === 'Ibirubá' ? 'selected' : ''}>Ibirubá</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="Profile.updateAddress('${addressId}', this.closest('.modal'))">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';
    },

    updateAddress: (addressId, modal) => {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const formData = new FormData(modal.querySelector('#edit-address-form'));
        
        const requiredFields = ['name', 'address', 'number', 'city'];
        for (const field of requiredFields) {
            if (!formData.get(field) || formData.get(field).trim() === '') {
                const fieldNames = {
                    name: 'Nome do endereço',
                    address: 'Endereço',
                    number: 'Número',
                    city: 'Cidade'
                };
                Utils.showMessage(`${fieldNames[field]} é obrigatório`, 'error');
                return;
            }
        }

        const addresses = Utils.storage.get(`addresses_${currentUser.id}`) || [];
        const addressIndex = addresses.findIndex(addr => addr.id === addressId);
        
        if (addressIndex >= 0) {
            addresses[addressIndex] = {
                ...addresses[addressIndex],
                name: formData.get('name').trim(),
                address: formData.get('address').trim(),
                number: formData.get('number').trim(),
                complement: formData.get('complement') ? formData.get('complement').trim() : '',
                city: formData.get('city')
            };

            Utils.storage.set(`addresses_${currentUser.id}`, addresses);
            Profile.loadAddresses();
            modal.remove();
            Utils.showMessage('Endereço atualizado com sucesso!');
        }
    },

    deleteAddress: (addressId) => {
        if (!confirm('Tem certeza que deseja excluir este endereço?')) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const addresses = Utils.storage.get(`addresses_${currentUser.id}`) || [];
        const filteredAddresses = addresses.filter(addr => addr.id !== addressId);
        
        Utils.storage.set(`addresses_${currentUser.id}`, filteredAddresses);
        Profile.loadAddresses();
        Utils.showMessage('Endereço excluído com sucesso!');
    }
};

function showProfileSection(section) {
    Profile.currentSection = section;
    
    document.querySelectorAll('.profile-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.profile-section').forEach(section => {
        section.style.display = 'none';
    });
    
    document.getElementById(`profile-${section}`).style.display = 'block';
    
    if (section === 'addresses') {
        Profile.loadAddresses();
    }
}

function showAddAddressModal() {
    document.getElementById('add-address-modal').style.display = 'flex';
}

function closeAddressModal() {
    document.getElementById('add-address-modal').style.display = 'none';
    document.getElementById('add-address-form').reset();
}

function saveAddress() {
    Profile.saveNewAddress();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('perfil-page')) {
        Profile.init();
    }
});