        async function logAction(actionType, taskTitle, details = '') {await LogService.create(actionType, taskTitle, details);
    }

        async function loadAllData() {
      setLoadingTasks(true);
      try {
        const [tasksRes, trashRes, configRes] = await Promise.all([
          TaskService.getAllActive(),
          TaskService.getAllTrash(),
         ConfigService.getAll()
        ]);

        if (tasksRes.error || trashRes.error) {
          console.error(tasksRes.error || trashRes.error);
          notify('Не удалось загрузить данные', 'error', 'Ошибка');
          return;
        }

                TaskState.setTasks(tasksRes.data || []);
        TaskState.setTrash(trashRes.data || []);

                if (configRes.data) {
          ConfigService.applyToLocalStorage(configRes.data);
        }
      } finally {
        setLoadingTasks(false);
      }
    }

        async function handleLogin() {
      const btn = $('#loginBtn');
      const errorBox = $('#loginError');

      errorBox.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = '...';

      const username = $('#loginUser').value;
      const password = $('#loginPass').value;

      try {
        const { data, error } = await AuthService.login(username, password);
        if (error || !data) throw new Error('INVALID');

        AuthService.saveSession(data);
        await checkAuth();
      } catch (error) {
        errorBox.textContent = 'Ошибка входа';
        errorBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Войти';
      }
    }

        async function checkAuth() {
      if (!AuthService.isActive()) return;

      const user = AuthService.getCurrentUser();

      state.currentUser = user.name;
      state.currentRole = user.role;

      updateProfileUI();

      if (state.currentRole === 'admin') {
        $('#adminPanel').classList.remove('hidden');
      }

      $('#loginOverlay').style.display = 'none';
      $('#appContent').classList.remove('hidden');

      applySavedTheme();
      await loadAllData();
      await setupChat();
      await setupTasksRealtime();

      setTimeout(() => $('#appContent').style.opacity = '1', 50);
    }

        function logout() {
      AuthService.clearSession();
      location.reload();
    }

             async function moveToTrash(id) {
      const task = state.tasks.find(item => String(item.id) === String(id));
      if (!task) return;

      const { error } = await TaskService.moveToTrash(id, state.currentUser);
      if (error) return notify('Не удалось переместить в корзину', 'error', 'Ошибка');

      const removedTask = TaskState.removeTask(id);

      if (removedTask) {
        TaskState.addToTrash({
          ...removedTask,
          is_deleted: true,
          deleted_by: state.currentUser
        });
      }

      if (state.currentView === 'list') renderCards();
      if (state.currentView === 'kanban') renderKanban();
      if (state.currentView === 'calendar') renderCalendar();
      renderMetaOnly();

      showUndoDeleteToast(task);
      await logAction('delete', task.title || 'Задача', 'Перенесено в корзину');
    }

        function showUndoDeleteToast(task) {
      const container = $('#toastContainer');
      if (!container || !task) return;

      const toast = document.createElement('div');
      toast.className = 'toast toast-warning';

      toast.innerHTML = `
        <div class="toast-icon">🗑️</div>
        <div class="toast-body">
          <strong>Задача удалена</strong>
          <div class="text-sm font-medium">«${escapeHtml(task.title || 'Без названия')}» перенесена в корзину.</div>
          <button
            type="button"
            class="undo-delete-btn mt-3 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-white"
            style="background: var(--text);"
            data-task-id="${escapeHtml(task.id)}"
          >
            Отменить
          </button>
        </div>
        <button type="button" class="toast-close" aria-label="Закрыть">×</button>
      `;

      $('.toast-close', toast)?.addEventListener('click', () => removeToast(toast));

      $('.undo-delete-btn', toast)?.addEventListener('click', async () => {
        await restoreFromTrash(task.id);
        removeToast(toast);
        notify('Удаление отменено', 'success', 'Готово');
      });

      container.appendChild(toast);
      setTimeout(() => removeToast(toast), 7000);
    }

        async function restoreFromTrash(id) {
      const { error } = await TaskService.restore(id);
      if (error) return notify('Не удалось восстановить задачу', 'error', 'Ошибка');

      const restoredTask = TaskState.removeFromTrash(id);

      if (restoredTask) {
        TaskState.restoreTask({
          ...restoredTask,
          is_deleted: false,
          deleted_by: null
        });
      }

            if (state.currentView === 'list') renderCards();
      if (state.currentView === 'kanban') renderKanban();
      if (state.currentView === 'calendar') renderCalendar();
      renderMetaOnly();
      renderTrash();
    }

        async function finalDelete(id) {
      if (!confirm('Навсегда удалить задачу?')) return;

      const { error } = await TaskService.removeForever(id);
      if (error) return notify('Не удалось удалить задачу', 'error', 'Ошибка');

      TaskState.removeFromTrash(id);
            renderMetaOnly();
      renderTrash();
    }

    function fillTaskForm(task) {
      $('#edit_id').value = task.id;
      $('#edit_title').value = task.title || '';
      $('#edit_work_type').value = task.work_type || 'Пост';
      $('#edit_tag').value = task.tag || 'прочее';
      $('#edit_description').value = task.description || '';
      $('#edit_status').value = task.status || 'idea';
      $('#edit_start_date').value = task.start_date || '';
      $('#edit_date').value = task.date || '';
      $('#edit_date').min = task.start_date || '';

      $$('input[name="edit_chan"]').forEach(cb => cb.checked = (task.channels || []).includes(cb.value));
      $$('input[name="edit_exec"]').forEach(cb => cb.checked = (task.executors || []).includes(cb.value));

      const linkContainer = $('#multiLinkContainer');
      linkContainer.innerHTML = (task.channels || []).map(channel => {
        const value = task.links?.[channel] || '';
        return `
          <div>
            <label class="mb-1 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">${getSocialIcon(channel)} ${escapeHtml(channel)}</label>
            <input type="url" class="multi-link-input w-full rounded-xl border p-2 text-sm font-semibold outline-none" style="background: var(--surface); border-color: var(--border); color: var(--text);" data-platform="${escapeHtml(channel)}" value="${escapeHtml(value)}" />
          </div>
        `;
      }).join('');
    }

    function openEditModal(id) {
      const task = state.tasks.find(item => String(item.id) === String(id));
      if (!task) return;
      fillTaskForm(task);
      openModal('editModal');
    }

    function openCreateModal(prefillDate = '') {
      $('#ideaForm').reset();
      clearCreateFormErrors();
      $$('input[type="checkbox"]', $('#createModal')).forEach(cb => cb.checked = false);
      const date = prefillDate || new Date().toISOString().split('T')[0];
      state.createPrefillDate = date;
      $('#start_date_val').value = date;
      $('#date_val').value = date;
      $('#date_val').min = date;
      const formatted = parseLocalDate(date)?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) || 'без даты';
      if ($('#createModalTitle')) $('#createModalTitle').textContent = prefillDate ? 'Новая задача' : 'Новая задача';
      if ($('#createModalSubtitle')) $('#createModalSubtitle').textContent = prefillDate ? 'Заполни все важное .' : 'Заполни минимум для старта, детали можно добавить позже.';
      if ($('#createPreviewDate')) $('#createPreviewDate').textContent = formatted;
      openModal('createModal');
      renderCalendar();
    }

   async function saveEditForm(event) {
      event.preventDefault();

      const startDate = $('#edit_start_date').value;
      const endDate = $('#edit_date').value;

      if (startDate && endDate && endDate < startDate) {
        return notify('Дедлайн не может быть раньше даты старта', 'warning', 'Проверь даты');
      }

      const id = $('#edit_id').value;
      const oldTask = state.tasks.find(item => String(item.id) === String(id));
      const payload = TaskHelpers.collectEditPayload();

      const { data, error } = await TaskService.update(id, payload);
if (error) return notify('Не удалось сохранить изменения', 'error', 'Ошибка');

TaskState.patchTask(id, data || payload);

if (state.currentView === 'list') renderCards();
if (state.currentView === 'kanban') renderKanban();
if (state.currentView === 'calendar') renderCalendar();
renderMetaOnly();

closeModal('editModal');

      if (oldTask && oldTask.status !== payload.status) {
        await logAction('status_change', oldTask.title, `Статус: ${oldTask.status} → ${payload.status}`);
      } else {
        await logAction('update', oldTask?.title || payload.title, 'Данные обновлены');
      }
    }

        async function saveCreateForm(event) {
      event.preventDefault();

      if (!validateCreateForm()) {
        return notify('Проверь поля формы: ошибки уже показаны под нужными полями.', 'warning', 'Нужно поправить данные');
      }

      const task = TaskHelpers.collectCreatePayload();
      const { data, error } = await TaskService.create(task);

if (error) return notify('Не удалось создать задачу', 'error', 'Ошибка');

TaskState.addTask(data || task);
          if (state.currentView === 'list') renderCards();
if (state.currentView === 'kanban') renderKanban();
if (state.currentView === 'calendar') renderCalendar();
renderMetaOnly();
      $('#ideaForm').reset();
      $$('input[type="checkbox"]', $('#createModal')).forEach(cb => cb.checked = false);
      closeModal('createModal');
      notify(`Задача «${task.title}» создана`, 'success', 'Готово');
      await logAction('create', task.title, 'Создана новая задача');
    }

        async function saveAdminSettings() {
      const yt = $('#ytApiKey').value.trim();
      const apify = $('#apifyToken').value.trim();

      const { error } = await ConfigService.saveApiKeys(yt, apify);
      if (error) return notify('Не удалось сохранить настройки', 'error', 'Ошибка');

      localStorage.setItem('yt_key', yt);
      localStorage.setItem('apify_token', apify);

      notify('Настройки сохранены', 'success', 'Готово');
    }

    function exportStatsToCSV() {
      const results = state.tasks.filter(task => {
        const date = parseLocalDate(task.date);
        return task.status === 'published' && date && isSameMonthYear(date, state.statsDate);
      });
      if (!results.length) return notify('Нет данных для экспорта');
      let csv = '\uFEFFДата;Тема;Тег;Охват;Ответственный\n';
      results.forEach(task => {
        csv += `"${formatShortDate(task.date)}";"${String(task.title || '').replace(/"/g, '""')}";"${String(task.tag || '').replace(/"/g, '""')}";"${Number(task.play_count || 0)}";"${String(task.responsible || '').replace(/"/g, '""')}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${state.statsDate.getFullYear()}_${state.statsDate.getMonth() + 1}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    async function fetchSingleStat(url, platform) {
      if (!url || url.length < 10) return 0;
      const ytKey = localStorage.getItem('yt_key');
      const apifyToken = localStorage.getItem('apify_token');
      try {
        if (platform === 'VK' && apifyToken) {
          const actor = 'apify/vkontakte-scraper';
          const input = { startUrls: [{ url }], maxItems: 1 };
          const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
          });
          const data = await res.json();
          return Number(data?.[0]?.viewsCount || data?.[0]?.views?.count || 0);
        }

        if (TG_LIST.includes(platform) || url.includes('t.me/')) {
          const safeUrl = url.trim().replace('t.me/', 't.me/s/');
          const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(safeUrl)}`);
          const data = await res.json();
          const match = data.contents?.match(/class="tgme_widget_message_views">([\d.KM]+)/i);
          if (match) {
            const value = match[1].toUpperCase();
            if (value.includes('K')) return parseFloat(value) * 1000;
            if (value.includes('M')) return parseFloat(value) * 1000000;
            return parseInt(value.replace(/\D/g, ''), 10) || 0;
          }
        }

        if (platform === 'YouTube' && ytKey) {
          const videoId = (url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/) || [])[2];
          if (videoId) {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${ytKey}`);
            const data = await res.json();
            return Number(data.items?.[0]?.statistics?.viewCount || 0);
          }
        }

        if ((platform === 'TikTok' || platform === 'Instagram') && apifyToken) {
          const actor = platform === 'TikTok' ? 'GdWCkxBtKWOsKjdch' : 'apify/instagram-post-scraper';
          const input = platform === 'TikTok' ? { postURLs: [url] } : { directUrls: [url] };
          const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${apifyToken}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
          });
          const data = await res.json();
          return Number(data?.[0]?.playCount || data?.[0]?.videoViewCount || data?.[0]?.videoPlayCount || data?.[0]?.likesCount || 0);
        }
      } catch (error) {
        console.error('Stat fetch error', error);
      }
      return 0;
    }

    async function updateAllMonthStats() {
  const btn = $('#btnUpdateAll');
  const progressToast = notify('Обновляю статистику по публикациям…', 'loading', 'Подожди', { closable: false });

  btn.disabled = true;
  btn.textContent = '...';

  try {
    const tasks = state.tasks.filter(task => {
      const date = parseLocalDate(task.date);
      return date && isSameMonthYear(date, state.statsDate) && task.links && Object.keys(task.links).length > 0;
    });

    for (const task of tasks) {
      let total = 0;
      const playCounts = { ...(task.play_counts || {}) };

      for (const [platform, url] of Object.entries(task.links || {})) {
        if (!url) continue;
        const value = await fetchSingleStat(url, platform);
        playCounts[platform] = value;
        total += value;
      }

      const { error } = await db.from('tasks').update({
        play_counts: playCounts,
        play_count: total
      }).eq('id', task.id);

      if (error) console.error(error);
    }

    await loadAllData();
    updateToast(progressToast, 'Статистика обновлена.', 'success', 'Готово');
  } catch (e) {
    console.error(e);
    updateToast(progressToast, 'Не удалось обновить статистику.', 'error', 'Ошибка');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Обновить';
  }
}
function getChatTaskSearchMatches(query = '') {
      const normalized = String(query || '').trim().toLowerCase();
      const source = state.tasks || [];

      if (!normalized) {
        return source
          .filter(task => task.status !== 'published')
          .slice()
          .sort((a, b) => {
            const da = parseLocalDate(a.date)?.getTime() || 0;
            const db = parseLocalDate(b.date)?.getTime() || 0;
            return da - db || Number(b.id || 0) - Number(a.id || 0);
          })
          .slice(0, 6);
      }

      return source
        .filter(task => {
          const haystack = [
            task.title,
            task.description,
            task.responsible,
            task.work_type,
            task.tag,
            STATUS_MAP[task.status],
            ...(task.channels || []),
            ...(task.executors || [])
          ].join(' ').toLowerCase();

          return haystack.includes(normalized);
        })
        .slice(0, 8);
    }

    function renderChatTaskSearchResults(forceOpen = false) {
      const input = $('#chatTaskSearchInput');
      const results = $('#chatTaskSearchResults');
      if (!input || !results) return;

      const query = input.value.trim();
      const isFocused = document.activeElement === input;
      if (!forceOpen && !isFocused && !query) {
        results.classList.add('hidden');
        results.innerHTML = '';
        return;
      }

      const matches = getChatTaskSearchMatches(query);

      if (!matches.length) {
        results.innerHTML = '<div class="chat-task-search-empty">Задачи не найдены</div>';
        results.classList.remove('hidden');
        return;
      }

      const title = query
        ? ''
        : '<div class="chat-task-search-hint">Ближайшие активные задачи</div>';

      results.innerHTML = title + matches.map(task => {
        const deadline = getDeadlineMeta(task.date, task.status);
        const channels = (task.channels || []).slice(0, 3).join(', ') || 'без площадок';
        const executor = (task.executors || []).slice(0, 2).join(', ') || task.responsible || 'без исполнителя';

        return `
          <button type="button" class="chat-task-search-item send-chat-task-from-search" data-task-id="${escapeHtml(task.id)}">
            <div class="chat-task-search-title">${escapeHtml(task.title || 'Без названия')}</div>
            <div class="chat-task-search-meta">
              <span>${escapeHtml(STATUS_MAP[task.status] || 'Идея')}</span>
              <span>📅 ${escapeHtml(deadline.shortLabel)}</span>
              <span>${escapeHtml(channels)}</span>
              <span>👤 ${escapeHtml(executor)}</span>
            </div>
            <span class="chat-task-search-send">Отправить в чат</span>
          </button>
        `;
      }).join('');
      results.classList.remove('hidden');
    }

    function clearChatTaskSearch() {
      const input = $('#chatTaskSearchInput');
      const results = $('#chatTaskSearchResults');
      if (input) input.value = '';
      if (results) {
        results.innerHTML = '';
        results.classList.add('hidden');
      }
    }

            async function sendTaskToChat(taskId) {
      const task = state.tasks.find(item => String(item.id) === String(taskId));
      if (!task) return notify('Задача не найдена', 'warning', 'Не получилось');

      const { error } = await ChatService.sendMessage({
        sender_name: state.currentUser,
        sender_uid: sessionStorage.getItem('e_uid'),
        message: ChatUI.getTaskToken(task.id)
      });

      if (error) return notify('Не удалось отправить задачу в чат', 'error', 'Ошибка');

      clearChatTaskSearch();
      await refreshChat();
      notify(`Задача «${task.title || 'Без названия'}» отправлена в чат`, 'success', 'Готово');
    }
        async function sendChatMessage() {
      const input = $('#chatInput');
      const sendBtn = $('#sendChatBtn');
      const message = input.value.trim();

      if (!message) return;

      sendBtn.disabled = true;

      const { error } = await ChatService.sendMessage({
        sender_name: state.currentUser,
        sender_uid: sessionStorage.getItem('e_uid'),
        message
      });

      sendBtn.disabled = false;

      if (error) return notify('Не удалось отправить сообщение', 'error', 'Ошибка');

      ChatUI.resetComposer();
    }

       async function deleteMessage(id) {
      if (!confirm('Удалить сообщение?')) return;

      const { error } = await ChatService.deleteMessage(id);
      if (error) notify('Не удалось удалить сообщение', 'error', 'Ошибка');
    }

        async function toggleReaction(messageId, emoji) {
      const myUid = sessionStorage.getItem('e_uid');
      const { data, error } = await ChatService.getReactions(messageId);
      if (error || !data) return;

      const reactions = data.reactions || {};
      if (!Array.isArray(reactions[emoji])) reactions[emoji] = [];

      if (reactions[emoji].includes(myUid)) {
        reactions[emoji] = reactions[emoji].filter(uid => uid !== myUid);
      } else {
        reactions[emoji].push(myUid);
      }

      await ChatService.updateReactions(messageId, reactions);
    }

    function toggleLogs(forceOpen = null) {
      const panel = $('#logsPanel');
      const isClosed = panel.classList.contains('translate-x-full');
      const shouldOpen = forceOpen === null ? isClosed : forceOpen;
      panel.classList.toggle('translate-x-full', !shouldOpen);
      if (shouldOpen) {
        $('#logBadge').classList.add('hidden');
        renderLogs();
      }
    }
