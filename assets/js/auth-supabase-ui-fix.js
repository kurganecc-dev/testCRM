(function () {
  function qs(selector) {
    return document.querySelector(selector);
  }

  function showLoginError(message) {
    const errorBox = qs('#loginError');
    if (!errorBox) return;
    errorBox.textContent = message || 'Ошибка входа';
    errorBox.classList.remove('hidden');
  }

  function hideLoginError() {
    const errorBox = qs('#loginError');
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  function replaceLoginForm() {
    const oldUserSelect = qs('#loginUser');
    const oldPasswordInput = qs('#loginPass');
    const oldLoginBtn = qs('#loginBtn');

    if (!oldLoginBtn) return;

    if (oldUserSelect) {
      const emailInput = document.createElement('input');
      emailInput.id = 'loginEmail';
      emailInput.type = 'email';
      emailInput.placeholder = 'Email';
      emailInput.autocomplete = 'email';
      emailInput.className = oldUserSelect.className || 'w-full rounded-xl px-4 py-3 bg-white/10 border border-white/10 outline-none';
      oldUserSelect.replaceWith(emailInput);
    }

    if (oldPasswordInput) {
      oldPasswordInput.id = 'loginPassword';
      oldPasswordInput.type = 'password';
      oldPasswordInput.placeholder = 'Пароль';
      oldPasswordInput.autocomplete = 'current-password';
    }

    const cleanLoginBtn = oldLoginBtn.cloneNode(true);
    cleanLoginBtn.textContent = 'Войти';
    oldLoginBtn.replaceWith(cleanLoginBtn);

    cleanLoginBtn.addEventListener('click', handleSupabaseLogin);

    const passwordInput = qs('#loginPassword');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') handleSupabaseLogin();
      });
    }
  }

  async function getCurrentAuthProfile() {
    const sessionResponse = await db.auth.getSession();
    const session = sessionResponse && sessionResponse.data ? sessionResponse.data.session : null;
    if (!session || !session.user) return null;

    const profileResponse = await db
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileResponse.error) return null;

    return {
      user: session.user,
      profile: profileResponse.data
    };
  }

  window.AuthService = {
    sessionKeys: {
      active: 'e_active',
      uid: 'e_uid',
      name: 'e_name',
      role: 'e_role',
      email: 'e_email'
    },

    async login(email, password) {
      const authResponse = await db.auth.signInWithPassword({ email: email, password: password });
      if (authResponse.error) return { data: null, error: authResponse.error };

      const profileResponse = await db
        .from('profiles')
        .select('*')
        .eq('id', authResponse.data.user.id)
        .single();

      if (profileResponse.error) return { data: null, error: profileResponse.error };

      return {
        data: {
          user: authResponse.data.user,
          profile: profileResponse.data
        },
        error: null
      };
    },

    saveSession(authData) {
      const user = authData.user;
      const profile = authData.profile || {};
      sessionStorage.setItem(this.sessionKeys.active, 'true');
      sessionStorage.setItem(this.sessionKeys.uid, user.id);
      sessionStorage.setItem(this.sessionKeys.email, user.email || '');
      sessionStorage.setItem(this.sessionKeys.name, profile.display_name || profile.username || user.email || 'Пользователь');
      sessionStorage.setItem(this.sessionKeys.role, profile.role || 'user');
    },

    async logout() {
      await db.auth.signOut();
      this.clearSession();
    },

    clearSession() {
      sessionStorage.clear();
    },

    isActive() {
      return sessionStorage.getItem(this.sessionKeys.active) === 'true';
    },

    getCurrentUser() {
      return {
        uid: sessionStorage.getItem(this.sessionKeys.uid),
        email: sessionStorage.getItem(this.sessionKeys.email),
        name: sessionStorage.getItem(this.sessionKeys.name),
        role: sessionStorage.getItem(this.sessionKeys.role)
      };
    }
  };

  window.handleLogin = handleSupabaseLogin;

  async function handleSupabaseLogin() {
    hideLoginError();

    const emailInput = qs('#loginEmail');
    const passwordInput = qs('#loginPassword');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      showLoginError('Введите email и пароль');
      return;
    }

    const result = await window.AuthService.login(email, password);
    if (result.error) {
      showLoginError('Неверный email или пароль');
      return;
    }

    window.AuthService.saveSession(result.data);

    if (window.state) {
      window.state.currentUser = result.data.profile.display_name || result.data.profile.username || result.data.user.email;
      window.state.currentRole = result.data.profile.role || 'user';
    }

    const loginScreen = qs('#loginScreen');
    const app = qs('#app');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    if (typeof window.loadAll === 'function') await window.loadAll();
    if (typeof window.renderAll === 'function') window.renderAll();
  }

  window.checkAuth = async function () {
    const authData = await getCurrentAuthProfile();
    if (!authData) {
      const loginScreen = qs('#loginScreen');
      const app = qs('#app');
      if (loginScreen) loginScreen.classList.remove('hidden');
      if (app) app.classList.add('hidden');
      return;
    }

    window.AuthService.saveSession(authData);

    if (window.state) {
      window.state.currentUser = authData.profile.display_name || authData.profile.username || authData.user.email;
      window.state.currentRole = authData.profile.role || 'user';
    }

    const loginScreen = qs('#loginScreen');
    const app = qs('#app');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    if (typeof window.loadAll === 'function') await window.loadAll();
    if (typeof window.renderAll === 'function') window.renderAll();
  };

  window.logout = async function () {
    await window.AuthService.logout();
    location.reload();
  };

  replaceLoginForm();
})();
