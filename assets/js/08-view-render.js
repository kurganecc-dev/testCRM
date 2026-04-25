    const ViewController = {
      applyLayout() {
        const controls = $('#listControls');
        const middle = $('#middlePanel');
        const listLike = state.currentView === 'list' || state.currentView === 'kanban';
        if (controls) controls.classList.toggle('hidden', !listLike);

        if (middle) {
          middle.classList.add('lg:col-span-12');
          middle.classList.remove('lg:col-span-9');
        }

        VIEWS.forEach(view => {
          const el = document.getElementById(`view-${view}`);
          if (!el) return;

          const active = view === state.currentView;
          el.classList.toggle('hidden', !active);
          el.classList.toggle('view-animate', active);
        });
      },

      renderActiveView() {
        if (state.currentView === 'list') renderCards();
        if (state.currentView === 'kanban') renderKanban();
        if (state.currentView === 'calendar') renderCalendar();

       if (state.currentView === 'analytics') {
  $('#analytics-table')?.classList.toggle('hidden', state.analyticsSubView !== 'table');
  $('#analytics-visuals')?.classList.toggle('hidden', state.analyticsSubView !== 'visuals');
  $('#analytics-people')?.classList.toggle('hidden', state.analyticsSubView !== 'people');

  $('#analyticsTableBtn')?.classList.toggle('tab-active', state.analyticsSubView === 'table');
  $('#analyticsVisualsBtn')?.classList.toggle('tab-active', state.analyticsSubView === 'visuals');
  $('#analyticsPeopleBtn')?.classList.toggle('tab-active', state.analyticsSubView === 'people');

  if (state.analyticsSubView === 'table') renderStats();
  if (state.analyticsSubView === 'visuals') renderCharts();
  if (state.analyticsSubView === 'people') renderPeopleAnalytics();
}

        if (state.currentView === 'accounts') renderAccounts();
        if (state.currentView === 'chat') {
  state.unreadChatCount = 0;
  buildMainTabs();
  refreshChat();
  setTimeout(() => $('#chatInput')?.focus(), 80);
}
      },

      renderMeta() {
        if ($('#trashBadge')) {
          $('#trashBadge').textContent = String(state.trash.length);
        }
        if ($('#profileAlertDot')) {
          $('#profileAlertDot').classList.toggle('hidden', state.unreadChatCount <= 0);
        }

        renderSmartSidebar();
        renderDashboardSummary();
      }
    };
    
    function setLoadingTasks(isLoading) {
      state.isLoadingTasks = isLoading;
      renderAll();
    }

    function renderListSkeleton() {
      const container = $('#view-list');
      if (!container) return;
      container.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="app-surface rounded-[2rem] p-6">
          <div class="mb-4 flex items-start justify-between">
            <div class="flex gap-2"><div class="skeleton-chip h-5 w-16 rounded-full"></div><div class="skeleton-chip h-5 w-20 rounded-full"></div></div>
            <div class="skeleton-chip h-8 w-8 rounded-full"></div>
          </div>
          <div class="skeleton-line mb-3 h-4 w-24 rounded-lg"></div>
          <div class="skeleton-line mb-2 h-5 w-4/5 rounded-lg"></div>
          <div class="skeleton-line mb-5 h-5 w-3/5 rounded-lg"></div>
          <div class="flex items-center justify-between border-t pt-4" style="border-color: var(--border);">
            <div class="skeleton-line h-4 w-24 rounded-lg"></div>
            <div class="skeleton-chip h-7 w-16 rounded-xl"></div>
          </div>
        </div>
      `).join('');
    }

    function setFieldError(fieldId, message = '') {
      const input = document.getElementById(fieldId);
      const error = document.getElementById(`error_${fieldId}`);
      if (input) input.classList.toggle('input-error', Boolean(message));
      if (error) {
        error.textContent = message;
        error.classList.toggle('hidden', !message);
      }
    }

    function clearCreateFormErrors() {
      ['title','description','start_date_val','date_val','channels','executors'].forEach(id => setFieldError(id, ''));
    }

    function validateCreateForm() {
      clearCreateFormErrors();
      const title = $('#title').value.trim();
      const description = $('#description').value.trim();
      const startDate = $('#start_date_val').value;
      const endDate = $('#date_val').value;
      const channels = $$('input[name="chan"]:checked').map(cb => cb.value);
      const executors = $$('input[name="exec"]:checked').map(cb => cb.value);
      let valid = true;
      if (title.length < 4) { setFieldError('title', 'Нужно название хотя бы из 4 символов.'); valid = false; }
      if (description.length < 10) { setFieldError('description', 'Добавь короткое ТЗ: хотя бы 10 символов.'); valid = false; }
      if (!startDate) { setFieldError('start_date_val', 'Выбери дату старта.'); valid = false; }
      if (!endDate) { setFieldError('date_val', 'Выбери дедлайн.'); valid = false; }
      if (startDate && endDate && endDate < startDate) { setFieldError('date_val', 'Дедлайн не может быть раньше старта.'); valid = false; }
      if (!channels.length) { setFieldError('channels', 'Выбери хотя бы одну площадку.'); valid = false; }
      if (!executors.length) { setFieldError('executors', 'Назначь хотя бы одного исполнителя.'); valid = false; }
      return valid;
    }

    function removeToast(toast) {
      if (!toast) return;
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 180);
    }

    function notify(message, type = 'info', title = '', opts = {}) {
      const container = $('#toastContainer');
      if (!container) return null;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      const iconMap = { success: '✅', error: '⛔', info: 'ℹ️', warning: '⚠️', loading: '⏳' };
      const fallbackTitle = { success: 'Готово', error: 'Есть проблема', info: 'Сообщение', warning: 'Обрати внимание', loading: 'В процессе' };
      const duration = opts.duration ?? (type === 'error' ? 4800 : type === 'loading' ? 0 : 3200);
      const closable = opts.closable !== false;
      toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'ℹ️'}</div>
        <div class="toast-body">
          <strong>${escapeHtml(title || fallbackTitle[type] || 'Сообщение')}</strong>
          <div class="text-sm font-medium">${escapeHtml(message)}</div>
          ${duration > 0 ? `<div class="toast-progress"><span style="animation: toastProgress ${duration}ms linear forwards;"></span></div>` : ''}
        </div>
        ${closable ? '<button type="button" class="toast-close" aria-label="Закрыть">×</button>' : ''}
      `;
      const closeBtn = $('.toast-close', toast);
      if (closeBtn) closeBtn.addEventListener('click', () => removeToast(toast));
      container.appendChild(toast);
      if (duration > 0) setTimeout(() => removeToast(toast), duration);
      return toast;
    }

    function updateToast(toast, message, type = 'info', title = '') {
      if (!toast) return notify(message, type, title);
      toast.className = `toast toast-${type}`;
      const iconMap = { success: '✅', error: '⛔', info: 'ℹ️', warning: '⚠️', loading: '⏳' };
      const fallbackTitle = { success: 'Готово', error: 'Есть проблема', info: 'Сообщение', warning: 'Обрати внимание', loading: 'В процессе' };
      toast.innerHTML = `
        <div class="toast-icon">${iconMap[type] || 'ℹ️'}</div>
        <div class="toast-body">
          <strong>${escapeHtml(title || fallbackTitle[type] || 'Сообщение')}</strong>
          <div class="text-sm font-medium">${escapeHtml(message)}</div>
        </div>
        <button type="button" class="toast-close" aria-label="Закрыть">×</button>
      `;
      const closeBtn = $('.toast-close', toast);
      if (closeBtn) closeBtn.addEventListener('click', () => removeToast(toast));
      if (type !== 'loading') setTimeout(() => removeToast(toast), 3200);
      return toast;
    }

    function getSocialIcon(platform) {
      const icons = {
        YouTube: '🔴', TikTok: '⚫', Instagram: '📸', VK: '🔵', Telegram: '✈️',
        'Этажи SMM': '📢', NewsRoom: '📰', Echat: '💬', Max: '👔', ОК: '🟠'
      };
      return icons[platform] || '🔗';
    }

    function setVisible(el, isVisible, display = 'block') {
      if (!el) return;
      el.style.display = isVisible ? display : 'none';
      el.classList.toggle('hidden', !isVisible);
    }

    function openModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('hidden');
      el.style.display = 'flex';
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('hidden');
      el.style.display = 'none';
      if (id === 'createModal') { state.createPrefillDate = ''; renderCalendar(); }
    }

    function populateSelect(select, items, formatter = x => x) {
      select.innerHTML = items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(formatter(item))}</option>`).join('');
    }

    function renderChecklist(containerId, name, items) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = items.map(item => `
        <label class="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/70">
          <input type="checkbox" name="${name}" value="${escapeHtml(item)}" class="rounded text-blue-600" />
          <span class="text-[10px] font-black uppercase" style="color: var(--text);">${escapeHtml(item)}</span>
        </label>
      `).join('');
    }

    function renderExecutors(containerId, name) {
      const container = document.getElementById(containerId);
      if (!container) return;
      let html = '';
      for (const [dept, members] of Object.entries(DEPARTMENTS)) {
        html += `<div class="mb-2 mt-3 border-b pb-1 text-[8px] font-black uppercase tracking-[0.2em] first:mt-0" style="color: var(--primary); border-color: var(--border);">${escapeHtml(dept)}</div>`;
        html += members.map(member => `
          <label class="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/70">
            <input type="checkbox" name="${name}" value="${escapeHtml(member)}" class="rounded text-blue-600" />
            <span class="text-[10px] font-black uppercase" style="color: var(--text);">${escapeHtml(member)}</span>
          </label>
        `).join('');
      }
      container.innerHTML = html;
    }

    function buildMainTabs() {
      const root = $('#mainTabs');
      root.innerHTML = VIEWS.map(view => {
        const label = {
  list: 'Список',
  kanban: 'Канбан',
  calendar: 'Календарь',
  analytics: 'Аналитика',
  accounts: 'Справочник',
  chat: 'Чат'
}[view];

const unreadBadge = view === 'chat' && state.unreadChatCount > 0
  ? `<span class="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white">${state.unreadChatCount}</span>`
  : '';
       return `<button data-view="${view}" class="view-tab rounded-xl px-4 py-2 ${view === state.currentView ? 'tab-active' : 'text-slate-400'}">${label}${unreadBadge}</button>`;
      }).join('');
    }

    function syncQuickFilters() {
      $$('.quick-filter-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.quickFilter === state.quickFilter);
      });
    }

    function getFilteredTasks() {
      const query = ($('#taskSearch')?.value || '').trim().toLowerCase();
      const tag = $('#tagFilter')?.value || 'ALL';
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const me = state.currentUser;

      syncQuickFilters();

      return state.tasks
        .filter(task => {
          const title = String(task.title || '').toLowerCase();
          const matchesText = title.includes(query);
          const matchesTag = tag === 'ALL' || task.tag === tag;
          const isActive = task.status !== 'published';
          const date = parseLocalDate(task.date);

          let matchesQuick = true;
          if (state.quickFilter === 'MINE') matchesQuick = isActive && (((task.executors || []).includes(me)) || task.responsible === me);
          if (state.quickFilter === 'TODAY') matchesQuick = isActive && task.date === todayStr;
          if (state.quickFilter === 'OVERDUE') matchesQuick = isActive && date && date < todayStart;
          if (state.quickFilter === 'UNASSIGNED') matchesQuick = isActive && !(task.executors || []).length;

          return matchesText && matchesTag && matchesQuick;
        })
        .sort((a, b) => {
          const dateA = parseLocalDate(a.date)?.getTime() || 0;
          const dateB = parseLocalDate(b.date)?.getTime() || 0;
          return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
        });
    }


    function renderDashboardSummary() {
      renderQuickFilterCounts();
    }

    function getQuickFilterBaseTasks() {
      const query = ($('#taskSearch')?.value || '').trim().toLowerCase();
      const tag = $('#tagFilter')?.value || 'ALL';

      return state.tasks.filter(task => {
        const title = String(task.title || '').toLowerCase();
        const matchesText = title.includes(query);
        const matchesTag = tag === 'ALL' || task.tag === tag;
        return matchesText && matchesTag;
      });
    }

    function getQuickFilterCounts() {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const me = state.currentUser;
      const base = getQuickFilterBaseTasks();
      const active = base.filter(task => task.status !== 'published');

      return {
        ALL: base.length,
        MINE: active.filter(task => ((task.executors || []).includes(me)) || task.responsible === me).length,
        TODAY: active.filter(task => task.date === todayStr).length,
        OVERDUE: active.filter(task => {
          const date = parseLocalDate(task.date);
          return date && date < todayStart;
        }).length,
        UNASSIGNED: active.filter(task => !(task.executors || []).length).length
      };
    }

    function renderQuickFilterCounts() {
      const counts = getQuickFilterCounts();
      Object.entries(counts).forEach(([key, value]) => {
        const el = document.querySelector(`[data-filter-count="${key}"]`);
        if (el) el.textContent = String(value);
      });
    }


    function beginInlineEdit(taskId) {
      const task = state.tasks.find(item => String(item.id) === String(taskId));
      if (!task) return;
      state.inlineEditId = String(task.id);
      state.inlineDraft = {
        title: task.title || '',
        status: task.status || 'idea',
        date: task.date || '',
        responsible: task.responsible || '',
        work_type: task.work_type || 'Пост'
      };
      renderCards();
    }

    function cancelInlineEdit() {
      state.inlineEditId = null;
      state.inlineDraft = null;
      renderCards();
    }

           async function saveInlineEdit(taskId) {
      const draft = state.inlineDraft || {};

      if (!String(draft.title || '').trim()) {
        return notify('Для быстрого сохранения нужно указать название.', 'warning', 'Незаполнено');
      }

      if (!draft.date) {
        return notify('Укажи дедлайн, чтобы сохранить карточку.', 'warning', 'Незаполнено');
      }

      const payload = TaskHelpers.collectInlinePayload(draft);
      const loadingToast = notify('Сохраняю быстрые изменения в карточке…', 'loading', 'Подожди', { closable: false });

      const { error } = await TaskService.update(taskId, payload);

      if (error) {
        updateToast(loadingToast, 'Не удалось сохранить быстрые изменения.', 'error', 'Ошибка');
        return;
      }

      TaskState.patchTask(taskId, payload);
state.inlineEditId = null;
state.inlineDraft = null;

if (state.currentView === 'list') renderCards();
if (state.currentView === 'kanban') renderKanban();
if (state.currentView === 'calendar') renderCalendar();
renderMetaOnly();

      updateToast(loadingToast, 'Карточка обновлена без открытия модалки.', 'success', 'Сохранено');
    }

    function renderCards() {
      const container = $('#view-list');
      if (!container) return;

      if (state.isLoadingTasks) {
        renderListSkeleton();
        return;
      }

      const tasks = getFilteredTasks();

      if (!tasks.length) {
        container.innerHTML = `
          <div class="empty-state col-span-full rounded-[2rem] p-10 text-center">
            <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style="background: var(--surface);">📭</div>
            <div class="text-lg font-black">Ничего не найдено</div>
            <p class="mx-auto mt-2 max-w-md text-sm font-medium" style="color: var(--muted);">
              Попробуй очистить поиск или снять фильтр по тегу. В новой версии пустое состояние тоже подсказывает следующий шаг.
            </p>
            <button type="button" id="resetFiltersBtn" class="mt-5 rounded-2xl px-5 py-3 text-[11px] font-black uppercase text-white" style="background: var(--text);">
              Сбросить фильтры
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = tasks.map(task => {
        const isEditing = state.inlineEditId === String(task.id);
        const draft = isEditing ? (state.inlineDraft || {}) : {};
        return TaskUI.renderListCard(task, { isEditing, draft });
      }).join('');
    }

    function renderKanban() {
      const tasks = getFilteredTasks();

      getWorkflowOrder().forEach(status => {
        const col = document.querySelector(`[data-kanban="${status}"]`);
        const count = document.getElementById(`count-${status}`);
        if (!col || !count) return;

        const filtered = tasks.filter(task => task.status === status);
        count.textContent = filtered.length;
        col.innerHTML = filtered.map(task => TaskUI.renderKanbanCard(task)).join('');
      });
    }
    
    function renderCalendarTabs() {CalendarUI.renderTabs();}
    function renderCalendar() {CalendarUI.render();}
    function renderStats() {AnalyticsUI.renderStatsTable();}
    function renderCharts() {ChartUI.render();}
