    const ChatUI = {
      commonEmojis: ['👍', '❤️', '🔥', '✅', '🚀'],
      taskTokenRegex: /\[\[task:(.+?)\]\]/g,

      getTaskToken(taskId) {
        return `[[task:${taskId}]]`;
      },

      isTaskTokenMessage(messageText = '') {
        return ChatUI.taskTokenRegex.test(String(messageText || ''));
      },

      getTaskFromToken(messageText = '') {
        ChatUI.taskTokenRegex.lastIndex = 0;
        const match = ChatUI.taskTokenRegex.exec(String(messageText || ''));
        if (!match) return null;

        const taskId = match[1];
        return state.tasks.find(task => String(task.id) === String(taskId))
          || state.trash.find(task => String(task.id) === String(taskId))
          || null;
      },

      renderTaskBubbleFromMessage(messageText = '') {
        const task = ChatUI.getTaskFromToken(messageText);

        if (!task) {
          return `
            <div class="chat-task-bubble">
              <div class="chat-task-bubble-title">Задача не найдена</div>
              <div class="chat-task-bubble-meta">Возможно, она удалена или недоступна</div>
            </div>
          `;
        }

        const deadline = getDeadlineMeta(task.date, task.status);
        const channels = (task.channels || []).slice(0, 3).join(', ') || 'без площадок';

        return `
          <button type="button" class="chat-task-bubble open-chat-task" data-task-id="${escapeHtml(task.id)}">
            <div class="chat-task-bubble-title">📌 ${escapeHtml(task.title || 'Без названия')}</div>
            <div class="chat-task-bubble-meta">
              ${escapeHtml(STATUS_MAP[task.status] || 'Идея')} · ${escapeHtml(deadline.shortLabel)} · ${escapeHtml(channels)}
            </div>
          </button>
        `;
      },
      renderEmptyState() {
        return `
          <div class="chat-empty">
            <div>
              <div class="mb-3 text-3xl">💬</div>
              <div class="text-sm font-black uppercase" style="color: var(--text);">Пока нет сообщений</div>
              <div class="mx-auto mt-3 max-w-md normal-case text-sm font-medium" style="color: var(--muted);">
                Начни с короткого статуса, запроса фидбека или сообщения о проблеме. Так чат станет рабочей лентой команды, а не просто перепиской.
              </div>
            </div>
          </div>
        `;
      },

      renderReactionButtons(reactions = {}, myUid = '') {
        return Object.entries(reactions).map(([emoji, users]) => {
          if (!Array.isArray(users) || !users.length) return '';
          const active = users.includes(myUid);

          return `
            <button class="toggle-reaction chat-reaction ${active ? 'active' : ''}" data-message-id="${escapeHtml(emoji && emoji.length ? '' : '')}${''}" data-emoji="${escapeHtml(emoji)}">
              ${emoji} <span>${users.length}</span>
            </button>
          `;
        }).join('');
      },

      renderReactionButtonsSafe(messageId, reactions = {}, myUid = '') {
        return Object.entries(reactions).map(([emoji, users]) => {
          if (!Array.isArray(users) || !users.length) return '';
          const active = users.includes(myUid);

          return `
            <button class="toggle-reaction chat-reaction ${active ? 'active' : ''}" data-message-id="${escapeHtml(messageId)}" data-emoji="${escapeHtml(emoji)}">
              ${emoji} <span>${users.length}</span>
            </button>
          `;
        }).join('');
      },

      renderEmojiPicker(messageId) {
        return ChatUI.commonEmojis.map(emoji => `
          <button class="toggle-reaction chat-emoji-btn" data-message-id="${escapeHtml(messageId)}" data-emoji="${escapeHtml(emoji)}">${emoji}</button>
        `).join('');
      },

      renderMessage(message, context = {}) {
        const myUid = context.myUid || '';
        const dateObj = new Date(message.created_at);
        const dayLabel = dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
        const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isMe = message.sender_uid === myUid;
        const reactions = message.reactions || {};
        const divider = context.showDivider ? `<div class="chat-day-divider">${escapeHtml(dayLabel)}</div>` : '';
        const reactionsHtml = ChatUI.renderReactionButtonsSafe(message.id, reactions, myUid);
        const picker = ChatUI.renderEmojiPicker(message.id);
        const isTaskMessage = ChatUI.isTaskTokenMessage(message.message || '');
        const messageContent = isTaskMessage
  ? ChatUI.renderTaskBubbleFromMessage(message.message || '')
  : `<div class="chat-text">${escapeHtml(message.message || '')}</div>`;
        return `
          ${divider}
          <div class="chat-row ${isMe ? 'me' : 'other'}">
            <div class="chat-meta">
              <span class="chat-author">${escapeHtml(message.sender_name || '')}</span>
              <span class="chat-time">${escapeHtml(time)}</span>
            </div>

            <div class="chat-bubble ${isMe ? 'me' : 'other'}">
              <div class="chat-emoji-bar">${picker}</div>
              ${messageContent}

              ${reactionsHtml ? `<div class="chat-actions">${reactionsHtml}</div>` : ''}

              ${isMe ? `
                <button class="delete-message chat-delete-btn" data-message-id="${escapeHtml(message.id)}" title="Удалить сообщение">✕</button>
              ` : ''}
            </div>
          </div>
        `;
      },

      renderMessages(messages = [], myUid = '') {
        if (!messages.length) return ChatUI.renderEmptyState();

        let lastDayLabel = '';

        return messages.map(message => {
          const dateObj = new Date(message.created_at);
          const dayLabel = dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
          const showDivider = dayLabel !== lastDayLabel;
          lastDayLabel = dayLabel;

          return ChatUI.renderMessage(message, { myUid, showDivider });
        }).join('');
      },

      scrollToBottom() {
        const root = $('#chatMessages');
        if (!root) return;
        root.scrollTop = root.scrollHeight;
      },

      resetComposer() {
        const input = $('#chatInput');
        if (!input) return;
        input.value = '';
        input.style.height = '24px';
      }
    };
