/* ===========================
   Analytics page — charts and metrics
   =========================== */

const CHART_COLORS = {
  copper: '#e17055',
  sage: '#00b894',
  amber: '#fdcb6e',
  sky: '#74b9ff',
  slate: '#636e72',
  copperDark: '#c0392b',
  cloud: '#dfe6e9',
};

const STATUS_COLORS = {
  inquiry: CHART_COLORS.sky,
  approved: CHART_COLORS.amber,
  in_progress: CHART_COLORS.copper,
  completed: CHART_COLORS.sage,
  delivered: CHART_COLORS.slate,
};

async function fetchAnalytics(type) {
  const res = await fetch(`${API_BASE}/analytics?type=${type}`);
  if (!res.ok) throw new Error(`Failed to fetch ${type}`);
  const json = await res.json();
  return json.data;
}

async function loadAnalytics() {
  try {
    const [summary, statusData, revenueData, trendData, roofData] = await Promise.all([
      fetchAnalytics('summary'),
      fetchAnalytics('status_breakdown'),
      fetchAnalytics('revenue_by_month'),
      fetchAnalytics('project_trend'),
      fetchAnalytics('roof_types'),
    ]);

    renderSummary(summary);
    renderStatusChart(statusData);
    renderRevenueChart(revenueData);
    renderTrendChart(trendData);
    renderRoofTypesChart(roofData);
  } catch (err) {
    showToast('Error loading analytics: ' + err.message, true);
  }
}

function renderSummary(data) {
  const el = document.getElementById('analyticsSummary');
  el.innerHTML = `
    <div class="summary-card">
      <div class="stat-number">${data.total_projects}</div>
      <div class="stat-label">Total Projects</div>
    </div>
    <div class="summary-card">
      <div class="stat-number">$${Number(data.total_revenue).toLocaleString()}</div>
      <div class="stat-label">Total Revenue</div>
    </div>
    <div class="summary-card">
      <div class="stat-number">$${Math.round(data.avg_price).toLocaleString()}</div>
      <div class="stat-label">Avg. Project Price</div>
    </div>
    <div class="summary-card">
      <div class="stat-number">${data.completion_rate}%</div>
      <div class="stat-label">Completion Rate</div>
    </div>
  `;
}

function renderStatusChart(data) {
  const ctx = document.getElementById('statusChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.status.replace('_', ' ')),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: data.map(d => STATUS_COLORS[d.status] || CHART_COLORS.slate),
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { family: "'DM Sans', sans-serif", size: 12 } } },
      }
    }
  });
}

function renderRevenueChart(data) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => formatMonth(d.month)),
      datasets: [{
        label: 'Revenue',
        data: data.map(d => d.revenue),
        backgroundColor: CHART_COLORS.copper,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => '$' + v.toLocaleString(),
            font: { family: "'DM Sans', sans-serif", size: 11 }
          },
          grid: { color: '#f0f0f0' },
        },
        x: {
          ticks: { font: { family: "'DM Sans', sans-serif", size: 11 } },
          grid: { display: false },
        }
      }
    }
  });
}

function renderTrendChart(data) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatMonth(d.month)),
      datasets: [{
        label: 'New Projects',
        data: data.map(d => d.count),
        borderColor: CHART_COLORS.sage,
        backgroundColor: 'rgba(0, 184, 148, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: CHART_COLORS.sage,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: "'DM Sans', sans-serif", size: 11 } },
          grid: { color: '#f0f0f0' },
        },
        x: {
          ticks: { font: { family: "'DM Sans', sans-serif", size: 11 } },
          grid: { display: false },
        }
      }
    }
  });
}

function renderRoofTypesChart(data) {
  const ctx = document.getElementById('roofTypesChart').getContext('2d');
  const colors = [CHART_COLORS.copper, CHART_COLORS.sky, CHART_COLORS.amber, CHART_COLORS.sage, CHART_COLORS.slate];
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.roof_type),
      datasets: [{
        label: 'Projects',
        data: data.map(d => d.count),
        backgroundColor: data.map((_, i) => colors[i % colors.length]),
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: "'DM Sans', sans-serif", size: 11 } },
          grid: { color: '#f0f0f0' },
        },
        y: {
          ticks: { font: { family: "'DM Sans', sans-serif", size: 11 } },
          grid: { display: false },
        }
      }
    }
  });
}

function formatMonth(yyyymm) {
  const [year, month] = yyyymm.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[parseInt(month) - 1] + ' ' + year.slice(2);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  const authed = await checkAuth();
  if (!authed) return;

  renderNav('analytics');
  await loadAnalytics();
});
