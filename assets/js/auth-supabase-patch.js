/* ANDROMEDA Supabase Auth patch
   Подключить после assets/js/11-events-init.js или после assets/dist/app.bundle.js.
   Что делает:
   - убирает выбор предустановленного профиля;
   - заменяет вход на email + пароль через Supabase Auth;
   - подтягивает профиль из public.profiles по auth.users.id;
   - сохраняет безопасную сессию;
   - добавляет корректный выход через db.auth.signOut().
*/
(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
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
    errorBox.classList.add('hidden');
  }

  function replaceLoginUserSelectWithEmailInput() {
    const oldField = qs('#loginUser');
    if (!oldField) return;

    if (oldField.tagName.toLowerCase() === 'input' && oldField.type === 'email') {
      oldField.placeholder = 'Email';
      oldField.autocomplete = 'email';
      return;
    }

    const input = document.createElement('input');
    input.id = 'loginUser';
    input.name = 'email';
    input.type = 'email';
    input.placeholder = 'Email';
    input.autocomplete = 'email';
    input.inputMode = 'email';
    input.className = oldField.className || 'input';
    input.required = true;

    oldField.replaceWith(input);
  }

  async function loginWithSupabaseAuth(email, password) {
    if (!window.db || !window.Services) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    const { data: profile, error: profileError } = await db
      .from(Services.tables.profiles)
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    return {
      user: data.user,
      profile
    };
  }

  function saveAuthSession(authData) {
    const user = authData.user;
    const profile = authData.profile || {};
    const displayName = profile.display_name || profile.username || user.email || 'Пользователь';
    const role = profile.role || 'user';

    sessionStorage.setItem('e_active', 'true');
    sessionStorage.setItem('e_uid', user.id);
    sessionStorage.setItem('e_email', user.email || '');
    sessionStorage.setItem('e_name', displayName);
    sessionStorage.setItem('e_role', role);
  }

  async function newHandleLogin() {
    const btn = qs('#loginBtn');
    const emailField = qs('#loginUser');
    const passwordField = qs('#loginPass');

    hideLoginError();

    const email = String(emailField?.value || '').trim();
    const password = String(passwordField?.value || '');

    if (!email || !password) {
      showLoginError('Введите email и пароль');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Входим...';
    }

    try {
      const authData = await loginWithSupabaseAuth(email, password);
      saveAuthSession(authData);

      if (window.AuthService) {
        AuthService.saveSession = saveAuthSession;
        AuthService.isActive = function () {
          return sessionStorage.getItem('e_active') === 'true';
        };
        AuthService.getCurrentUser = function () {
          return {
            uid: sessionStorage.getItem('e_uid'),
            email: sessionStorage.getItem('e_email'),
            name: sessionStorage.getItem('e_name'),
            role: sessionStorage.getItem('e_role')
          };
        };
        AuthService.clearSession = function () {
          sessionStorage.clear();
        };
        AuthService.logout = async function () {
          await db.auth.signOut();
          sessionStorage.clear();
        };
      }

      if (typeof window.checkAuth === 'function') {
        await window.checkAuth();
      } else if (typeof checkAuth === 'function') {
        await checkAuth();
      } else {
        location.reload();
      }
    } catch (error) {
      console.error('[ANDROMEDA auth]', error);
      showLoginError('Неверный email или пароль');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Войти';
      }
    }
  }

  function replaceLoginListeners() {
    const oldBtn = qs('#loginBtn');
    if (oldBtn) {
      const newBtn = oldBtn.cloneNode(true);
      oldBtn.replaceWith(newBtn);
      newBtn.addEventListener('click', newHandleLogin);
    }

    const passwordField = qs('#loginPass');
    if (passwordField) {
      const newPass = passwordField.cloneNode(true);
      passwordField.replaceWith(newPass);
      newPass.autocomplete = 'current-password';
      newPass.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') newHandleLogin();
      });
    }

    const emailField = qs('#loginUser');
    if (emailField) {
      emailField.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') newHandleLogin();
      });
    }
  }

  function patchAuthService() {
    if (!window.AuthService && typeof AuthService === 'undefined') return;

    const service = window.AuthService || AuthService;

    service.login = async function (email, password) {
      try {
        const data = await loginWithSupabaseAuth(email, password);
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    };

    service.saveSession = saveAuthSession;

    service.clearSession = function () {
      sessionStorage.clear();
    };

    service.isActive = function () {
      return sessionStorage.getItem('e_active') === 'true';
    };

    service.getCurrentUser = function () {
      return {
        uid: sessionStorage.getItem('e_uid'),
        email: sessionStorage.getItem('e_email'),
        name: sessionStorage.getItem('e_name'),
        role: sessionStorage.getItem('e_role')
      };
    };

    service.logout = async function () {
      await db.auth.signOut();
      sessionStorage.clear();
    };
  }

  async function patchLogout() {
    const logoutButton = qs('#logoutBtn');
    if (!logoutButton) return;

    const newLogoutButton = logoutButton.cloneNode(true);
    logoutButton.replaceWith(newLogoutButton);

    newLogoutButton.addEventListener('click', async function () {
      try {
        if (window.db) await db.auth.signOut();
      } catch (error) {
        console.warn('[ANDROMEDA auth logout]', error);
      }
      sessionStorage.clear();
      location.reload();
    });
  }

  function addPasswordChangeBlock() {
    const profileModal = qs('#profileModal');
    if (!profileModal || qs('#changePasswordBtn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mt-4 p-4 rounded-2xl border border-slate-200 bg-white/70 space-y-3';
    wrapper.innerHTML = `
      <div>
        <h3 class="font-semibold text-slate-800">Смена пароля</h3>
        <p class="text-xs text-slate-500">Пароль меняется в Supabase Auth.</p>
      </div>
      <input id="newPassword" type="password" placeholder="Новый пароль" autocomplete="new-password" class="w-full px-3 py-2 rounded-xl border border-slate-200">
      <input id="confirmPassword" type="password" placeholder="Повторите пароль" autocomplete="new-password" class="w-full px-3 py-2 rounded-xl border border-slate-200">
      <button id="changePasswordBtn" type="button" class="w-full px-4 py-2 rounded-xl bg-slate-900 text-white">Сменить пароль</button>
      <div id="changePasswordMsg" class="text-xs hidden"></div>
    `;

    profileModal.appendChild(wrapper);

    qs('#changePasswordBtn')?.addEventListener('click', async function () {
      const msg = qs('#changePasswordMsg');
      const password = String(qs('#newPassword')?.value || '');
      const confirm = String(qs('#confirmPassword')?.value || '');

      if (msg) {
        msg.className = 'text-xs hidden';
        msg.textContent = '';
      }

      if (password.length < 8) {
        if (msg) {
          msg.textContent = 'Пароль должен быть минимум 8 символов';
          msg.className = 'text-xs text-red-600';
        }
        return;
      }

      if (password !== confirm) {
        if (msg) {
          msg.textContent = 'Пароли не совпадают';
          msg.className = 'text-xs text-red-600';
        }
        return;
      }

      const { error } = await db.auth.updateUser({ password });
      if (error) {
        if (msg) {
          msg.textContent = error.message || 'Не удалось сменить пароль';
          msg.className = 'text-xs text-red-600';
        }
        return;
      }

      qs('#newPassword').value = '';
      qs('#confirmPassword').value = '';
      if (msg) {
        msg.textContent = 'Пароль успешно изменён';
        msg.className = 'text-xs text-emerald-600';
      }
    });
  }

  function initAuthPatch() {
    replaceLoginUserSelectWithEmailInput();
    patchAuthService();
    replaceLoginListeners();
    patchLogout();
    addPasswordChangeBlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthPatch);
  } else {
    initAuthPatch();
  }
})();
