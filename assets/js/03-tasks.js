        const TaskHelpers = {
      normalizeLinks(links = {}) {
        return Object.fromEntries(
          Object.entries(links).map(([key, value]) => [key, String(value || '').trim()])
        );
      },

      collectCreatePayload() {
        const startDate = $('#start_date_val').value;
        const endDate = $('#date_val').value;

        return {
          id: Date.now(),
          title: $('#title').value.trim(),
          work_type: $('#work_type').value,
          tag: $('#tag').value,
          description: $('#description').value.trim(),
          channels: $$('input[name="chan"]:checked').map(cb => cb.value),
          executors: $$('input[name="exec"]:checked').map(cb => cb.value),
          responsible: state.currentUser,
          start_date: startDate || new Date().toISOString().split('T')[0],
          date: endDate || new Date().toISOString().split('T')[0],
          status: 'idea',
          links: {},
          play_counts: {},
          play_count: 0,
          is_deleted: false
        };
      },

      collectEditPayload() {
        const links = {};
        $$('.multi-link-input').forEach(input => {
          links[input.dataset.platform] = input.value.trim();
        });

        return {
          title: $('#edit_title').value.trim(),
          work_type: $('#edit_work_type').value,
          tag: $('#edit_tag').value,
          description: $('#edit_description').value.trim(),
          status: $('#edit_status').value,
          start_date: $('#edit_start_date').value || null,
          date: $('#edit_date').value || null,
          channels: $$('input[name="edit_chan"]:checked').map(cb => cb.value),
          executors: $$('input[name="edit_exec"]:checked').map(cb => cb.value),
          links: TaskHelpers.normalizeLinks(links)
        };
      },

      collectInlinePayload(draft = {}) {
        return {
          title: String(draft.title || '').trim(),
          status: draft.status || 'idea',
          date: draft.date,
          responsible: String(draft.responsible || '').trim() || state.currentUser,
          work_type: draft.work_type || 'Пост'
        };
      }
    };

    const TaskService = {
      async getAllActive() {
        return db.from(Services.tables.tasks).select('*').eq('is_deleted', false);
      },

      async getAllTrash() {
        return db.from(Services.tables.tasks).select('*').eq('is_deleted', true);
      },

      async create(task) {
  return db.from(Services.tables.tasks).insert([task]).select().single();
},

      async update(id, payload) {
  return db.from(Services.tables.tasks).update(payload).eq('id', id).select().single();
},

      async moveToTrash(id, deletedBy) {
        return db.from(Services.tables.tasks).update({
          is_deleted: true,
          deleted_by: deletedBy
        }).eq('id', id);
      },

      async restore(id) {
        return db.from(Services.tables.tasks).update({
          is_deleted: false,
          deleted_by: null
        }).eq('id', id);
      },

      async removeForever(id) {
        return db.from(Services.tables.tasks).delete().eq('id', id);
      }
    };

    const TaskState = {
      setTasks(tasks = []) {
        state.tasks = Array.isArray(tasks) ? tasks : [];
      },

      setTrash(trash = []) {
        state.trash = Array.isArray(trash) ? trash : [];
      },

      findTaskIndex(id) {
        return state.tasks.findIndex(task => String(task.id) === String(id));
      },

      findTrashIndex(id) {
        return state.trash.findIndex(task => String(task.id) === String(id));
      },

      patchTask(id, patch = {}) {
        const index = TaskState.findTaskIndex(id);
        if (index === -1) return null;

        state.tasks[index] = {
          ...state.tasks[index],
          ...patch
        };

        return state.tasks[index];
      },

      removeTask(id) {
        const index = TaskState.findTaskIndex(id);
        if (index === -1) return null;

        const [removed] = state.tasks.splice(index, 1);
        return removed || null;
      },

      addTask(task) {
        if (!task) return;
        state.tasks.unshift(task);
      },

      addToTrash(task) {
        if (!task) return;
        state.trash.unshift(task);
      },

      removeFromTrash(id) {
        const index = TaskState.findTrashIndex(id);
        if (index === -1) return null;

        const [removed] = state.trash.splice(index, 1);
        return removed || null;
      },

      restoreTask(task) {
        if (!task) return;
        state.tasks.unshift(task);
      }
    };
    
        const TaskUI = {
      getTagClass(tag) {
        if (tag === 'ФРК') return 'bg-amber-100 text-amber-700';
        if (tag === 'УТП') return 'bg-indigo-100 text-indigo-700';
        return 'bg-slate-100 text-slate-600';
      },

      renderChannels(channels = [], limit = null) {
        const list = limit ? channels.slice(0, limit) : channels;
        return list.map(ch => `
          <span class="rounded bg-slate-900 px-2 py-0.5 text-[8px] font-black uppercase text-white">${escapeHtml(ch)}</span>
        `).join('');
      },

      renderInlineEdit(task, draft = {}) {
        return `
          <div class="inline-edit-shell">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div class="md:col-span-2">
                <label>Название</label>
                <input type="text" class="inline-edit-input" data-inline-field="title" data-task-id="${escapeHtml(task.id)}" value="${escapeHtml(draft.title || '')}" />
              </div>
              <div>
                <label>Статус</label>
                <select class="inline-edit-input" data-inline-field="status" data-task-id="${escapeHtml(task.id)}">
                  ${Object.entries(STATUS_MAP).map(([value, label]) => `
                    <option value="${escapeHtml(value)}" ${String(draft.status || '') === value ? 'selected' : ''}>${escapeHtml(label)}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label>Тип</label>
                <select class="inline-edit-input" data-inline-field="work_type" data-task-id="${escapeHtml(task.id)}">
                  ${WORK_TYPES.map(value => `
                    <option value="${escapeHtml(value)}" ${String(draft.work_type || '') === value ? 'selected' : ''}>${escapeHtml(value)}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label>Дедлайн</label>
                <input type="date" class="inline-edit-input" data-inline-field="date" data-task-id="${escapeHtml(task.id)}" value="${escapeHtml(draft.date || '')}" />
              </div>
              <div>
                <label>Ответственный</label>
                <input type="text" class="inline-edit-input" data-inline-field="responsible" data-task-id="${escapeHtml(task.id)}" value="${escapeHtml(draft.responsible || '')}" />
              </div>
            </div>
            <div class="inline-edit-actions">
              <button type="button" class="primary save-inline-edit" data-task-id="${escapeHtml(task.id)}">Сохранить</button>
              <button type="button" class="secondary cancel-inline-edit">Отмена</button>
            </div>
          </div>
        `;
      },

      renderListCard(task, options = {}) {
        const isEditing = options.isEditing || false;
        const draft = options.draft || {};
        const tagClass = TaskUI.getTagClass(task.tag);
        const channels = TaskUI.renderChannels(task.channels || []);
        const responsible = escapeHtml(task.responsible || 'Не назначен');
        const title = escapeHtml(task.title || 'Без названия');
        const views = Number(task.play_count || 0).toLocaleString('ru-RU');
        const deadlineMeta = getDeadlineMeta(task.date, task.status);
        const inlineEditHtml = isEditing ? TaskUI.renderInlineEdit(task, draft) : '';

        return `
          <article class="task-card ${isEditing ? 'is-editing' : ''} status-${escapeHtml(task.status || 'idea')} app-surface rounded-[2rem] border-2 border-transparent p-6 transition hover:-translate-y-1 hover:border-blue-200" data-task-id="${escapeHtml(task.id)}">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div class="flex max-w-[80%] flex-wrap gap-1">${channels}</div>
              <div class="flex items-center gap-1">
                <button type="button" class="inline-edit-trigger rounded-full p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600" data-task-id="${escapeHtml(task.id)}" title="Быстрое редактирование">✎</button>
                <button type="button" class="trash-task rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500" data-task-id="${escapeHtml(task.id)}" title="В корзину">✕</button>
              </div>
            </div>

            <div class="mb-2 flex items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${tagClass}">${escapeHtml(task.tag || 'прочее')}</span>
              <span class="text-[9px] font-black uppercase" style="color: var(--primary);">${escapeHtml(task.work_type || 'Пост')}</span>
              <span class="rounded-full px-2 py-0.5 text-[8px] font-black uppercase soft-pill">${escapeHtml(STATUS_MAP[task.status] || 'Идея')}</span>
            </div>

            <h3 class="mb-3 text-[15px] font-black uppercase leading-tight">${title}</h3>

            <div class="mb-4">
              <div class="progress-track">
                <div class="progress-fill" style="width:${Math.round(getProgress(task.status))}%"></div>
              </div>
              <div class="mt-1 flex items-center justify-between text-[10px] font-bold" style="color: var(--muted);">
                <span>Прогресс: ${Math.round(getProgress(task.status))}%</span>
                <span>${escapeHtml(STATUS_MAP[task.status] || 'Идея')}</span>
              </div>
              <div class="stage-hint">${escapeHtml(getNextStepHint(task.status))}</div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-[10px] font-bold" style="color: var(--muted);">
              <div class="rounded-xl px-3 py-2 soft-pill">👤 ${responsible}</div>
              <div class="deadline-chip ${deadlineMeta.className}">📅 ${escapeHtml(deadlineMeta.label)}</div>
            </div>

            <div class="mt-4 flex items-center justify-between border-t pt-4 text-[10px] font-bold" style="border-color: var(--border); color: var(--muted);">
              <span>Старт: ${escapeHtml(formatShortDate(task.start_date))}</span>
              <span class="rounded-lg bg-emerald-50 px-2 py-1 font-black text-emerald-600">👁️ ${views}</span>
            </div>

            ${inlineEditHtml}
          </article>
        `;
      },

      renderKanbanCard(task) {
        const responsible = escapeHtml((task.responsible || 'Не назначен').split(' ')[0]);
        const deadlineMeta = getDeadlineMeta(task.date, task.status);
        const progress = Math.round(getProgress(task.status));

        return `
          <div class="kanban-card status-${escapeHtml(task.status || 'idea')} mb-3 cursor-grab rounded-2xl border p-4 shadow-sm active:cursor-grabbing" draggable="true" data-task-id="${escapeHtml(task.id)}" style="border-color: var(--border); color: var(--text); background: var(--surface);">
            <div class="mb-2 flex flex-wrap gap-1">
              ${TaskUI.renderChannels(task.channels || [], 3)}
            </div>

            <div class="mb-2 text-[9px] font-black uppercase" style="color: var(--primary);">${escapeHtml(STATUS_MAP[task.status] || 'Идея')}</div>

            <h4 class="mb-3 text-[12px] font-black uppercase leading-tight">${escapeHtml(task.title || 'Без названия')}</h4>

            <div class="mb-3">
              <div class="progress-track">
                <div class="progress-fill" style="width:${progress}%"></div>
              </div>
              <div class="mt-1 text-[9px] font-bold" style="color: var(--muted);">Прогресс: ${progress}%</div>
            </div>

            <div class="text-[9px] font-black uppercase stage-hint">${escapeHtml(getNextStepHint(task.status))}</div>

            <div class="mt-3 flex items-center justify-between border-t pt-2 text-[9px] font-bold" style="border-color: var(--border); color: var(--muted);">
              <span>👤 ${responsible}</span>
              <span class="deadline-chip ${deadlineMeta.className}" style="padding:6px 8px; font-size:9px;">
                📅 ${escapeHtml(deadlineMeta.shortLabel)}
              </span>
            </div>
          </div>
        `;
      }
    };
        const ChatService = {
      async fetchMessages(limit = 50) {
        return db
          .from(Services.tables.teamChat)
          .select('*')
          .order('created_at', { ascending: true })
          .limit(limit);
      },

      async sendMessage(payload) {
        return db.from(Services.tables.teamChat).insert([payload]);
      },

      async deleteMessage(messageId) {
        return db.from(Services.tables.teamChat).delete().eq('id', messageId);
      },

      async getReactions(messageId) {
        return db.from(Services.tables.teamChat).select('reactions').eq('id', messageId).single();
      },

      async updateReactions(messageId, reactions) {
        return db.from(Services.tables.teamChat).update({ reactions }).eq('id', messageId);
      },

      subscribe(onChange) {
        return db
          .channel('room1')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: Services.tables.teamChat },
            onChange
          )
          .subscribe();
      }
    };

        const ConfigService = {
      async getAll() {
        return db.from(Services.tables.config).select('*');
      },

      async saveApiKeys(ytKey, apifyToken) {
        const [ytRes, apifyRes] = await Promise.all([
          db.from(Services.tables.config).upsert({ id: 'yt_key', value: ytKey }),
          db.from(Services.tables.config).upsert({ id: 'apify_token', value: apifyToken })
        ]);

        return {
          error: ytRes.error || apifyRes.error
        };
      },

      applyToLocalStorage(rows = []) {
        rows.forEach(row => localStorage.setItem(row.id, row.value));

        if ($('#ytApiKey')) $('#ytApiKey').value = localStorage.getItem('yt_key') || '';
        if ($('#apifyToken')) $('#apifyToken').value = localStorage.getItem('apify_token') || '';
      }
    };

    const LogService = {
      async create(actionType, taskTitle, details = '') {
        return db.from(Services.tables.activityLogs).insert([{
          user_name: state.currentUser,
          action_type: actionType,
          task_title: taskTitle,
          details
        }]);
      },

      async getLatest(limit = 30) {
        return db
          .from(Services.tables.activityLogs)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
      }
    };

    const AuthService = {
      sessionKeys: {
        active: 'e_active',
        uid: 'e_uid',
        name: 'e_name',
        role: 'e_role'
      },

      async login(username, password) {
        return db
          .from(Services.tables.profiles)
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .single();
      },

      saveSession(profile) {
        sessionStorage.setItem(AuthService.sessionKeys.active, 'true');
        sessionStorage.setItem(AuthService.sessionKeys.uid, profile.username);
        sessionStorage.setItem(AuthService.sessionKeys.name, profile.display_name);
        sessionStorage.setItem(AuthService.sessionKeys.role, profile.role);
      },

      clearSession() {
        sessionStorage.clear();
      },

      isActive() {
        return sessionStorage.getItem(AuthService.sessionKeys.active) === 'true';
      },

      getCurrentUser() {
        return {
          uid: sessionStorage.getItem(AuthService.sessionKeys.uid),
          name: sessionStorage.getItem(AuthService.sessionKeys.name),
          role: sessionStorage.getItem(AuthService.sessionKeys.role)
        };
      }
    };
