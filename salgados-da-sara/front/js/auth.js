const Auth = {
  
    init: () => {
        
    },

    validatePassword: (password) => {
        const errors = [];
        
        if (password.length < 6) {
            errors.push('A senha deve ter pelo menos 6 caracteres');
        }
        
        if (password.length > 15) {
            errors.push('A senha deve ter no máximo 15 caracteres');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('A senha deve conter pelo menos 1 letra maiúscula');
        }
        
        if (!/[0-9]/.test(password)) {
            errors.push('A senha deve conter pelo menos 1 número');
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('A senha deve conter pelo menos 1 caractere especial');
        }
        
        return errors;
    },

    login: async (phone, password) => {
        if (typeof ApiClient === 'undefined') {
            return { success: false, message: 'Sistema não está disponível no momento' };
        }
        
        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.login, {
                phone: Utils.cleanPhone(phone),
                password: password
            });
            
            if (response.sucesso) {
                Utils.storage.set('currentUser', response.usuario);
                return { success: true, user: response.usuario };
            } else {
                return { success: false, message: response.mensagem };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Erro ao fazer login' };
        }
    },

    register: async (userData) => {
        if (typeof ApiClient === 'undefined') {
            return { success: false, message: 'Sistema não está disponível no momento' };
        }
        
        const passwordErrors = Auth.validatePassword(userData.password);
        if (passwordErrors.length > 0) {
            return { success: false, message: passwordErrors.join('. ') };
        }

        if (userData.password !== userData.confirmPassword) {
            return { success: false, message: 'As senhas não coincidem' };
        }

        const requiredFields = ['name', 'phone', 'email', 'address', 'number', 'city', 'password'];
        for (const field of requiredFields) {
            if (!userData[field] || userData[field].trim() === '') {
                const fieldNames = {
                    name: 'Nome completo',
                    phone: 'Telefone',
                    email: 'Email',
                    address: 'Endereço',
                    number: 'Número',
                    city: 'Cidade',
                    password: 'Senha'
                };
                return { success: false, message: `${fieldNames[field]} é obrigatório` };
            }
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            return { success: false, message: 'Email inválido' };
        }

        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.register, {
                name: userData.name.trim(),
                phone: Utils.cleanPhone(userData.phone),
                email: userData.email.trim(),
                address: userData.address.trim(),
                number: userData.number.trim(),
                complement: userData.complement ? userData.complement.trim() : '',
                neighborhood: userData.neighborhood || '',
                cep: userData.cep || '',
                city: userData.city,
                password: userData.password,
                confirmPassword: userData.confirmPassword
            });

            if (response.sucesso) {
                Utils.storage.set('currentUser', response.usuario);
                return { success: true, user: response.usuario };
            } else {
                if (response.erros) {
                    const errorMessages = Object.values(response.erros);
                    return { success: false, message: errorMessages.join('. ') };
                }
                return { success: false, message: response.mensagem };
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            return { success: false, message: 'Erro ao criar conta. Verifique sua conexão e tente novamente.' };
        }
    },

    forgotPassword: async (phone) => {
        if (typeof ApiClient === 'undefined') {
            return { success: false, message: 'Sistema não está disponível no momento' };
        }
        
        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.forgotPassword, {
                phone: Utils.cleanPhone(phone)
            });
            
            if (response.sucesso) {
                return { success: true, message: response.mensagem };
            } else {
                return { success: false, message: response.mensagem };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Erro ao recuperar senha' };
        }
    },

    adminLogin: async (username, password) => {
        if (typeof ApiClient === 'undefined') {
            return { success: false, message: 'Sistema não está disponível no momento' };
        }
        
        try {
            const response = await ApiClient.post(API_CONFIG.endpoints.adminLogin, {
                username: username,
                password: password
            });
            
            if (response.sucesso) {
                Utils.storage.set('currentAdmin', response.admin);
                return { success: true, admin: response.admin };
            } else {
                return { success: false, message: response.mensagem };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Erro ao fazer login' };
        }
    },

    logout: () => {
        Utils.storage.remove('currentUser');
        Utils.storage.remove('currentAdmin');
        if (typeof App !== 'undefined' && App.updateNavbarForLoginStatus) {
            App.updateNavbarForLoginStatus();
        }
    },

    isLoggedIn: () => {
        return Utils.storage.get('currentUser') !== null;
    },

    isAdminLoggedIn: () => {
        return Utils.storage.get('currentAdmin') !== null;
    },

    getCurrentUser: () => {
        return Utils.storage.get('currentUser');
    },

    getCurrentAdmin: () => {
        return Utils.storage.get('currentAdmin');
    },

    hasAdminPermission: (permission) => {
        const admin = Auth.getCurrentAdmin();
        if (!admin) return false;
        
        if (admin.funcao === 'super_admin') return true; // Super admin tem acesso total
        
        if (admin.funcao === 'admin') {
            return permission === 'pedidos';
        }
        
        return false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const phone = formData.get('phone');
            const password = formData.get('password');

            Utils.showMessage('Fazendo login...', 'info');
            
            const result = await Auth.login(phone, password);
            
            if (result.success) {
                Utils.showMessage('Login realizado com sucesso!');
                setTimeout(() => {
                    App.showMainApp();
                    App.updateNavbarForLoginStatus();
                }, 1500);
            } else {
                Utils.showMessage(result.message, 'error');
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const userData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address'),
                number: formData.get('number'),
                complement: formData.get('complement'),
                neighborhood: formData.get('neighborhood'),
                cep: formData.get('cep'),
                city: formData.get('city'),
                password: formData.get('password'),
                confirmPassword: formData.get('confirmPassword')
            };

            Utils.showMessage('Criando conta...', 'info');
            
            const result = await Auth.register(userData);
            
            if (result.success) {
                Utils.showMessage('Conta criada com sucesso!');
                setTimeout(() => {
                    App.showMainApp();
                    App.updateNavbarForLoginStatus();
                }, 1500);
            } else {
                Utils.showMessage(result.message, 'error');
            }
        });
    }

    const forgotForm = document.getElementById('forgot-password-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(forgotForm);
            const phone = formData.get('phone');

            Utils.showMessage('Enviando instruções...', 'info');
            
            const result = await Auth.forgotPassword(phone);
            
            if (result.success) {
                Utils.showMessage(result.message);
            } else {
                Utils.showMessage(result.message, 'error');
            }
        });
    }

    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(adminLoginForm);
            const username = formData.get('username');
            const password = formData.get('password');

            Utils.showMessage('Fazendo login...', 'info');
            
            const result = await Auth.adminLogin(username, password);
            
            if (result.success) {
                Utils.showMessage('Login realizado com sucesso!');
                document.getElementById('admin-login').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'flex';
                Admin.init();
            } else {
                Utils.showMessage(result.message, 'error');
            }
        });
    }
});

function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-password-page').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'flex';
    document.getElementById('forgot-password-page').style.display = 'none';
}

function showForgotPassword() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-password-page').style.display = 'flex';
}

function logout() {
    Auth.logout();
    Utils.showMessage('Logout realizado com sucesso!');
    setTimeout(() => {
        App.showMainApp();
        showPage('cardapio');
    }, 1000);
}

function adminLogout() {
    Auth.logout();
    Utils.showMessage('Logout realizado com sucesso!');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

Auth.init();