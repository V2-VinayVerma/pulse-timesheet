/* ==========================================================================
   Pulse High-Performance Charts & Visualizations (Crisp & High-DPI)
   ========================================================================== */

const PulseCharts = {
  // Setup crisp high-DPI Canvas
  setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.parentElement?.clientWidth || 320;
    const h = rect.height || canvas.parentElement?.clientHeight || 220;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: w, height: h };
  },

  // 1. RMG Utilization Donut Chart
  renderUtilizationDonut(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 - 14;
    const outerRadius = Math.min(centerX, centerY) - 12;
    const innerRadius = outerRadius * 0.64;

    const segments = [
      { label: 'Fully Allocated (100%)', count: data.full || 0, color: '#10b981' },
      { label: 'Partial (<100%)', count: data.partial || 0, color: '#6366f1' },
      { label: 'On Bench (0%)', count: data.bench || 0, color: '#0ea5e9' },
      { label: 'Over-allocated (>100%)', count: data.over || 0, color: '#ea580c' }
    ];

    const totalCount = segments.reduce((sum, s) => sum + s.count, 0) || 1;
    let startAngle = -Math.PI / 2;

    segments.forEach(seg => {
      const sliceAngle = (seg.count / totalCount) * (Math.PI * 2);
      if (sliceAngle > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle += sliceAngle;
      }
    });

    // Center text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`${Math.round(((data.full + data.partial + data.over) / totalCount) * 100)}%`, centerX, centerY - 4);

    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('ACTIVE UTIL', centerX, centerY + 14);

    // Legend at bottom
    const legendY = height - 16;
    const itemWidth = width / segments.length;
    segments.forEach((seg, i) => {
      const x = i * itemWidth + itemWidth / 2;
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.arc(x - 24, legendY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${seg.count} ${seg.label.split(' ')[0]}`, x - 16, legendY + 2);
    });
  },

  // 2. PM Team Status Breakdown Bar
  renderTeamStatusBar(canvasId, stats) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const items = [
      { label: 'Approved', count: stats.approved || 0, color: '#10b981' },
      { label: 'Submitted', count: stats.submitted || 0, color: '#f59e0b' },
      { label: 'Draft / In Progress', count: stats.draft || 0, color: '#64748b' },
      { label: 'Revision Required', count: stats.rejected || 0, color: '#f43f5e' }
    ];

    const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
    const barHeight = 22;
    const barY = 24;
    const startX = 10;
    const barWidth = width - 20;

    let currentX = startX;

    items.forEach((item, idx) => {
      const segWidth = (item.count / total) * barWidth;
      if (segWidth > 0) {
        ctx.fillStyle = item.color;
        
        if (idx === 0) {
          ctx.beginPath();
          ctx.roundRect(currentX, barY, segWidth, barHeight, [6, 0, 0, 6]);
          ctx.fill();
        } else if (idx === items.length - 1 || currentX + segWidth >= startX + barWidth - 1) {
          ctx.beginPath();
          ctx.roundRect(currentX, barY, segWidth, barHeight, [0, 6, 6, 0]);
          ctx.fill();
        } else {
          ctx.fillRect(currentX, barY, segWidth, barHeight);
        }

        currentX += segWidth;
      }
    });

    // Legend items below
    const legendStartY = 72;
    const rowHeight = 26;

    items.forEach((item, i) => {
      const y = legendStartY + i * rowHeight;
      
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(10, y, 10, 10, 3);
      ctx.fill();

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 28, y + 9);

      const pct = Math.round((item.count / total) * 100);
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.count} (${pct}%)`, width - 10, y + 9);
    });
  },

  // 3. Employee Weekly Hours Bar Chart (Crisp & Spacious)
  renderWeeklyHoursChart(canvasId, dailyHours, targetHours) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, width, height } = this.setupCanvas(canvas);

    ctx.clearRect(0, 0, width, height);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxHour = Math.max(10, targetHours + 2, ...dailyHours);
    const chartBottom = height - 32;
    const chartTop = 24;
    const chartHeight = chartBottom - chartTop;
    const barWidth = Math.min(30, (width - 60) / 7 - 8);
    const spacing = (width - 40) / 7;

    // Target baseline
    const targetY = chartTop + chartHeight - (targetHours / maxHour) * chartHeight;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(15, targetY);
    ctx.lineTo(width - 15, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target label badge
    ctx.fillStyle = '#475569';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Target Cap: ${targetHours}h`, width - 15, targetY - 5);

    // Draw Day Bars
    days.forEach((day, i) => {
      const hrs = dailyHours[i] || 0;
      const x = 20 + i * spacing + spacing / 2;
      const h = (hrs / maxHour) * chartHeight;
      const y = chartBottom - h;

      // Background track
      ctx.fillStyle = i >= 5 ? '#f8fafc' : '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(x - barWidth / 2, chartTop, barWidth, chartHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Active hour bar
      if (hrs > 0) {
        if (hrs >= targetHours) {
          ctx.fillStyle = '#10b981'; // Green match
        } else {
          ctx.fillStyle = '#6366f1'; // Indigo partial
        }

        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, y, barWidth, h, [4, 4, 0, 0]);
        ctx.fill();

        // Hours label on top
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${hrs}h`, x, y - 5);
      }

      // Day label below
      ctx.fillStyle = (i === 2) ? '#4f46e5' : '#64748b'; // Wednesday highlighted as Today
      ctx.font = (i === 2) ? '800 11px "Plus Jakarta Sans", sans-serif' : '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day, x, height - 12);
    });
  }
};
