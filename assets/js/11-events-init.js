    function bindEvents() {
      $('#loginBtn').addEventListener('click', handleLogin);
      $('#loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
      $('#profileBtn').addEventListener('click', () => openModal('profileModal'));
      $('#logoutBtn').addEventListener('click', logout);
      ThemeDropdown.bind();
      $('#openCreateBtn').addEventListener('click', openCreateModal);
      $('#trashBtn').addEventListener('click', () => { closeModal('profileModal'); renderTrash(); openModal('trashModal'); });
      $('#logsBtn').addEventListener('click', () => { closeModal('profileModal'); toggleLogs(); });
      $('#closeLogsBtn').addEventListener('click', () => toggleLogs(false));
      $('#taskSearch').addEventListener('input', renderAll);
      $('#tagFilter').addEventListener('change', renderAll);
      $$('.quick-filter-btn').forEach(btn => btn.addEventListener('click', () => { state.quickFilter = btn.dataset.quickFilter || 'ALL'; renderAll(); }));
      $('#analyticsTableBtn').addEventListener('click', () => { state.analyticsSubView = 'table'; renderAll(); });
      $('#analyticsVisualsBtn').addEventListener('click', () => { state.analyticsSubView = 'visuals'; renderAll(); });
      $('#chartMonthsBtn').addEventListener('click', () => { state.chartMode = 'months'; $('#chartMonthsBtn').classList.add('tab-active'); $('#chartDaysBtn').classList.remove('tab-active'); $('#chartDaysBtn').classList.add('text-slate-400'); $('#chartMonthsBtn').classList.remove('text-slate-400'); renderCharts(); });
      $('#chartDaysBtn').addEventListener('click', () => { state.chartMode = 'days'; $('#chartDaysBtn').classList.add('tab-active'); $('#chartMonthsBtn').classList.remove('tab-active'); $('#chartMonthsBtn').classList.add('text-slate-400'); $('#chartDaysBtn').classList.remove('text-slate-400'); renderCharts(); });
      $('#calendarPrevBtn').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() - 1); renderCalendar(); });
      $('#calendarNextBtn').addEventListener('click', () => { state.viewDate.setMonth(state.viewDate.getMonth() + 1); renderCalendar(); });
      $('#calendarGrid').addEventListener('click', event => {
        const taskButton = event.target.closest('.calendar-item');
        if (taskButton) {
          const taskId = taskButton.dataset.taskId;
          if (taskId) openEditModal(taskId);
          return;
        }
        const dayCell = event.target.closest('.calendar-day[data-date]');
        if (!dayCell) return;
        openCreateModal(dayCell.dataset.date || '');
      });
      $('#analyticsPeopleBtn').addEventListener('click', () => {
  state.analyticsSubView = 'people';
  renderAll();
});
      $('#statsPrevBtn').addEventListener('click', () => { state.statsDate.setMonth(state.statsDate.getMonth() - 1); renderStats(); });
      $('#statsNextBtn').addEventListener('click', () => { state.statsDate.setMonth(state.statsDate.getMonth() + 1); renderStats(); });
      $('#statsPlatformFilter').addEventListener('change', renderStats);
      $('#btnUpdateAll').addEventListener('click', updateAllMonthStats);
      $('#exportStatsBtn').addEventListener('click', exportStatsToCSV);
      $('#saveAdminSettingsBtn').addEventListener('click', saveAdminSettings);
      $('#ideaForm').addEventListener('submit', saveCreateForm);
      $('#editForm').addEventListener('submit', saveEditForm);
      $('#sendChatBtn').addEventListener('click', sendChatMessage);
      $('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage();}
});

      $('#chatInput').addEventListener('input', e => {
        e.target.style.height = '24px';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
      });

      $$('[data-quick-message]').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = $('#chatInput');
          input.value = btn.dataset.quickMessage || '';
          input.focus();
          input.dispatchEvent(new Event('input'));
        });
      });
            $$('[data-template]').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = $('#chatInput');
          if (!input) return;

          input.value = btn.dataset.template || '';
          input.focus();
          input.dispatchEvent(new Event('input'));
        });
      });
      $('#toggleAllChannels').addEventListener('change', e => $$('input[name="chan"]', $('#createModal')).forEach(cb => cb.checked = e.target.checked));
      $('#title').addEventListener('input', () => setFieldError('title', $('#title').value.trim().length >= 4 ? '' : 'Нужно название хотя бы из 4 символов.'));
      $('#description').addEventListener('input', () => setFieldError('description', $('#description').value.trim().length >= 10 ? '' : 'Добавь короткое ТЗ: хотя бы 10 символов.'));
      $('#start_date_val').addEventListener('change', () => { if ($('#start_date_val').value) setFieldError('start_date_val', ''); });
      $('#date_val').addEventListener('change', () => { if ($('#date_val').value) setFieldError('date_val', ''); });
      document.addEventListener('change', event => {
        if (event.target.name === 'chan') setFieldError('channels', $$('input[name="chan"]:checked').length ? '' : 'Выбери хотя бы одну площадку.');
        if (event.target.name === 'exec') setFieldError('executors', $$('input[name="exec"]:checked').length ? '' : 'Назначь хотя бы одного исполнителя.');
      });
      $('#start_date_val').addEventListener('change', e => {
        $('#date_val').min = e.target.value;
        if ($('#date_val').value && $('#date_val').value < e.target.value) $('#date_val').value = e.target.value;
      });
      $('#edit_start_date').addEventListener('change', e => {
        $('#edit_date').min = e.target.value;
        if ($('#edit_date').value && $('#edit_date').value < e.target.value) $('#edit_date').value = e.target.value;
      });

      $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));

      document.addEventListener('click', async event => {
       const viewTab = event.target.closest('.view-tab');
if (viewTab) {
  state.currentView = viewTab.dataset.view;

  if (state.currentView === 'chat') {
    state.unreadChatCount = 0;
  }

  renderAll();
  return;
}

        const inlineTrigger = event.target.closest('.inline-edit-trigger');
        if (inlineTrigger) {
          event.stopPropagation();
          beginInlineEdit(inlineTrigger.dataset.taskId);
          return;
        }

        const saveInlineBtn = event.target.closest('.save-inline-edit');
        if (saveInlineBtn) {
          event.stopPropagation();
          saveInlineEdit(saveInlineBtn.dataset.taskId);
          return;
        }

        const cancelInlineBtn = event.target.closest('.cancel-inline-edit');
        if (cancelInlineBtn) {
          event.stopPropagation();
          cancelInlineEdit();
          return;
        }

        const openTask = event.target.closest('[data-task-id]');
        if (openTask?.classList.contains('task-card') || openTask?.classList.contains('open-task') || openTask?.classList.contains('calendar-item')) {
          if (state.inlineEditId && openTask.classList.contains('task-card')) return;
          openEditModal(openTask.dataset.taskId);
          return;
        }

        const resetFiltersBtn = event.target.closest('#resetFiltersBtn');
        if (resetFiltersBtn) { $('#taskSearch').value = ''; $('#tagFilter').value = 'ALL'; state.quickFilter = 'ALL'; renderAll(); return; }

        const trashTask = event.target.closest('.trash-task');
        if (trashTask) {
          event.stopPropagation();
          await moveToTrash(trashTask.dataset.taskId);
          return;
        }

        const restoreBtn = event.target.closest('.restore-task');
        if (restoreBtn) return restoreFromTrash(restoreBtn.dataset.taskId);

        const deleteForeverBtn = event.target.closest('.delete-task-forever');
        if (deleteForeverBtn) return finalDelete(deleteForeverBtn.dataset.taskId);

        const calendarFilter = event.target.closest('.calendar-filter');
        if (calendarFilter) {
          state.calendarChannel = calendarFilter.dataset.channel;
          renderCalendar();
          return;
        }
        const chatTaskSearchItem = event.target.closest('.send-chat-task-from-search');
        if (chatTaskSearchItem) {
          await sendTaskToChat(chatTaskSearchItem.dataset.taskId);
          return;
        }

        if (event.target.closest('#chatTaskSearchClear')) {
          clearChatTaskSearch();
          $('#chatTaskSearchInput')?.focus();
          return;
        }

        const chatTaskBubble = event.target.closest('.open-chat-task');
        if (chatTaskBubble) {
          openEditModal(chatTaskBubble.dataset.taskId);
          return;
        }
        const reactionBtn = event.target.closest('.toggle-reaction');
        if (reactionBtn) return toggleReaction(reactionBtn.dataset.messageId, reactionBtn.dataset.emoji);

        const deleteMessageBtn = event.target.closest('.delete-message');
        if (deleteMessageBtn) return deleteMessage(deleteMessageBtn.dataset.messageId);
      });


      document.addEventListener('input', event => {
        if (event.target.closest('#chatTaskSearchInput')) {
          renderChatTaskSearchResults(true);
          return;
        }

        const inlineField = event.target.closest('.inline-edit-input');
        if (!inlineField || !state.inlineDraft) return;
        state.inlineDraft[inlineField.dataset.inlineField] = inlineField.value;
      });

      document.addEventListener('focusin', event => {
        if (event.target.closest('#chatTaskSearchInput')) {
          renderChatTaskSearchResults(true);
        }
      });

      document.addEventListener('click', event => {
        if (!event.target.closest('#chatTaskSearchBox')) {
          $('#chatTaskSearchResults')?.classList.add('hidden');
        }
      });

      document.addEventListener('change', event => {
        const inlineField = event.target.closest('.inline-edit-input');
        if (inlineField && state.inlineDraft) {
          state.inlineDraft[inlineField.dataset.inlineField] = inlineField.value;
        }
        if (event.target.name === 'edit_chan') {
          const channels = $$('input[name="edit_chan"]:checked').map(cb => cb.value);
          $('#multiLinkContainer').innerHTML = channels.map(channel => `
            <div>
              <label class="mb-1 flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">${getSocialIcon(channel)} ${escapeHtml(channel)}</label>
              <input type="url" class="multi-link-input w-full rounded-xl border p-2 text-sm font-semibold outline-none" style="background: var(--surface); border-color: var(--border); color: var(--text);" data-platform="${escapeHtml(channel)}" />
            </div>
          `).join('');
        }
      });

            document.addEventListener('dragstart', event => {
  const card = event.target.closest('.focus-task-draggable');
  if (!card) return;

  event.dataTransfer.setData('text/plain', card.dataset.taskId);
  event.dataTransfer.setData('application/x-andromeda-task-id', card.dataset.taskId);
});
      const chatDropZone = $('#chatDropZone');

      if (chatDropZone) {
        chatDropZone.addEventListener('dragover', event => {
          event.preventDefault();
          chatDropZone.classList.add('drag-over');
        });

        chatDropZone.addEventListener('dragleave', () => {
          chatDropZone.classList.remove('drag-over');
        });

        chatDropZone.addEventListener('drop', async event => {
          event.preventDefault();
          chatDropZone.classList.remove('drag-over');

          const taskId =
            event.dataTransfer.getData('application/x-andromeda-task-id') ||
            event.dataTransfer.getData('text/plain');

          if (!taskId) return;

          await sendTaskToChat(taskId);

          if (state.currentView !== 'chat') {
            state.currentView = 'chat';
            renderAll();
          }
        });
      }
      $$('.kanban-col').forEach(col => {
        col.addEventListener('dragover', event => {
          event.preventDefault();
          col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', async event => {
          event.preventDefault();
          col.classList.remove('drag-over');
          const taskId = event.dataTransfer.getData('text/plain');
          const newStatus = col.dataset.kanban;
          const task = state.tasks.find(item => String(item.id) === String(taskId));
          if (!task || task.status === newStatus) return;
          const oldStatus = task.status;
                   const { error } = await TaskService.update(taskId, { status: newStatus });
          if (error) return notify('Не удалось изменить статус');

          TaskState.patchTask(taskId, { status: newStatus });
                if (state.currentView === 'list') renderCards();
      if (state.currentView === 'kanban') renderKanban();
      if (state.currentView === 'calendar') renderCalendar();
      renderMetaOnly();
          await logAction('status_change', task.title, `Канбан: ${oldStatus} → ${newStatus}`);
        });
      });
    }

    function initStaticUI() {
      populateSelect($('#loginUser'), USERS);
      populateSelect($('#work_type'), WORK_TYPES);
      populateSelect($('#edit_work_type'), WORK_TYPES);
      populateSelect($('#tag'), TAGS, x => x.toUpperCase());
      populateSelect($('#edit_tag'), TAGS, x => x.toUpperCase());
      populateSelect($('#edit_status'), Object.keys(STATUS_MAP), key => STATUS_MAP[key].toUpperCase());
      renderChecklist('channelList', 'chan', CHANNELS);
      renderChecklist('editChannelList', 'edit_chan', CHANNELS);
      renderExecutors('executorList', 'exec');
      renderExecutors('editExecList', 'edit_exec');
      buildMainTabs();
      renderCalendarTabs();
      renderAccounts();
    }

    initStaticUI();
    bindEvents();
    checkAuth();
