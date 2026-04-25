    const CalendarUI = {
      renderTabs() {
        const container = $('#calendarTabs');
        if (!container) return;

        const buttons = ['ALL', ...CHANNELS].map(channel => {
          const isActive = state.calendarChannel === channel;
          const label = channel === 'ALL' ? 'Общий' : channel;

          return `
            <button
              class="calendar-filter rounded-xl border px-3 py-2 text-[10px] font-black uppercase ${isActive ? 'tab-active' : ''}"
              data-channel="${escapeHtml(channel)}"
              style="border-color: var(--border); background: ${isActive ? '' : 'var(--surface)'}; color: ${isActive ? '' : 'var(--muted)'};"
            >
              ${escapeHtml(label)}
            </button>
          `;
        });

        container.innerHTML = buttons.join('');
      },

      getMonthMeta(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const shift = (firstDay.getDay() || 7) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        return { year, month, shift, daysInMonth };
      },

      getTasksForDate(dateStr) {
        return state.tasks.filter(task => {
          const channelMatch =
            state.calendarChannel === 'ALL' ||
            (task.channels || []).includes(state.calendarChannel);

          return channelMatch && (task.start_date === dateStr || task.date === dateStr);
        });
      },

      renderTaskItem(task, dateStr) {
        const isStart = task.start_date === dateStr;
        const cls = isStart
          ? 'border border-dashed opacity-70 text-slate-600'
          : `status-${escapeHtml(task.status || 'idea')}`;

        return `
          <button class="calendar-item ${cls} w-full text-left" data-task-id="${escapeHtml(task.id)}">
            ${isStart ? '🚀' : '🏁'} ${escapeHtml(task.title || 'Без названия')}
          </button>
        `;
      },

      renderDay(dateStr, day) {
        const items = CalendarUI.getTasksForDate(dateStr);
        const itemsHtml = items.map(task => CalendarUI.renderTaskItem(task, dateStr)).join('');

        return `
          <div class="calendar-day cursor-pointer ${dateStr === state.createPrefillDate ? 'create-target' : ''}" data-date="${dateStr}">
            <div class="mb-1 text-[10px] font-black text-slate-400">${day}</div>
            ${itemsHtml}
          </div>
        `;
      },

      renderGrid() {
        const grid = $('#calendarGrid');
        const label = $('#calendarMonthLabel');
        if (!grid || !label) return;

        const { year, month, shift, daysInMonth } = CalendarUI.getMonthMeta(state.viewDate);

        label.textContent = new Intl.DateTimeFormat('ru-RU', {
          month: 'long',
          year: 'numeric'
        }).format(state.viewDate);

        let html = '';

        for (let i = 0; i < shift; i++) {
          html += `<div class="calendar-day opacity-40" style="background: var(--surface-2);"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          html += CalendarUI.renderDay(dateStr, day);
        }

        grid.innerHTML = html;
      },

      render() {
        CalendarUI.renderTabs();
        CalendarUI.renderGrid();
      }
    };
