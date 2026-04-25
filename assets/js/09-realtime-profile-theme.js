    async function refreshChat() {
      const { data, error } = await ChatService.fetchMessages(50);
      if (!error && data) {
        renderMessages(data);
      }
    }

  async function setupChat() {
  await refreshChat();

  if (state.chatChannel) return;

  state.chatChannel = ChatService.subscribe(payload => {
    if (payload.eventType === 'INSERT') {
      const message = payload.new;
      const myUid = sessionStorage.getItem('e_uid');

      if (state.currentView !== 'chat' && message.sender_uid !== myUid) {
        state.unreadChatCount += 1;
        buildMainTabs();
      }
    }

    refreshChat();
  });
}
    function setupTasksRealtime() {
      if (state.tasksChannel) return;

      state.tasksChannel = db
        .channel('tasks-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: Services.tables.tasks },
          payload => {
            const { eventType, new: newRow, old: oldRow } = payload;

            if (eventType === 'INSERT') {
              TaskState.addTask(newRow);
            }

            if (eventType === 'UPDATE') {
              TaskState.patchTask(newRow.id, newRow);
            }

            if (eventType === 'DELETE') {
              TaskState.removeTask(oldRow.id);
              TaskState.removeFromTrash(oldRow.id);
            }

            // мягкий ререндер
            if (state.currentView === 'list') renderCards();
            if (state.currentView === 'kanban') renderKanban();
            if (state.currentView === 'calendar') renderCalendar();
            renderMetaOnly();
          }
        )
        .subscribe();
    }
    
        function renderAll() {
      buildMainTabs();
      ViewController.applyLayout();
      ViewController.renderActiveView();
      ViewController.renderMeta();
    }

    function renderMetaOnly() {
      ViewController.renderMeta();
    }
    

    function getProfileInitials(name = '') {
      const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '👤';
      return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
    }

    function updateProfileUI() {
      const name = state.currentUser || 'Пользователь';
      const role = state.currentRole === 'admin' ? 'Администратор' : 'Пользователь';
      const initials = getProfileInitials(name);
      if ($('#currentUserDisplay')) $('#currentUserDisplay').textContent = name;
      if ($('#profileNameCompact')) $('#profileNameCompact').textContent = name;
      if ($('#profileRoleDisplay')) $('#profileRoleDisplay').textContent = role;
      if ($('#profileInitials')) $('#profileInitials').textContent = initials;
      if ($('#profileInitialsModal')) $('#profileInitialsModal').textContent = initials;
    }

    const ThemeDropdown = {
      labels: {
        light: { icon: '☀️', label: 'Светлая' },
        dark: { icon: '🌙', label: 'Тёмная' },
        pink: { icon: '🌸', label: 'Розовая' }
      },

      close() {
        const root = $('#themeDropdown');
        const btn = $('#themeDropdownBtn');
        if (!root || !btn) return;
        root.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      },

      toggle() {
        const root = $('#themeDropdown');
        const btn = $('#themeDropdownBtn');
        if (!root || !btn) return;
        const isOpen = root.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
      },

      sync(theme = 'light') {
        const meta = ThemeDropdown.labels[theme] || ThemeDropdown.labels.light;
        const root = $('#themeDropdown');
        if (root) root.dataset.value = theme;
        if ($('#themeDropdownIcon')) $('#themeDropdownIcon').textContent = meta.icon;
        if ($('#themeDropdownLabel')) $('#themeDropdownLabel').textContent = meta.label;
        $$('.theme-dropdown-option').forEach(option => {
          option.setAttribute('aria-selected', String(option.dataset.themeOption === theme));
        });
      },

      bind() {
        $('#themeDropdownBtn')?.addEventListener('click', event => {
          event.stopPropagation();
          ThemeDropdown.toggle();
        });

        $$('.theme-dropdown-option').forEach(option => {
          option.addEventListener('click', event => {
            event.stopPropagation();
            applyTheme(option.dataset.themeOption || 'light');
            ThemeDropdown.close();
          });
        });

        document.addEventListener('click', event => {
          if (!event.target.closest?.('#themeDropdown')) ThemeDropdown.close();
        });

        document.addEventListener('keydown', event => {
          if (event.key === 'Escape') ThemeDropdown.close();
        });
      }
    };

    function applyTheme(theme) {
      document.body.classList.remove('theme-dark', 'theme-pink');
      if (theme === 'dark') document.body.classList.add('theme-dark');
      if (theme === 'pink') document.body.classList.add('theme-pink');
      localStorage.setItem('andromeda_theme', theme);
      ThemeDropdown.sync(theme);
      if (state.currentView === 'analytics' && state.analyticsSubView === 'visuals') renderCharts();
    }

    function applySavedTheme() {
      const theme = localStorage.getItem('andromeda_theme') || 'light';
      applyTheme(theme);
    }
