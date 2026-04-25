    const SidebarUI = {
      getTodayMeta() {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return { today, todayStr, dayStart };
      },

      getData() {
        const { todayStr, dayStart } = SidebarUI.getTodayMeta();
        const me = state.currentUser;

        const active = state.tasks.filter(task => task.status !== 'published');
        const todayTasks = active.filter(task => task.date === todayStr);
        const overdue = active.filter(task => {
          const d = parseLocalDate(task.date);
          return d && d < dayStart && task.status !== 'published';
        });
        const mine = active.filter(task => ((task.executors || []).includes(me) || task.responsible === me));
        const unassigned = active.filter(task => !(task.executors || []).length);

        return { active, todayTasks, overdue, mine, unassigned, dayStart };
      },

      renderTopItems(data) {
        const items = [
          {
            label: 'На сегодня',
            value: data.todayTasks.length,
            note: data.todayTasks.length ? 'есть задачи с дедлайном сегодня' : 'сегодня дедлайнов нет'
          },
          {
            label: 'Просрочено',
            value: data.overdue.length,
            note: data.overdue.length ? 'нужно срочно разобрать' : 'просрочки нет'
          },
          {
            label: 'На мне',
            value: data.mine.length,
            note: data.mine.length ? 'задачи в личном фокусе' : 'личных задач нет'
          }
        ];

        return `
          <div class="grid grid-cols-3 gap-2">
            ${items.map(item => `
              <div class="sidebar-insight rounded-2xl p-3">
                <div class="text-[9px] font-black uppercase text-slate-400">${item.label}</div>
                <div class="mt-1 text-xl font-black text-white">${item.value}</div>
                <div class="mt-1 text-[10px] font-medium text-slate-400">${item.note}</div>
              </div>
            `).join('')}
          </div>
        `;
      },

      renderPriority(data) {
        const priority = [...data.todayTasks, ...data.overdue.filter(task => !data.todayTasks.some(todayTask => String(todayTask.id) === String(task.id)))]
          .slice(0, 4)
          .map(task => {
            const due = formatShortDate(task.date);
            const d = parseLocalDate(task.date);
            const overdueTask = d && d < data.dayStart;

            return `
              <button class="open-task sidebar-insight ${overdueTask ? 'sidebar-task-overdue' : 'sidebar-task-urgent'} w-full rounded-2xl p-3 text-left" data-task-id="${escapeHtml(task.id)}">
                <div class="mb-1 flex items-center justify-between gap-2">
                  <span class="text-[9px] font-black uppercase ${overdueTask ? 'text-rose-300' : 'text-amber-300'}">${overdueTask ? 'Просрочено' : 'Сегодня'}</span>
                  <span class="text-[10px] font-bold text-slate-300">${escapeHtml(due)}</span>
                </div>
                <div class="text-[11px] font-black uppercase leading-tight text-white">${escapeHtml(task.title || 'Без названия')}</div>
              </button>
            `;
          }).join('');

        return `
          <div class="sidebar-insight rounded-2xl p-4">
            <div class="mb-3 flex items-center justify-between gap-2">
              <div>
                <div class="text-[10px] font-black uppercase text-amber-300">Приоритетные карточки</div>
                <div class="mt-1 text-[11px] font-medium text-slate-400">То, что лучше не откладывать.</div>
              </div>
              <div class="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black text-white">${data.todayTasks.length + data.overdue.length}</div>
            </div>
            <div class="space-y-2">
              ${priority || '<div class="rounded-2xl bg-white/5 p-3 text-[11px] font-medium text-slate-400">Срочных карточек сейчас нет.</div>'}
            </div>
          </div>
        `;
      },

      renderMyTasks(data) {
        const myTasksHtml = data.mine.length
          ? data.mine.slice(0, 5).map(task => `
              <button   class="open-task focus-task-draggable w-full rounded-2xl bg-slate-800 p-4 text-left transition hover:bg-slate-700"   data-task-id="${escapeHtml(task.id)}"   draggable="true" >
                <div class="mb-1 flex items-center justify-between gap-2">
                  <span class="text-[8px] font-black uppercase text-blue-400">${escapeHtml(task.work_type || 'Пост')}</span>
                  <span class="text-[8px] font-black uppercase text-slate-500">${escapeHtml(STATUS_MAP[task.status] || 'Идея')}</span>
                </div>
                <div class="text-[10px] font-black uppercase leading-tight text-white">${escapeHtml(task.title || 'Без названия')}</div>
              </button>
            `).join('')
          : '<div class="rounded-2xl bg-white/5 p-4 text-center text-[10px] font-black uppercase text-slate-500">Личных задач сейчас нет</div>';

        return `
          <div class="sidebar-insight rounded-2xl p-4">
            <div class="mb-3 flex items-center justify-between gap-2">
              <div>
                <div class="text-[10px] font-black uppercase text-blue-300">Мои задачи в работе</div>
                <div class="mt-1 text-[11px] font-medium text-slate-400">Быстрый доступ к личному фокусу.</div>
              </div>
              <div class="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black text-white">${data.mine.length}</div>
            </div>
            <div class="space-y-2">${myTasksHtml}</div>
          </div>
        `;
      },

      renderUnassigned(data) {
        return `
          <div class="sidebar-insight rounded-2xl p-4 text-[11px] font-medium text-slate-300">
            Без исполнителя: <span class="font-black text-white">${data.unassigned.length}</span>
          </div>
        `;
      },

      render() {
        const root = $('#focusSidebar');
        if (!root) return;

        const data = SidebarUI.getData();

        root.innerHTML = `
          ${SidebarUI.renderTopItems(data)}
          ${SidebarUI.renderPriority(data)}
          ${SidebarUI.renderMyTasks(data)}
          ${SidebarUI.renderUnassigned(data)}
        `;
      }
    };
