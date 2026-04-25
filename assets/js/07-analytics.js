    const AnalyticsUI = {
      getPublishedTasksForMonth() {
        const filter = $('#statsPlatformFilter')?.value || 'ALL';

        return state.tasks
          .filter(task => {
            const date = parseLocalDate(task.date);
            const dateMatch = date && isSameMonthYear(date, state.statsDate);

            if (!dateMatch || task.status !== 'published') return false;
            if (filter === 'ALL') return true;
            if (filter === 'Telegram') return TG_LIST.some(tg => task.links?.[tg]);

            return Boolean(task.links?.[filter]);
          })
          .sort((a, b) => {
            const dateA = parseLocalDate(a.date)?.getTime() || 0;
            const dateB = parseLocalDate(b.date)?.getTime() || 0;
            return dateB - dateA;
          });
      },

      getTaskViews(task) {
        const filter = $('#statsPlatformFilter')?.value || 'ALL';

        if (filter === 'ALL') {
          return Number(task.play_count || 0);
        }

        if (filter === 'Telegram') {
          return TG_LIST.reduce((sum, tg) => sum + Number(task.play_counts?.[tg] || 0), 0);
        }

        return Number(task.play_counts?.[filter] || 0);
      },

      renderTaskLinks(task) {
        const filter = $('#statsPlatformFilter')?.value || 'ALL';

        if (filter === 'ALL') {
          return Object.entries(task.links || {})
            .map(([platform, url]) => url
              ? `<a target="_blank" rel="noopener noreferrer" class="mx-1" href="${escapeHtml(url)}">${getSocialIcon(platform)}</a>`
              : ''
            )
            .join('');
        }

        if (filter === 'Telegram') {
          return TG_LIST
            .map(tg => task.links?.[tg]
              ? `<a target="_blank" rel="noopener noreferrer" class="mx-1" href="${escapeHtml(task.links[tg])}">${getSocialIcon(tg)}</a>`
              : ''
            )
            .join('');
        }

        return task.links?.[filter]
          ? `<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(task.links[filter])}">${getSocialIcon(filter)}</a>`
          : '';
      },

      renderTableRows(tasks) {
        if (!tasks.length) {
          return `
            <tr>
              <td colspan="4" class="p-10 text-center text-[11px] font-black uppercase text-slate-400">
                Нет опубликованных задач за выбранный период
              </td>
            </tr>
          `;
        }

        return tasks.map(task => {
          const views = AnalyticsUI.getTaskViews(task);
          const linksHtml = AnalyticsUI.renderTaskLinks(task);

          return `
            <tr class="border-b" style="border-color: var(--border);">
              <td class="p-4 text-[10px] text-slate-400">${formatShortDate(task.date)}</td>
              <td class="p-4 font-black uppercase">${escapeHtml(task.title || 'Без названия')}</td>
              <td class="p-4 font-black text-emerald-600">${views.toLocaleString('ru-RU')}</td>
              <td class="p-4 text-center">${linksHtml}</td>
            </tr>
          `;
        }).join('');
      },

      renderTable(tasks) {
        return `
          <table class="w-full text-left text-[11px] font-bold">
            <thead style="background: var(--surface-2); color: var(--muted);">
              <tr>
                <th class="p-4">Дата</th>
                <th class="p-4">Тема</th>
                <th class="p-4">Охват</th>
                <th class="p-4 text-center">Линки</th>
              </tr>
            </thead>
            <tbody>
              ${AnalyticsUI.renderTableRows(tasks)}
            </tbody>
          </table>
        `;
      },

      renderSummary(tasks) {
        const totalViews = tasks.reduce((sum, task) => sum + AnalyticsUI.getTaskViews(task), 0);

        if ($('#stat-total')) $('#stat-total').textContent = tasks.length;
        if ($('#stat-views')) $('#stat-views').textContent = totalViews.toLocaleString('ru-RU');
      },

      renderStatsTable() {
        const label = $('#statsMonthLabel');
        if (label) {
          label.textContent = state.statsDate.toLocaleString('ru-RU', {
            month: 'long',
            year: 'numeric'
          });
        }

        const tasks = AnalyticsUI.getPublishedTasksForMonth();
        AnalyticsUI.renderSummary(tasks);

        const container = $('#statsTableContainer');
        if (container) container.innerHTML = AnalyticsUI.renderTable(tasks);
      }
    };

    const ChartUI = {
      platforms: ['YouTube', 'Instagram', 'TikTok', 'VK', 'Telegram'],

      platformColors: {
        YouTube: '#FF0000',
        Instagram: '#E4405F',
        TikTok: '#000000',
        VK: '#0077FF',
        Telegram: '#229ED9'
      },

      getPlatformViews(task, platform) {
        if (platform === 'Telegram') {
          return TG_LIST.reduce((sum, tg) => sum + Number(task.play_counts?.[tg] || 0), 0);
        }

        return Number(task.play_counts?.[platform] || 0);
      },

      getPublishedTasks() {
        return state.tasks.filter(task => task.status === 'published');
      },

      buildMonthlyPeriods() {
        const now = new Date();
        const periods = [];

        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          periods.push({
            month: d.getMonth(),
            year: d.getFullYear(),
            label: d.toLocaleString('ru-RU', { month: 'short' })
          });
        }

        return periods;
      },

      buildMonthlyData(platform, periods) {
        const published = ChartUI.getPublishedTasks();

        return periods.map(period => {
          return published
            .filter(task => {
              const date = parseLocalDate(task.date);
              return date && date.getMonth() === period.month && date.getFullYear() === period.year;
            })
            .reduce((sum, task) => sum + ChartUI.getPlatformViews(task, platform), 0);
        });
      },

      buildDailyLabels() {
        const now = new Date();
        const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return Array.from({ length: days }, (_, index) => String(index + 1));
      },

      buildDailyData(platform, labels) {
        const now = new Date();
        const published = ChartUI.getPublishedTasks();

        return labels.map(label => {
          const day = Number(label);

          return published
            .filter(task => {
              const date = parseLocalDate(task.date);
              return date &&
                date.getDate() === day &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
            })
            .reduce((sum, task) => sum + ChartUI.getPlatformViews(task, platform), 0);
        });
      },

      buildDataset(platform, data) {
        const color = ChartUI.platformColors[platform];

        return {
          label: platform,
          data,
          borderColor: color,
          backgroundColor: `${color}22`,
          fill: true,
          tension: 0.3
        };
      },

      buildChartData() {
        if (state.chartMode === 'months') {
          $('#chartTitle').textContent = 'Аналитика охватов (6 мес)';

          const periods = ChartUI.buildMonthlyPeriods();
          const labels = periods.map(period => period.label);
          const datasets = ChartUI.platforms.map(platform =>
            ChartUI.buildDataset(platform, ChartUI.buildMonthlyData(platform, periods))
          );

          return { labels, datasets };
        }

        $('#chartTitle').textContent = `Аналитика по дням (${new Date().toLocaleString('ru-RU', { month: 'long' })})`;

        const labels = ChartUI.buildDailyLabels();
        const datasets = ChartUI.platforms.map(platform =>
          ChartUI.buildDataset(platform, ChartUI.buildDailyData(platform, labels))
        );

        return { labels, datasets };
      },

      render() {
        const canvas = $('#reachChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = ChartUI.buildChartData();

        if (state.chart) state.chart.destroy();

        state.chart = new Chart(ctx, {
          type: 'line',
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: { weight: 'bold', size: 10 }
                }
              },
              tooltip: {
                mode: 'index',
                intersect: false
              }
            },
            scales: {
              y: { beginAtZero: true },
              x: { grid: { display: false } }
            }
          }
        });
      }
    };