function createEmptyPeopleStats() {
  return {
    views: 0,
    tasks: 0,
    published: 0
  };
}

function calculatePeopleStats(tasks) {
  const stats = {};

  tasks.forEach(task => {
    if (task.status !== 'published') return;

    const views = Number(task.play_count || 0);
    const responsible = task.responsible;
    const executors = task.executors || [];

    if (responsible) {
      if (!stats[responsible]) stats[responsible] = createEmptyPeopleStats();
      stats[responsible].views += views * 0.5;
      stats[responsible].tasks += 1;
      stats[responsible].published += 1;
    }

    const executorShare = executors.length ? (views * 0.5) / executors.length : 0;

    executors.forEach(name => {
      if (!stats[name]) stats[name] = createEmptyPeopleStats();
      stats[name].views += executorShare;
      stats[name].tasks += 1;
      stats[name].published += 1;
    });
  });

  return stats;
}

function renderPeopleAnalytics() {
  const container = $('#analytics-people');
  if (!container) return;

  const stats = calculatePeopleStats(state.tasks);

  const rows = Object.entries(stats)
    .sort((a, b) => b[1].views - a[1].views)
    .map(([name, data], index) => {
      const avg = data.published ? data.views / data.published : 0;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

      return `
        <tr class="border-b" style="border-color: var(--border);">
          <td class="p-4 font-black uppercase">${medal} ${escapeHtml(name)}</td>
          <td class="p-4 font-black text-emerald-600">${Math.round(data.views).toLocaleString('ru-RU')}</td>
          <td class="p-4">${data.tasks}</td>
          <td class="p-4">${data.published}</td>
          <td class="p-4">${Math.round(avg).toLocaleString('ru-RU')}</td>
        </tr>
      `;
    }).join('');

  container.innerHTML = `
    <div class="mb-6">
      <h3 class="text-lg font-black uppercase">👥 Аналитика по команде</h3>
      <p class="mt-2 text-sm font-medium" style="color: var(--muted);">
        Охват распределяется: 50% ответственному, 50% между исполнителями.
      </p>
    </div>

    <div class="overflow-x-auto rounded-[1.5rem] border" style="border-color: var(--border);">
      <table class="w-full text-left text-[11px] font-bold">
        <thead style="background: var(--surface-2); color: var(--muted);">
          <tr>
            <th class="p-4">Человек</th>
            <th class="p-4">Охват</th>
            <th class="p-4">Задачи</th>
            <th class="p-4">Опубликовано</th>
            <th class="p-4">Средний охват</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `
            <tr>
              <td colspan="5" class="p-10 text-center text-[11px] font-black uppercase text-slate-400">
                Пока нет опубликованных задач
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}
    function renderAccounts() {
      $('#view-accounts').innerHTML = WORK_ACCOUNTS.map(acc => `
        <a class="app-surface flex items-center justify-between rounded-[2rem] p-6 transition hover:-translate-y-1" target="_blank" rel="noopener noreferrer" href="${escapeHtml(acc.url)}">
          <div class="flex items-center gap-5">
            <div class="rounded-[1.25rem] p-4 text-xl" style="background: var(--surface-2);">${getSocialIcon(acc.platform)}</div>
            <div>
              <h4 class="text-sm font-black uppercase">${escapeHtml(acc.name)}</h4>
              <p class="mt-1 text-[10px] font-bold uppercase text-slate-400">${escapeHtml(acc.handle)}</p>
            </div>
          </div>
          <div class="text-[10px] font-black uppercase" style="color: var(--primary);">Открыть ↗</div>
        </a>
      `).join('');
    }

    function renderSmartSidebar() { renderQuickFilterCounts(); }
    function renderTrash() {
      const list = $('#trashList');
      const isAdmin = state.currentRole === 'admin';
      if (!state.trash.length) {
        list.innerHTML = '<p class="py-10 text-center font-bold text-slate-400">ПУСТО</p>';
        return;
      }
      list.innerHTML = state.trash.map(task => `
        <div class="app-surface flex items-center justify-between rounded-2xl p-4">
          <div>
            <div class="text-[11px] font-black uppercase">${escapeHtml(task.title || 'Без названия')}</div>
            <div class="mt-1 text-[9px] font-bold uppercase text-rose-500">Удалил: ${escapeHtml(task.deleted_by || '???')}</div>
          </div>
          <div class="flex gap-2">
            ${isAdmin ? `
              <button class="restore-task rounded-lg bg-emerald-500 px-3 py-1.5 text-[9px] font-black uppercase text-white" data-task-id="${escapeHtml(task.id)}">Restore</button>
              <button class="delete-task-forever rounded-lg bg-rose-500 px-3 py-1.5 text-[9px] font-black uppercase text-white" data-task-id="${escapeHtml(task.id)}">Delete</button>
            ` : ''}
          </div>
        </div>
      `).join('');
    }

        async function renderLogs() {
      const { data, error } = await LogService.getLatest(30);

      if (error) {
        $('#logsContent').innerHTML = '<p class="text-sm text-rose-500">Не удалось загрузить логи</p>';
        return;
      }

      if (!data?.length) {
        $('#logsContent').innerHTML = '<p class="py-10 text-center text-[10px] font-bold uppercase text-slate-400">Действий пока нет</p>';
        return;
      }

      $('#logsContent').innerHTML = data.map(log => {
        const time = new Date(log.created_at).toLocaleString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: 'short'
        });

        const icon =
          log.action_type === 'create' ? '➕' :
          log.action_type === 'delete' ? '🗑️' :
          log.action_type === 'status_change' ? '🔄' :
          '📝';

        return `
          <div class="rounded-2xl border p-3" style="background: var(--surface-2); border-color: var(--border);">
            <div class="mb-1 flex items-start justify-between gap-2">
              <span class="text-[10px] font-black uppercase" style="color: var(--primary);">${escapeHtml(log.user_name || '')}</span>
              <span class="text-[9px] text-slate-400">${escapeHtml(time)}</span>
            </div>
            <div class="text-[11px] font-black uppercase">${icon} ${escapeHtml(log.task_title || '')}</div>
            <div class="mt-1 text-[10px] italic text-slate-500">${escapeHtml(log.details || '')}</div>
          </div>
        `;
      }).join('');
    }

        function renderMessages(messages) {
      const root = $('#chatMessages');
      if (!root) return;

      const myUid = sessionStorage.getItem('e_uid') || '';
      root.innerHTML = ChatUI.renderMessages(messages || [], myUid);
      ChatUI.scrollToBottom();
    }
