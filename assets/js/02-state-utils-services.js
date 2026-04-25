    const AppState = {
      tasks: [],
      trash: [],
      currentView: 'list',
      quickFilter: 'ALL',
      analyticsSubView: 'table',
      chartMode: 'months',
      calendarChannel: 'ALL',
      viewDate: new Date(),
      statsDate: new Date(),
      createPrefillDate: '',
      chart: null,
      currentUser: null,
      currentRole: null,
      isLoadingTasks: false,
      inlineEditId: null,
      inlineDraft: null,
      chatChannel: null,
      unreadChatCount: 0,
      lastSeenChatMessageId: null
    };

    const DOM = {
      get(selector, root = document) {
        return root.querySelector(selector);
      },
      getAll(selector, root = document) {
        return Array.from(root.querySelectorAll(selector));
      }
    };

    const Utils = {
      escapeHtml(value = '') {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },

      parseLocalDate(dateStr) {
        if (!dateStr) return null;
        const [y, m, d] = String(dateStr).split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
      },

      formatShortDate(dateStr) {
        const d = Utils.parseLocalDate(dateStr);
        return d ? d.toLocaleDateString('ru-RU') : '—';
      },

      getDeadlineMeta(dateStr, status = '') {
        const d = Utils.parseLocalDate(dateStr);
        if (!d) {
          return {
            className: 'deadline-normal',
            label: 'Без дедлайна',
            shortLabel: 'Без даты'
          };
        }

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        if (status !== 'published' && d < todayStart) {
          return {
            className: 'deadline-overdue',
            label: 'Просрочено',
            shortLabel: 'Просрочено'
          };
        }

        if (d.getTime() === todayStart.getTime()) {
          return {
            className: 'deadline-today',
            label: 'Сегодня',
            shortLabel: 'Сегодня'
          };
        }

        if (d.getTime() === tomorrowStart.getTime()) {
          return {
            className: 'deadline-tomorrow',
            label: 'Завтра',
            shortLabel: 'Завтра'
          };
        }

        return {
          className: 'deadline-normal',
          label: Utils.formatShortDate(dateStr),
          shortLabel: Utils.formatShortDate(dateStr)
        };
      },

      getWorkflowOrder() {
        return ['idea', 'script', 'production', 'editing', 'review', 'scheduled', 'published'];
      },

      getProgress(status) {
        const order = Utils.getWorkflowOrder();
        const index = order.indexOf(status);
        if (index === -1) return 0;
        return ((index + 1) / order.length) * 100;
      },

      getNextStepHint(status) {
        const hints = {
          idea: 'Следующий шаг: создать сценарий',
          script: 'Следующий шаг: передать в продакшн',
          production: 'Следующий шаг: отправить на монтаж',
          editing: 'Следующий шаг: отправить на проверку',
          review: 'Следующий шаг: запланировать публикацию',
          scheduled: 'Следующий шаг: дождаться публикации',
          published: 'Следующий шаг: проанализировать результат'
        };
        return hints[status] || 'Следующий шаг не определён';
      },

      isSameMonthYear(date, sample) {
        return date && sample && date.getMonth() === sample.getMonth() && date.getFullYear() === sample.getFullYear();
      }
    };

    const Services = {
      db: supabase.createClient(AppConfig.supabase.url, AppConfig.supabase.key),

      tables: {
        tasks: 'tasks',
        profiles: 'profiles',
        config: 'config',
        activityLogs: 'activity_logs',
        teamChat: 'team_chat'
      }
    };

    const db = Services.db;

    const $ = DOM.get;
    const $$ = DOM.getAll;

    const USERS = AppConfig.users;
    const DEPARTMENTS = AppConfig.departments;
    const CHANNELS = AppConfig.channels;
    const TG_LIST = AppConfig.telegramChannels;
    const WORK_TYPES = AppConfig.workTypes;
    const TAGS = AppConfig.tags;
    const STATUS_MAP = AppConfig.statusMap;
    const VIEWS = AppConfig.views;
    const WORK_ACCOUNTS = AppConfig.workAccounts;
    const state = AppState;

    const escapeHtml = Utils.escapeHtml;
    const parseLocalDate = Utils.parseLocalDate;
    const formatShortDate = Utils.formatShortDate;
    const getDeadlineMeta = Utils.getDeadlineMeta;
    const getWorkflowOrder = Utils.getWorkflowOrder;
    const getProgress = Utils.getProgress;
    const getNextStepHint = Utils.getNextStepHint;
    const isSameMonthYear = Utils.isSameMonthYear;
