/* ANDROMEDA Supabase Auth patch FIXED
   Подключить после assets/dist/app.bundle.min.js.
   Исправление: в app.bundle.min.js db и Services объявлены как const, а не window.db/window.Services.
*/
(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function getSupabaseClient() {
    if (window.db) return window.db;
    if (typeof db !== 'undefined') return db;
    if (window.Services?.db) return window.Services.db;
    if (typeof Services !== 'undefined' && Services.db) return Services.db;
    throw new Error('Supabase client is not initialized');
  }

  function getProfilesTableName() {
    if (window.Services?.tables?.profiles) return window.Services.tables.profiles;
    if (typeof Services !== 'undefined' && Services.tables?.profiles) return Services.tables.profiles;
    return 'profiles';
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
    input.style.cssText = oldField.style.cssText;
    oldField.replaceWith(input);
  }

  async function loginWithSupabaseAuth(email, password) {
    const client = getSupabaseClient();
    const profilesTable = getProfilesTableName();

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await client
      .from(profilesTable)
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return { user: data.user, profile };
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

      if (typeof AuthService !== 'undefined') {
        AuthService.login = async function (loginEmail, loginPassword) {
          try {
            const data = await loginWithSupabaseAuth(loginEmail, loginPassword);
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        };
        AuthService.saveSession = saveAuthSession;
        AuthService.clearSession = function () { sessionStorage.clear(); };
        AuthService.isActive = function () { return sessionStorage.getItem('e_active') === 'true'; };
        AuthService.getCurrentUser = function () {
          return {
            uid: sessionStorage.getItem('e_uid'),
            email: sessionStorage.getItem('e_email'),
            name: sessionStorage.getItem('e_name'),
            role: sessionStorage.getItem('e_role')
          };
        };
        AuthService.logout = async function () {
          await getSupabaseClient().auth.signOut();
          sessionStorage.clear();
        };
      }

      if (typeof checkAuth === 'function') {
        await checkAuth();
      } else {
        location.reload();
      }
    } catch (error) {
      console.error('[ANDROMEDA auth]', error);
      if (error?.code === 'PGRST116') {
        showLoginError('Вход успешный, но профиль не найден в таблице profiles');
      } else if (String(error?.message || '').includes('row-level security')) {
        showLoginError('Вход успешный, но RLS не даёт прочитать профиль');
      } else {
        showLoginError(error?.message || 'Ошибка входа');
      }
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
    if (typeof AuthService === 'undefined') return;

    AuthService.login = async function (email, password) {
      try {
        const data = await loginWithSupabaseAuth(email, password);
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    };

    AuthService.saveSession = saveAuthSession;
    AuthService.clearSession = function () { sessionStorage.clear(); };
    AuthService.isActive = function () { return sessionStorage.getItem('e_active') === 'true'; };
    AuthService.getCurrentUser = function () {
      return {
        uid: sessionStorage.getItem('e_uid'),
        email: sessionStorage.getItem('e_email'),
        name: sessionStorage.getItem('e_name'),
        role: sessionStorage.getItem('e_role')
      };
    };
    AuthService.logout = async function () {
      await getSupabaseClient().auth.signOut();
      sessionStorage.clear();
    };
  }

  function patchLogout() {
    const logoutButton = qs('#logoutBtn');
    if (!logoutButton) return;

    const newLogoutButton = logoutButton.cloneNode(true);
    logoutButton.replaceWith(newLogoutButton);
    newLogoutButton.addEventListener('click', async function () {
      try {
        await getSupabaseClient().auth.signOut();
      } catch (error) {
        console.warn('[ANDROMEDA auth logout]', error);
      }
      sessionStorage.clear();
      location.reload();
    });
  }

  function initAuthPatch() {
    replaceLoginUserSelectWithEmailInput();
    patchAuthService();
    replaceLoginListeners();
    patchLogout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthPatch);
  } else {
    initAuthPatch();
  }
})();
document.addEventListener('click', async (event) => {
  if (event.target?.id !== 'changePasswordBtn') return;

  const password = document.getElementById('newPassword')?.value || '';
  const confirm = document.getElementById('confirmPassword')?.value || '';
  const message = document.getElementById('changePasswordMessage');

  message.classList.remove('hidden');
  message.style.color = '#e11d48';

  if (password.length < 8) {
    message.textContent = 'Пароль должен быть минимум 8 символов';
    return;
  }

  if (password !== confirm) {
    message.textContent = 'Пароли не совпадают';
    return;
  }

  const supabaseClient =
    window.db ||
    window.Services?.db ||
    (typeof Services !== 'undefined' ? Services.db : null) ||
    (typeof db !== 'undefined' ? db : null);

  if (!supabaseClient) {
    message.textContent = 'Ошибка: Supabase не найден';
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password
  });

  if (error) {
    message.textContent = error.message || 'Не удалось сменить пароль';
    return;
  }

  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';

  message.style.color = '#16a34a';
  message.textContent = 'Пароль успешно изменён';
});
