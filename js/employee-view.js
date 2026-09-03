/* ==========================================================================
   Pulse Employee View: Timesheet-First Productivity Workspace
   ========================================================================== */

const EmployeeView = {
  render(container) {
    const employee = state.getActiveEmployee();
    const weekId = state.selectedWeekId;
    const sheet = state.getOrCreateTimesheet(employee.id, weekId);
    const allocs = state.getEmployeeAllocations(employee.id);
    const expectedHoursPerDay = state.getEmployeeExpectedHoursPerDay(employee.id);
    const expectedWeeklyHours = state.getWeeklyAllowedHours(employee.id, weekId);
    const capCheck = state.isTimesheetOverCapacity(employee.id, weekId);

    const isLocked = sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted';
    const isRejected = sheet.status === 'rejected';

    // Calculate daily and billable totals
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    let billableHours = 0;
    let nonBillableHours = 0;

    sheet.rows.forEach(row => {
      const isRowBillable = row.isBillable !== false;
      row.hours.forEach((h, d) => {
        const val = Number(h) || 0;
        dailyTotals[d] += val;
        if (isRowBillable) {
          billableHours += val;
        } else {
          nonBillableHours += val;
        }
      });
    });
    const grandTotal = dailyTotals.reduce((sum, h) => sum + h, 0);

    // Dynamic days info for current week
    const weekDays = state.getWeekDays(weekId);

    const unfilledWorkdays = dailyTotals.slice(0, 5).filter((h, d) => {
      const lock = state.getDayLockStatus(employee.id, d, weekId);
      return !lock.isLocked && h === 0;
    }).length;

    const myOvertimeReqs = (state.data.overtimeRequests || []).filter(r => r.employeeId === employee.id && r.weekId === weekId);
    const approvedOvertimeReqs = myOvertimeReqs.filter(r => r.status === 'approved' || r.status === 'forwarded_to_rmg' || r.status === 'pm_approved');
    const pendingOvertimeReqs = myOvertimeReqs.filter(r => r.status === 'pending_pm');

    let html = `
      <div class="employee-view-root">
        <!-- 1. Compact Status Strip & Billable Breakdown -->
        <div class="timesheet-status-strip">
          <div class="status-badge-wrapper">
            <span class="status-badge status-${sheet.status}">
              <span class="status-dot"></span>
              ${sheet.status === 'pm_approved' ? 'PM APPROVED → PENDING RMG' : sheet.status.toUpperCase()}
            </span>
            ${sheet.status === 'approved' ? `<span style="font-size:0.75rem; color:#15803d; font-weight:600;">✓ Final Approved by PM & RMG</span>` : ''}
            ${sheet.status === 'pm_approved' ? `<span style="font-size:0.75rem; color:#6d28d9; font-weight:600;">⏱ Endorsed by PM (${sheet.pmApprovedByName || 'PM'}) → In RMG Queue</span>` : ''}
            ${sheet.status === 'submitted' ? `<span style="font-size:0.75rem; color:#1d4ed8; font-weight:600;">⏱ Under PM Review</span>` : ''}
            ${sheet.status === 'rejected' ? `<span style="font-size:0.75rem; color:#b91c1c; font-weight:600;">⚠️ Revision Requested (${sheet.rejectedFromStage === 'rmg' ? 'by RMG' : 'by PM'})</span>` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; color:var(--text-secondary);">
              <span>Daily Cap: <strong>${expectedHoursPerDay}h/day</strong></span>
              <span>•</span>
              <span>Weekly Cap: <strong>${expectedWeeklyHours}h</strong></span>
              <span>•</span>
              <span>Logged: <strong class="tabular-nums" style="color: ${capCheck.isOver ? '#e11d48' : (grandTotal === expectedWeeklyHours ? 'var(--status-approved-text)' : '#d97706')};">${grandTotal.toFixed(1)} / ${expectedWeeklyHours}h</strong></span>
              <span>•</span>
              <span class="billable-pill is-billable" title="Billable hours ratio">⚡ ${billableHours.toFixed(1)}h Billable (${grandTotal > 0 ? Math.round((billableHours/grandTotal)*100) : 0}%)</span>
              ${nonBillableHours > 0 ? `<span class="billable-pill non-billable">⚪ ${nonBillableHours.toFixed(1)}h Non-Billable</span>` : ''}
            </div>

            ${!isLocked ? `
              <button class="btn-quick" id="btnOpenOvertimeModal" style="font-size:0.75rem; font-weight:600;">
                ➕ Request Overtime
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 2. Capacity Alert: Green Banner if Overtime Approved, Red Warning if Exceeded without Approval -->
        ${capCheck.isOver 
          ? this.renderCapacityExceededAlert(capCheck) 
          : (approvedOvertimeReqs.length > 0 ? this.renderOvertimeApprovedBanner(approvedOvertimeReqs, expectedWeeklyHours) : '')
        }

        <!-- 3. Active Actionable Banners (Rejection, Nudge, Missing Days, Pending OT) -->
        ${isRejected ? this.renderRejectionBanner(sheet) : ''}
        ${(employee.nudged || employee.rmgNudged) && !isLocked ? this.renderNudgeBanner(employee, weekId) : ''}
        ${unfilledWorkdays > 0 && sheet.status === 'draft' ? this.renderUnfilledWarning(unfilledWorkdays, employee.id, weekId) : ''}
        ${pendingOvertimeReqs.length > 0 ? this.renderOvertimePendingBanner(pendingOvertimeReqs) : ''}

        <!-- 4. Timesheet Workspace (Daily Focus as Primary / Weekly / Monthly / History) -->
        ${state.viewMode === 'history'
          ? this.renderHistoryView(sheet, employee, isLocked)
          : (state.viewMode === 'monthly'
              ? this.renderMonthlyView(sheet, employee, isLocked)
              : (state.viewMode === 'daily'
                  ? this.renderDailyView(sheet, weekDays, allocs, employee, expectedHoursPerDay, expectedWeeklyHours, isLocked, isRejected, capCheck)
                  : this.renderWeeklyGrid(sheet, weekDays, allocs, dailyTotals, grandTotal, expectedHoursPerDay, expectedWeeklyHours, isLocked, isRejected, capCheck, billableHours, nonBillableHours)
                )
            )
        }

        <!-- 5. Secondary Context: Allocations & Project Allocation & Variance Summary -->
        ${state.viewMode !== 'history' ? `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-top:0.5rem;">
            <!-- Active Allocations Summary -->
            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Assigned Project Allocations</div>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">Managed by RMG</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${this.renderAllocationCards(allocs, employee, weekId)}
              </div>
            </div>

            <!-- Project Allocation and Variance Summary -->
            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Project Allocation & Variance Summary</div>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">Period: ${weekId}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                ${this.renderProjectVarianceSummary(allocs, sheet, expectedWeeklyHours, employee)}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
    this.bindEvents(container, sheet, employee, capCheck);
  },

  renderCapacityExceededAlert(capCheck) {
    return `
      <div class="capacity-warning-banner">
        <div>
          <strong style="color:#e11d48;">⚠️ RMG Allocation Cap Exceeded:</strong>
          <span style="color:#9f1239; margin-left:0.35rem;">
            You logged <strong>${capCheck.totalLogged.toFixed(1)}h</strong> against your approved capacity limit of <strong>${capCheck.maxAllowed.toFixed(1)}h</strong> (excess: <strong>+${capCheck.excessHours.toFixed(1)}h</strong>).
            ${capCheck.dayExceeded ? 'Daily limits are also exceeded.' : ''}
            Submission is disabled until logged hours match approved capacity or manager endorses overtime.
          </span>
        </div>
        <button class="btn-secondary" id="btnAlertOvertimeModal" style="font-size:0.72rem; padding:0.25rem 0.6rem; color:var(--brand-700); border-color:var(--brand-300); flex-shrink:0;">
          ⚡ Request Overtime
        </button>
      </div>
    `;
  },

  renderAllocationCards(allocs, employee, weekId = null) {
    const targetWeek = weekId || state.selectedWeekId;
    if (allocs.length === 0) {
      return `
        <div style="padding:1rem; background:var(--bg-canvas); border-radius:var(--radius-sm); border:1px solid var(--grid-border); font-size:0.8rem; color:var(--text-muted);">
          Currently on bench. No project allocations assigned.
        </div>
      `;
    }

    return allocs.map(alloc => {
      const proj = state.getProject(alloc.projectId);
      let weeklyProjectHours = 0;
      let holidaysDeducted = 0;

      for (let d = 0; d < 5; d++) {
        const lock = state.getDayLockStatus(employee.id, d, targetWeek);
        if (!lock.isLocked) {
          weeklyProjectHours += Number(alloc.hoursPerDay);
        } else {
          holidaysDeducted++;
        }
      }

      return `
        <div style="border:1px solid var(--grid-border); border-radius:var(--radius-sm); padding:0.6rem 0.75rem; background:#ffffff; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:600; font-size:0.85rem; color:var(--text-primary); display:flex; align-items:center; gap:0.4rem;">
              <span style="color:${proj?.color || 'var(--brand-700)'};">●</span>
              <span>${proj?.name || 'Project'}</span>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:1px;">
              ${proj?.client || 'Client'} • Role: ${alloc.roleDescription || employee.role}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-mono); font-weight:700; font-size:0.8rem; background:var(--bg-canvas); padding:0.15rem 0.5rem; border-radius:var(--radius-xs); border:1px solid var(--grid-border);">
              ${alloc.hoursPerDay}h/day (${weeklyProjectHours}h/wk)
            </div>
            ${holidaysDeducted > 0 ? `
              <div style="font-size:0.62rem; color:#b45309; margin-top:2px;">
                ${holidaysDeducted} day(s) holiday/leave deducted
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  renderProjectVarianceSummary(allocs, sheet, expectedWeeklyHours, employee) {
    let totalAllocatedHrs = expectedWeeklyHours;
    let totalLoggedHrs = 0;

    // Count holidays and leaves in this week
    let holidayCount = 0;
    let leaveCount = 0;
    let applicableWorkdays = 0;

    for (let d = 0; d < 5; d++) {
      const lock = state.getDayLockStatus(employee.id, d, sheet.weekId);
      if (lock.isLocked) {
        if (lock.type === 'holiday') holidayCount++;
        else leaveCount++;
      } else {
        applicableWorkdays++;
      }
    }

    const projectVariances = allocs.map(alloc => {
      const proj = state.getProject(alloc.projectId);
      
      // Calculate allocated hours for this specific week (deducting holidays and leaves)
      let allocatedWeekHrs = 0;
      let projectHolidaysDeducted = 0;

      for (let d = 0; d < 5; d++) {
        const lock = state.getDayLockStatus(employee.id, d, sheet.weekId);
        if (!lock.isLocked) {
          allocatedWeekHrs += Number(alloc.hoursPerDay);
        } else {
          projectHolidaysDeducted++;
        }
      }

      const loggedProjHrs = sheet.rows
        .filter(r => r.projectId === alloc.projectId)
        .reduce((sum, r) => sum + r.hours.reduce((hSum, h) => hSum + (Number(h) || 0), 0), 0);
      
      totalLoggedHrs += loggedProjHrs;
      const variance = loggedProjHrs - allocatedWeekHrs;

      return {
        project: proj,
        alloc,
        allocatedWeekHrs,
        loggedProjHrs,
        variance,
        projectHolidaysDeducted,
        isOver: variance > 0,
        isUnder: variance < 0,
        isMatch: variance === 0
      };
    });

    // Detect any unallocated projects in timesheet rows
    const unallocatedProjects = [];
    sheet.rows.forEach(r => {
      if (!allocs.some(a => a.projectId === r.projectId) && !unallocatedProjects.some(up => up.projectId === r.projectId)) {
        const proj = state.getProject(r.projectId);
        const loggedUnalloc = sheet.rows
          .filter(row => row.projectId === r.projectId)
          .reduce((sum, row) => sum + row.hours.reduce((hSum, h) => hSum + (Number(h) || 0), 0), 0);
        
        if (loggedUnalloc > 0) {
          totalLoggedHrs += loggedUnalloc;
          unallocatedProjects.push({
            project: proj,
            loggedHrs: loggedUnalloc,
            variance: loggedUnalloc
          });
        }
      }
    });

    const netVariance = totalLoggedHrs - totalAllocatedHrs;

    return `
      <div style="display:flex; flex-direction:column; gap:0.6rem;">
        <!-- Project Rollup Cards with Variance Badges -->
        ${projectVariances.map(pv => {
          const pct = pv.allocatedWeekHrs > 0 ? Math.min(100, Math.round((pv.loggedProjHrs / pv.allocatedWeekHrs) * 100)) : 100;
          return `
            <div style="border:1px solid var(--grid-border); border-radius:var(--radius-sm); padding:0.6rem 0.75rem; background:#ffffff;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                <div>
                  <strong style="color:var(--text-primary); font-size:0.8rem; display:flex; align-items:center; gap:0.35rem;">
                    <span style="color:${pv.project?.color || 'var(--brand-700)'};">●</span>
                    ${pv.project?.name || 'Project'}
                  </strong>
                  <div style="font-size:0.68rem; color:var(--text-muted); margin-top:1px;">
                    Allocated: <strong>${pv.allocatedWeekHrs.toFixed(1)}h</strong> (${pv.alloc.hoursPerDay}h/d × ${applicableWorkdays} workdays${pv.projectHolidaysDeducted > 0 ? ` • ${pv.projectHolidaysDeducted} holiday deducted` : ''}) • Logged: <strong class="tabular-nums" style="color:var(--text-primary);">${pv.loggedProjHrs.toFixed(1)}h</strong>
                  </div>
                </div>

                <div>
                  ${pv.isMatch ? `
                    <span class="status-badge status-approved" style="font-size:0.65rem;">
                      ✓ On Target (0.0h)
                    </span>
                  ` : (pv.isOver ? `
                    <span class="status-badge status-rejected" style="font-size:0.65rem; background:#ffe4e6; color:#be123c; border-color:#fecdd3;">
                      🚨 Limit Exceeded (+${pv.variance.toFixed(1)}h)
                    </span>
                  ` : `
                    <span class="status-badge status-draft" style="font-size:0.65rem; background:#fffbeb; color:#b45309; border-color:#fde68a;">
                      ⚠️ Short by -${Math.abs(pv.variance).toFixed(1)}h
                    </span>
                  `)}
                </div>
              </div>

              <!-- Progress bar -->
              <div style="height:5px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${pct}%; background:${pv.isOver ? '#e11d48' : (pv.isMatch ? '#10b981' : '#f59e0b')}; border-radius:3px;"></div>
              </div>
            </div>
          `;
        }).join('')}

        ${unallocatedProjects.map(up => `
          <div style="border:1px dashed #fca5a5; border-radius:var(--radius-sm); padding:0.5rem 0.75rem; background:#fff1f2;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
              <span style="color:#9f1239; font-weight:600;">
                ⚠️ Unallocated Project: ${up.project?.name || 'Project'}
              </span>
              <span class="status-badge status-rejected" style="font-size:0.65rem;">
                +${up.loggedHrs.toFixed(1)}h (No RMG Cap)
              </span>
            </div>
          </div>
        `).join('')}

        <!-- Total Weekly Variance Footer -->
        <div style="background:var(--bg-canvas); border:1px solid var(--grid-border); border-radius:var(--radius-xs); padding:0.55rem 0.75rem; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-top:0.2rem;">
          <div>
            <strong>Weekly Balance:</strong>
            <span style="color:var(--text-secondary); margin-left:0.35rem;">
              ${totalLoggedHrs.toFixed(1)}h Logged / ${totalAllocatedHrs}h Allocated
            </span>
          </div>
          <div>
            ${netVariance === 0 ? `
              <strong style="color:#10b981;">✓ Balanced (0.0h Variance)</strong>
            ` : (netVariance > 0 ? `
              <strong style="color:#e11d48;">🚨 +${netVariance.toFixed(1)}h (Limit Exceeded)</strong>
            ` : `
              <strong style="color:#d97706;">⚠️ -${Math.abs(netVariance).toFixed(1)}h (Hours Left to Fill)</strong>
            `)}
          </div>
        </div>
      </div>
    `;
  },

  renderWeeklyGrid(sheet, weekDays, allocs, dailyTotals, grandTotal, expectedHoursPerDay, expectedWeeklyHours, isLocked, isRejected, capCheck, billableHours, nonBillableHours) {
    const isTargetMet = grandTotal === expectedWeeklyHours && !capCheck.isOver;
    const remainingHrs = Math.max(0, expectedWeeklyHours - grandTotal);
    const isSubmitEligible = isTargetMet && !isLocked;

    return `
      <!-- Fast-Fill Action Bar -->
      <div class="quick-fill-toolbar">
        <div class="quick-actions-btns">
          <button class="btn-quick btn-quick-primary" id="btnFillWorkdays" ${isLocked ? 'disabled' : ''} title="Fills your expected daily hours for all workdays (skips holidays and approved leaves)">
            ⚡ 1-Click Fill Standard (${expectedWeeklyHours}h)
          </button>
          <button class="btn-quick" id="btnCopyLastWeek" ${isLocked ? 'disabled' : ''} title="Copies tasks, work items & descriptions from last week">
            📋 Copy Last Week
          </button>
          <button class="btn-quick" id="btnCopyMondayToWeek" ${isLocked ? 'disabled' : ''} title="Takes Monday's logged hours & standup notes and copies them across Tue–Fri (skipping holidays)">
            🔁 Copy Mon ➔ All Week
          </button>
          <button class="btn-quick" id="btnAddCustomTask" ${isLocked ? 'disabled' : ''} title="Add project row">
            ➕ Add Row
          </button>
          <button class="btn-quick" id="btnClearSheet" ${isLocked ? 'disabled' : ''} title="Clear hours in current sheet">
            🧹 Clear
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:0.75rem; color:var(--text-muted);">
            Auto-save active
          </span>
        </div>
      </div>

      <!-- Main Timesheet Table Ledger (Matching Clean Style in Image 2) -->
      <div class="timesheet-grid-card">
        <table class="timesheet-table">
          <thead>
            <tr>
              <th class="col-task-details">Project / Category / Scope</th>
              ${weekDays.map((day, dayIdx) => {
                const lock = state.getDayLockStatus(sheet.employeeId, dayIdx, sheet.weekId);
                return `
                  <th class="col-day-header ${day.isToday ? 'is-today' : ''} ${day.isWeekend ? 'is-weekend' : ''} ${lock.isLocked ? 'is-locked-day' : ''}">
                    <div class="day-name">${day.name.toUpperCase()}</div>
                    <div class="day-date">${day.date}</div>
                    ${lock.isLocked ? `<div class="locked-header-badge">${lock.badge}</div>` : ''}
                  </th>
                `;
              }).join('')}
              <th class="col-total" style="background:#f1f5f9; text-align:center; font-weight:700;">Total</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            ${sheet.rows.map((row, rowIdx) => this.renderTimesheetRow(row, rowIdx, allocs, isLocked, weekDays, sheet)).join('')}
          </tbody>
          <tfoot>
            <!-- Daily Total Row with Vibrant Green Highlight matching Image 2 -->
            <tr class="footer-totals-row">
              <td class="footer-label-cell">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span class="footer-label-title" style="font-weight:700; color:#1e293b;">Daily Total</span>
                  <span style="font-size:0.7rem; color:var(--text-muted);">Daily Cap: ${expectedHoursPerDay}h</span>
                </div>
              </td>
              ${dailyTotals.map((tot, d) => {
                const isWeekend = d >= 5;
                const lock = state.getDayLockStatus(sheet.employeeId, d, sheet.weekId);
                const maxAllowed = state.getDailyAllowedHours(sheet.employeeId, sheet.weekId, d);
                const isExceeded = tot > maxAllowed;

                return `
                  <td class="day-hour-cell ${isWeekend ? 'is-weekend-cell' : ''} ${lock.isLocked ? 'is-locked-day-cell' : ''}" style="text-align:center; vertical-align:middle;">
                    <div class="daily-total-summary">
                      ${lock.isLocked ? `
                        <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">-</span>
                      ` : (isWeekend ? `
                        <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">${tot > 0 ? `${tot.toFixed(1)}h` : '-'}</span>
                      ` : `
                        <span class="daily-hrs-val tabular-nums" style="color: ${isExceeded ? '#e11d48' : (tot > 0 ? '#059669' : '#64748b')}; font-size:0.95rem; font-weight:800;">
                          ${tot.toFixed(1)}h
                        </span>
                        <div style="font-size:0.65rem; color:#94a3b8;">cap ${maxAllowed}h</div>
                      `)}
                    </div>
                  </td>
                `;
              }).join('')}
              <td class="row-total-cell" style="background:#e2e8f0; text-align:center; vertical-align:middle;">
                <div class="grand-total-val tabular-nums" style="font-size:1.15rem; font-weight:800; color:${capCheck.isOver ? '#e11d48' : (isTargetMet ? '#0f766e' : '#d97706')};">
                  ${grandTotal.toFixed(1)}h
                </div>
                <div class="row-total-sub" style="font-size:0.65rem; color:#64748b;">of ${expectedWeeklyHours}h</div>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Action Footer with Strict Submission Requirements -->
      <div class="timesheet-footer-actions">
        <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          ${capCheck.isOver ? `
            <span style="font-weight:700; color:#e11d48; background:#fff1f2; border:1px solid #fecdd3; padding:0.2rem 0.5rem; border-radius:var(--radius-xs);">
              🚨 Limit Exceeded: You logged ${grandTotal.toFixed(1)}h (+${capCheck.excessHours.toFixed(1)}h extra). Please request your manager for additional hours.
            </span>
          ` : (isTargetMet ? `
            <span style="font-weight:700; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; padding:0.2rem 0.5rem; border-radius:var(--radius-xs);">
              ✓ Exactly ${expectedWeeklyHours}.0h Allocation Met — Ready to Submit
            </span>
          ` : (remainingHrs > 0 ? `
            <span style="font-weight:600; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:0.2rem 0.5rem; border-radius:var(--radius-xs);">
              ⏳ Left to fill ${remainingHrs.toFixed(1)}h for this duration (${grandTotal.toFixed(1)} / ${expectedWeeklyHours}.0h logged). Complete to Submit.
            </span>
          ` : ''))}
        </div>

        <div class="footer-buttons-group">
          ${sheet.status === 'draft' || sheet.status === 'rejected' ? `
            <button class="btn-secondary" id="btnSaveDraft">Save Draft</button>
            <button 
              class="btn-primary ${!isSubmitEligible ? 'btn-disabled-cap' : ''}" 
              id="btnSubmitTimesheet" 
              ${!isSubmitEligible ? 'disabled' : ''} 
              title="${capCheck.isOver 
                ? `Submission Blocked: Logged hours (${grandTotal.toFixed(1)}h) exceed approved allocation (${expectedWeeklyHours}h). Please request manager for additional hours.` 
                : (grandTotal < expectedWeeklyHours 
                    ? `Submission Blocked: You are left to fill ${(expectedWeeklyHours - grandTotal).toFixed(1)}h for this duration (${grandTotal.toFixed(1)}h / ${expectedWeeklyHours}h logged).` 
                    : 'Submit Timesheet for Approval →'
                  )}"
            >
              Submit Timesheet for Approval →
            </button>
          ` : `
            <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">
              Timesheet is locked in <strong>${sheet.status.toUpperCase()}</strong> state.
            </div>
          `}
        </div>
      </div>
    `;
  },

  renderTimesheetRow(row, rowIdx, allocs, isLocked, weekDays = null, sheet = null) {
    const proj = state.getProject(row.projectId) || state.data.projects[0];
    const alloc = allocs.find(a => a.projectId === row.projectId);
    const targetHrs = alloc ? alloc.hoursPerDay : 8;
    const rowTotal = row.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
    const employeeId = sheet ? sheet.employeeId : state.activeUserId;
    const weekId = sheet ? sheet.weekId : state.selectedWeekId;
    const isBillable = row.isBillable !== false;

    const defaultDays = [
      { name: 'Mon', date: 'Aug 24' },
      { name: 'Tue', date: 'Aug 25' },
      { name: 'Wed', date: 'Aug 26' },
      { name: 'Thu', date: 'Aug 27' },
      { name: 'Fri', date: 'Aug 28' },
      { name: 'Sat', date: 'Aug 29' },
      { name: 'Sun', date: 'Aug 30' }
    ];
    const daysList = weekDays && weekDays.length === 7 ? weekDays : defaultDays;

    const taskOptions = proj?.tasks || [
      'Feature Development',
      'Security & OAuth2 Integration',
      'UI & Frontend Refinements',
      'Bug Triage & Patches',
      'Sprint Planning & Backlog Sync'
    ];

    const workItemOptions = proj?.workItems || [
      'Stripe Checkout Integration',
      'OAuth2 Token Security',
      'Transaction Engine Refactor',
      'Payment Webhook Handlers',
      'Multi-Currency Fee Calculation'
    ];

    return `
      <tr class="timesheet-row ${isLocked ? 'is-locked' :
         ''}" data-row-id="${row.id}">
        <!-- Project, Task, Work Item & Billable Status -->
        <td class="task-meta-cell">
          <div class="project-tag-header">
            <div>
              <div class="project-title" style="color:${proj?.color || 'var(--brand-700)'}; font-weight:700;">
                ● ${proj?.name || 'Project'}
              </div>
              <div class="project-client-name">${proj?.client || 'Client Account'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.35rem; flex-shrink:0;">
              <span class="target-hrs-pill">${targetHrs}h/d</span>
              ${!isLocked ? `
                <button type="button" class="btn-quick" data-action="row-copy-mon" data-row-id="${row.id}" style="font-size:0.65rem; padding:0.1rem 0.4rem;" title="Copy Monday hours across Tue–Fri">
                  🔁 Copy Mon
                </button>
              ` : ''}
            </div>
          </div>

          <div class="task-inputs-row" style="grid-template-columns: 1.2fr 1.2fr 0.9fr; gap:0.4rem;">
            <div class="input-labeled-group">
              <label class="field-label-micro">Category / Role</label>
              <select class="task-select" data-field="task" data-row-id="${row.id}" ${isLocked ? 'disabled' : ''}>
                ${taskOptions.map(t => `<option value="${t}" ${t === row.task ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>

            <div class="input-labeled-group">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <label class="field-label-micro">Work Item</label>
                ${!isLocked ? `
                  <button type="button" class="btn-add-workitem-trigger" data-row-id="${row.id}" data-proj-id="${row.projectId}" data-proj-name="${proj?.name || 'Project'}" style="background:none; border:none; color:var(--brand-700); font-size:0.625rem; font-weight:700; cursor:pointer; padding:0 2px;" title="Add a custom work item or Jira ticket for this project">
                    + Add Item
                  </button>
                ` : ''}
              </div>
              <select class="task-workitem-input" data-field="workItem" data-row-id="${row.id}" data-proj-id="${row.projectId}" data-proj-name="${proj?.name || 'Project'}" ${isLocked ? 'disabled' : ''}>
                ${workItemOptions.map(w => `<option value="${w}" ${w === row.workItem ? 'selected' : ''}>${w}</option>`).join('')}
                ${row.workItem && !workItemOptions.includes(row.workItem) ? `
                  <option value="${row.workItem}" selected>⭐ ${row.workItem}</option>
                ` : ''}
                ${!isLocked ? `<option value="__custom__">➕ + Add Custom Work Item...</option>` : ''}
              </select>
            </div>

            <!-- Billable Status Selector -->
            <div class="input-labeled-group">
              <label class="field-label-micro">Billable Status</label>
              <select class="billable-select task-select" data-field="isBillable" data-row-id="${row.id}" ${isLocked ? 'disabled' : ''}>
                <option value="true" ${isBillable ? 'selected' : ''}>⚡ Billable</option>
                <option value="false" ${!isBillable ? 'selected' : ''}>⚪ Non-Billable</option>
              </select>
            </div>
          </div>

          <div class="task-desc-container">
            <input 
              type="text" 
              class="task-desc-input" 
              data-field="description" 
              data-row-id="${row.id}" 
              value="${row.description || ''}" 
              placeholder="Task summary / Jira ticket..." 
              ${isLocked ? 'disabled' : ''}
            />
          </div>
        </td>

        <!-- 7 Day Columns (Mon-Sun) with Clean Soft Rounded Input (Matching Image 2) -->
        ${row.hours.map((h, dayIdx) => {
          const isWeekend = dayIdx >= 5;
          const val = Number(h) || 0;
          const note = row.dayNotes ? row.dayNotes[dayIdx] || '' : '';
          const dayInfo = daysList[dayIdx] || { name: `Day ${dayIdx + 1}`, date: '' };
          const lock = state.getDayLockStatus(employeeId, dayIdx, weekId);

          if (lock.isLocked) {
            return `
              <td class="day-hour-cell is-locked-day-cell">
                <div class="locked-cell-box" title="${lock.label}">
                  <span class="locked-icon">${lock.type === 'holiday' ? '🏖️' : '🌴'}</span>
                  <span class="locked-tag">${lock.type === 'holiday' ? 'Holiday' : 'Leave'}</span>
                  <span class="locked-sub">${lock.label.length > 15 ? lock.label.substring(0, 14) + '...' : lock.label}</span>
                </div>
              </td>
            `;
          }

          return `
            <td class="day-hour-cell ${isWeekend ? 'is-weekend-cell' : ''}" style="vertical-align:middle; text-align:center;">
              <div class="cell-stepper-wrapper">
                <input 
                  type="number" 
                  step="0.5" 
                  min="0" 
                  max="24" 
                  class="hour-input ${val === 0 ? 'is-zero' : ''}" 
                  data-day-idx="${dayIdx}" 
                  data-row-id="${row.id}" 
                  value="${val === 0 ? '' : val}" 
                  placeholder="${isWeekend ? '-' : '0'}" 
                  ${isLocked ? 'disabled' : ''}
                />
                ${!isLocked ? `
                  <div class="stepper-btn-group">
                    <button type="button" class="btn-step btn-step-up" data-day-idx="${dayIdx}" data-row-id="${row.id}" title="+0.5h">▲</button>
                    <button type="button" class="btn-step btn-step-down" data-day-idx="${dayIdx}" data-row-id="${row.id}" title="-0.5h">▼</button>
                  </div>
                ` : ''}

                <!-- Subtle Day Note Indicator Trigger -->
                ${note ? `
                  <span 
                    class="cell-note-trigger" 
                    data-row-id="${row.id}" 
                    data-day-idx="${dayIdx}"
                    title="Note: ${note}"
                  >💬</span>
                ` : ''}
              </div>
            </td>
          `;
        }).join('')}

        <!-- Row Total (Matching Image 2) -->
        <td class="row-total-cell" style="background:#f1f5f9; text-align:center; vertical-align:middle;">
          <span class="tabular-nums" style="font-size:1.05rem; font-weight:700; color:#1e293b;">${rowTotal.toFixed(1)}h</span>
        </td>

        <!-- Action / Delete Row (Trash Can Matching Image 2) -->
        <td class="col-actions" style="text-align:center; vertical-align:middle;">
          ${!isLocked ? `
            <button type="button" class="row-action-btn btn-delete-row" data-row-id="${row.id}" title="Remove Row" style="font-size:1.05rem; color:#94a3b8; cursor:pointer;">
              🗑️
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  },

  renderDailyView(sheet, weekDays, allocs, employee, expectedHoursPerDay, expectedWeeklyHours, isLocked, isRejected, capCheck) {
    const todayInfo = state.getRealTodayInfo();
    const currentDayIdx = todayInfo.dayIndex;
    const currentDay = weekDays[currentDayIdx] || { name: todayInfo.shortDayName, date: todayInfo.dateFormatted, isToday: true };
    const maxAllowed = state.getDailyAllowedHours(employee.id, sheet.weekId, currentDayIdx);
    const dayLock = state.getDayLockStatus(employee.id, currentDayIdx, sheet.weekId);

    let dayTotal = 0;
    let grandTotal = 0;
    sheet.rows.forEach(r => {
      dayTotal += Number(r.hours[currentDayIdx]) || 0;
      grandTotal += r.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
    });
    const isDayExceeded = dayTotal > maxAllowed;
    const isTargetMet = grandTotal === expectedWeeklyHours && !capCheck.isOver;
    const remainingHrs = Math.max(0, expectedWeeklyHours - grandTotal);
    const isSubmitEligible = isTargetMet && !isLocked;

    return `
      <div class="timesheet-daily-card" style="background:#ffffff; border:1px solid var(--grid-border); border-radius:var(--radius-md); padding:1.25rem; box-shadow:var(--shadow-xs);">
        <!-- Day Navigation Title & Summary (Only Today's Date & Day) -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--grid-border); flex-wrap:wrap; gap:0.5rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <h2 style="font-size:1.15rem; font-weight:700; color:var(--text-primary); margin:0;">
                ${todayInfo.fullFormattedDate}
              </h2>
              <span class="period-tag" style="background:#dbeafe; color:#1d4ed8; font-size:0.68rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:3px;">TODAY</span>
              ${dayLock.isLocked ? `<span class="locked-header-badge">${dayLock.badge}</span>` : ''}
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
              ${dayLock.isLocked ? `
                <span style="color:#b91c1c; font-weight:600;">🔒 ${dayLock.label} — Timesheet entries locked</span>
              ` : `
                Daily Cap: <strong>${maxAllowed}h</strong> • Logged Today: <strong class="tabular-nums" style="color:${isDayExceeded ? '#e11d48' : (dayTotal === maxAllowed ? 'var(--status-approved-text)' : '#d97706')};">${dayTotal.toFixed(1)}h</strong>
                ${isDayExceeded ? `<span style="color:#e11d48; font-weight:700; margin-left:0.3rem;">(Exceeds daily cap by +${(dayTotal - maxAllowed).toFixed(1)}h)</span>` : ''}
              `}
            </div>
          </div>

          <div style="font-size:0.75rem; color:var(--text-secondary); background:var(--bg-canvas); padding:0.35rem 0.65rem; border:1px solid var(--grid-border); border-radius:var(--radius-xs);">
            Daily Entry • Auto-syncs to Weekly Timesheet
          </div>
        </div>

        ${dayLock.isLocked ? `
          <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:var(--radius-sm); padding:2rem 1.5rem; text-align:center; color:var(--text-muted); margin:1rem 0;">
            <div style="font-size:2.25rem; margin-bottom:0.5rem;">${dayLock.type === 'holiday' ? '🏖️' : '🌴'}</div>
            <div style="font-weight:700; font-size:1.05rem; color:var(--text-primary);">${dayLock.label}</div>
            <div style="font-size:0.8rem; margin-top:6px; color:var(--text-secondary);">
              This day is recognized as an official <strong>${dayLock.type === 'holiday' ? 'Company Statutory Holiday' : 'Approved Leave Day'}</strong>. Work hours cannot be logged for this date.
            </div>
          </div>
        ` : `
          <!-- Daily Multi-Task Action Bar -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
              <button class="btn-quick btn-quick-primary" id="btnDailyFillCap" ${isLocked ? 'disabled' : ''} title="Set hours to match daily cap (${maxAllowed}h)">
                ⚡ Fill Day (${maxAllowed}h)
              </button>
              <button class="btn-quick" id="btnDailyAddRow" ${isLocked ? 'disabled' : ''} title="Add another project task or role breakdown for this day">
                ➕ Add Task / Role
              </button>
              <button class="btn-quick" id="btnDailyCopyYesterday" ${isLocked ? 'disabled' : ''} title="Copy previous day's hours and standup notes">
                📋 Copy Yesterday
              </button>
              <button class="btn-quick" id="btnDailyClearDay" ${isLocked ? 'disabled' : ''} title="Clear hours for today">
                🧹 Clear Day
              </button>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:0.75rem; color:var(--text-muted);">
                Changes auto-saved
              </span>
            </div>
          </div>

          <!-- Multi-Task List for Current Day -->
          <div style="display:flex; flex-direction:column; gap:0.85rem;">
            ${sheet.rows.map((row, rowIdx) => {
              const proj = state.getProject(row.projectId) || state.data.projects[0];
              const hrs = Number(row.hours[currentDayIdx]) || 0;
              const note = row.dayNotes ? row.dayNotes[currentDayIdx] || '' : '';
              const isBillable = row.isBillable !== false;
              const taskOptions = proj?.tasks || ['Feature Development', 'UI & Frontend Refinements', 'Bug Triage & Patches'];
              const workItemOptions = proj?.workItems || ['Stripe Checkout Integration', 'OAuth2 Token Security', 'Transaction Engine Refactor'];

              return `
                <div style="border:1px solid var(--grid-border); border-radius:var(--radius-sm); padding:0.95rem; background:#ffffff; box-shadow:var(--shadow-xs);">
                  <!-- Task Header & Meta -->
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                      <div style="font-weight:700; font-size:0.95rem; color:${proj?.color || 'var(--brand-700)'};">
                        ● ${proj?.name || 'Project'}
                      </div>
                      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
                        ${proj?.client || 'Client Account'}
                      </div>
                    </div>

                    <!-- Hours Stepper & Actions on this Day -->
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                      <div class="cell-stepper-wrapper">
                        <input 
                          type="number" 
                          step="0.5" 
                          min="0" 
                          max="24" 
                          class="hour-input ${hrs === 0 ? 'is-zero' : ''}" 
                          data-day-idx="${currentDayIdx}" 
                          data-row-id="${row.id}" 
                          value="${hrs === 0 ? '' : hrs}" 
                          placeholder="0" 
                          ${isLocked ? 'disabled' : ''}
                        />
                        ${!isLocked ? `
                          <div class="stepper-btn-group">
                            <button type="button" class="btn-step btn-step-up" data-day-idx="${currentDayIdx}" data-row-id="${row.id}" title="+0.5h">▲</button>
                            <button type="button" class="btn-step btn-step-down" data-day-idx="${currentDayIdx}" data-row-id="${row.id}" title="-0.5h">▼</button>
                          </div>
                        ` : ''}
                      </div>

                      ${!isLocked && sheet.rows.length > 1 ? `
                        <button type="button" class="row-action-btn btn-delete-row" data-row-id="${row.id}" title="Remove Task Row" style="margin-left:0.25rem;">🗑️</button>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Role Category, Work Item & Billable Status -->
                  <div style="display:grid; grid-template-columns: 1.2fr 1.2fr 0.9fr; gap:0.6rem; margin-bottom:0.6rem;">
                    <div class="input-labeled-group">
                      <label class="field-label-micro">Category / Role</label>
                      <select class="task-select" data-field="task" data-row-id="${row.id}" ${isLocked ? 'disabled' : ''}>
                        ${taskOptions.map(t => `<option value="${t}" ${t === row.task ? 'selected' : ''}>${t}</option>`).join('')}
                      </select>
                    </div>

                    <div class="input-labeled-group">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label class="field-label-micro">Work Item</label>
                        ${!isLocked ? `
                          <button type="button" class="btn-add-workitem-trigger" data-row-id="${row.id}" data-proj-id="${row.projectId}" data-proj-name="${proj?.name || 'Project'}" style="background:none; border:none; color:var(--brand-700); font-size:0.625rem; font-weight:700; cursor:pointer; padding:0 2px;" title="Add a custom work item or Jira ticket for this project">
                            + Add Item
                          </button>
                        ` : ''}
                      </div>
                      <select class="task-workitem-input" data-field="workItem" data-row-id="${row.id}" data-proj-id="${row.projectId}" data-proj-name="${proj?.name || 'Project'}" ${isLocked ? 'disabled' : ''}>
                        ${workItemOptions.map(w => `<option value="${w}" ${w === row.workItem ? 'selected' : ''}>${w}</option>`).join('')}
                        ${row.workItem && !workItemOptions.includes(row.workItem) ? `
                          <option value="${row.workItem}" selected>⭐ ${row.workItem}</option>
                        ` : ''}
                        ${!isLocked ? `<option value="__custom__">➕ + Add Custom Work Item...</option>` : ''}
                      </select>
                    </div>

                    <div class="input-labeled-group">
                      <label class="field-label-micro">Billable Status</label>
                      <select class="billable-select task-select" data-field="isBillable" data-row-id="${row.id}" ${isLocked ? 'disabled' : ''}>
                        <option value="true" ${isBillable ? 'selected' : ''}>⚡ Billable</option>
                        <option value="false" ${!isBillable ? 'selected' : ''}>⚪ Non-Billable</option>
                      </select>
                    </div>
                  </div>

                  <!-- Standup / Activity Description Note for Today -->
                  <div class="form-group" style="margin:0;">
                    <label class="field-label-micro">Activity Description / Standup Note for ${todayInfo.fullDayName}</label>
                    <textarea 
                      class="form-textarea daily-note-textarea" 
                      rows="2" 
                      data-row-id="${row.id}" 
                      data-day-idx="${currentDayIdx}" 
                      placeholder="e.g. Completed API endpoints, fixed token security bug, and synced with PM..." 
                      style="font-size:0.75rem; width:100%; padding:0.45rem; border:1px solid var(--grid-border); border-radius:var(--radius-xs);" 
                      ${isLocked ? 'disabled' : ''}
                    >${note}</textarea>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- Daily View Footer Actions with Weekly Submission Requirements -->
        <div class="timesheet-footer-actions" style="margin-top:1.25rem;">
          <div style="font-size:0.8rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            ${capCheck.isOver ? `
              <span style="font-weight:700; color:#e11d48; background:#fff1f2; border:1px solid #fecdd3; padding:0.2rem 0.5rem; border-radius:var(--radius-xs);">
                🚨 Limit Exceeded: You logged ${grandTotal.toFixed(1)}h (+${capCheck.excessHours.toFixed(1)}h extra).
              </span>
            ` : (isTargetMet ? `
              <span style="font-weight:700; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; padding:0.2rem 0.5rem; border-radius:var(--radius-xs);">
                ✓ Full Week Allocation (${expectedWeeklyHours}.0h) Met — Ready for Weekly Submission
              </span>
            ` : (remainingHrs > 0 ? `
              <span style="font-weight:600; color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:0.2rem 0.5rem; border-radius:var(--radius-xs);">
                ⏳ Weekly Progress: ${grandTotal.toFixed(1)}h / ${expectedWeeklyHours}.0h logged (${remainingHrs.toFixed(1)}h left before weekly submission)
              </span>
            ` : ''))}
          </div>

          <div class="footer-buttons-group">
            ${sheet.status === 'draft' || sheet.status === 'rejected' ? `
              <button class="btn-secondary" id="btnSaveDraft" title="Save entries for current day and week">
                💾 Save Day Log
              </button>
              <button 
                class="btn-primary ${!isSubmitEligible ? 'btn-disabled-cap' : ''}" 
                id="btnSubmitTimesheet" 
                ${!isSubmitEligible ? 'disabled' : ''} 
                title="${capCheck.isOver 
                  ? 'Cannot submit: Exceeds approved allocation' 
                  : (grandTotal < expectedWeeklyHours 
                      ? `Cannot submit: Left to fill ${(expectedWeeklyHours - grandTotal).toFixed(1)}h before weekly submission.` 
                      : 'Submit Complete Weekly Timesheet for Approval →')}"
              >
                Submit Complete Weekly Timesheet →
              </button>
            ` : `
              <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">
                Timesheet is locked in <strong>${sheet.status.toUpperCase()}</strong> state.
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  },

  renderMonthlyView(sheet, employee, isLocked) {
    const monthlyData = state.getMonthlyData(employee.id, state.selectedMonth);
    const monthsList = [
      { id: '2026-07', label: 'July 2026' },
      { id: '2026-08', label: 'August 2026' },
      { id: '2026-09', label: 'September 2026' },
      { id: '2026-10', label: 'October 2026' }
    ];

    return `
      <div class="monthly-focus-root">
        <!-- Month Selector Header -->
        <div class="month-nav-header">
          <div class="month-title-group">
            <button class="btn-quick" id="btnPrevMonth">◀</button>
            <span class="month-title-text">${monthlyData.monthLabel}</span>
            <button class="btn-quick" id="btnNextMonth">▶</button>
          </div>

          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:0.75rem; color:var(--text-muted);">Quick Month:</span>
            ${monthsList.map(m => `
              <button class="btn-quick ${m.id === (state.selectedMonth || '2026-08') ? 'btn-quick-primary' : ''}" data-action="set-month" data-month="${m.id}" style="font-size:0.72rem; padding:0.2rem 0.5rem;">
                ${m.label.split(' ')[0]}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Monthly KPI Summaries -->
        <div class="monthly-kpi-grid">
          <div class="monthly-kpi-card">
            <span class="monthly-kpi-title">Total Monthly Logged</span>
            <span class="monthly-kpi-value">${monthlyData.grandTotal.toFixed(1)}h</span>
            <span class="monthly-kpi-sub">Target: ${monthlyData.targetHours}h (${Math.round((monthlyData.grandTotal / monthlyData.targetHours) * 100)}% pacing)</span>
          </div>

          <div class="monthly-kpi-card" style="border-left:3px solid #10b981;">
            <span class="monthly-kpi-title">Billable Hours</span>
            <span class="monthly-kpi-value" style="color:#059669;">${monthlyData.grandBillable.toFixed(1)}h</span>
            <span class="monthly-kpi-sub">⚡ ${monthlyData.billableRatio}% Billable Ratio</span>
          </div>

          <div class="monthly-kpi-card" style="border-left:3px solid #64748b;">
            <span class="monthly-kpi-title">Non-Billable Hours</span>
            <span class="monthly-kpi-value" style="color:#475569;">${monthlyData.grandNonBillable.toFixed(1)}h</span>
            <span class="monthly-kpi-sub">⚪ Internal Platform & Operations</span>
          </div>

          <div class="monthly-kpi-card" style="border-left:3px solid #6366f1;">
            <span class="monthly-kpi-title">Compliance Status</span>
            <span class="monthly-kpi-value" style="font-size:1.15rem; color:#4f46e5;">
              ${monthlyData.weeks.filter(w => w.status === 'approved').length} / ${monthlyData.weeks.length} Approved
            </span>
            <span class="monthly-kpi-sub">${monthlyData.weeks.filter(w => w.status === 'draft').length} Draft(s) Pending</span>
          </div>
        </div>

        <!-- 4-Week Breakdown Table -->
        <div class="timesheet-grid-card">
          <table class="monthly-weeks-table">
            <thead>
              <tr>
                <th>Week Period</th>
                <th>Status</th>
                <th>Total Hours</th>
                <th>Billable Status</th>
                <th>Project Allocations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyData.weeks.map(w => {
                const isSelected = w.week.id === state.selectedWeekId;
                const pKeys = Object.keys(w.projectBreakdown);
                return `
                  <tr style="${isSelected ? 'background:#f0fdf4;' : ''}">
                    <td>
                      <strong>${w.week.label}</strong>
                      ${w.week.isCurrent ? '<span class="period-tag" style="margin-left:4px;">CURRENT</span>' : ''}
                    </td>
                    <td>
                      <span class="status-badge status-${w.status}">
                        <span class="status-dot"></span>
                        ${w.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong class="tabular-nums" style="font-size:0.95rem;">${w.totalHours.toFixed(1)}h</strong>
                      <span style="font-size:0.7rem; color:var(--text-muted);">/ 40h</span>
                    </td>
                    <td>
                      <span class="billable-pill is-billable">${w.billableHours.toFixed(1)}h Billable</span>
                      ${w.nonBillableHours > 0 ? `<span class="billable-pill non-billable" style="margin-left:4px;">${w.nonBillableHours.toFixed(1)}h Non-Billable</span>` : ''}
                    </td>
                    <td>
                      <div style="display:flex; flex-direction:column; gap:2px;">
                        ${pKeys.length > 0 ? pKeys.map(pk => {
                          const pObj = w.projectBreakdown[pk];
                          return `
                            <span style="font-size:0.72rem; color:var(--text-secondary);">
                              ● ${pObj.project?.name || 'Project'}: <strong>${pObj.hours.toFixed(1)}h</strong>
                            </span>
                          `;
                        }).join('') : '<span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">No logged rows</span>'}
                      </div>
                    </td>
                    <td>
                      <button class="btn-quick btn-jump-week ${isSelected ? 'btn-quick-primary' : ''}" data-week-id="${w.week.id}" style="font-size:0.72rem; padding:0.25rem 0.6rem;">
                        ${isSelected ? '✓ Active Week' : 'Open Week ➔'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderHistoryView(sheet, employee, isLocked) {
    const historyData = state.getTimesheetHistory(employee.id, this.historyStatusFilter || 'all', this.historyProjectFilter || 'all');
    const { records, stats } = historyData;
    const projects = state.getEmployeeProjects(employee.id);

    return `
      <div class="timesheet-history-root">
        <!-- 1. Lifetime Performance KPIs -->
        <div class="history-kpi-grid">
          <div class="history-kpi-card">
            <div class="history-kpi-label">Lifetime Logged</div>
            <div class="history-kpi-value">${stats.totalLifetimeHours.toFixed(1)}h</div>
            <div class="history-kpi-sub">Avg ${stats.avgWeeklyHours}h / week</div>
          </div>

          <div class="history-kpi-card">
            <div class="history-kpi-label">Approved Weeks</div>
            <div class="history-kpi-value" style="color:var(--status-approved-text);">${stats.totalApprovedCount}</div>
            <div class="history-kpi-sub">100% Certified</div>
          </div>

          <div class="history-kpi-card">
            <div class="history-kpi-label">Compliance Rate</div>
            <div class="history-kpi-value" style="color:var(--brand-700);">${stats.complianceRate}%</div>
            <div class="history-kpi-sub">On-time & Capped</div>
          </div>

          <div class="history-kpi-card">
            <div class="history-kpi-label">Pending / Drafts</div>
            <div class="history-kpi-value">${stats.totalDraftCount + stats.totalSubmittedCount}</div>
            <div class="history-kpi-sub">${stats.totalSubmittedCount} under review${stats.totalRejectedCount > 0 ? `, ${stats.totalRejectedCount} revision` : ''}</div>
          </div>
        </div>

        <!-- 2. Clean Filters Bar -->
        <div class="history-filters-bar">
          <div class="history-filter-pills">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-right:0.25rem;">Filter:</span>
            <button type="button" class="history-filter-btn ${(!this.historyStatusFilter || this.historyStatusFilter === 'all') ? 'active' : ''}" data-status="all">
              All (${historyData.allRecordsCount})
            </button>
            <button type="button" class="history-filter-btn ${this.historyStatusFilter === 'approved' ? 'active' : ''}" data-status="approved">
              Approved (${stats.totalApprovedCount})
            </button>
            <button type="button" class="history-filter-btn ${this.historyStatusFilter === 'submitted' ? 'active' : ''}" data-status="submitted">
              Submitted (${stats.totalSubmittedCount})
            </button>
            <button type="button" class="history-filter-btn ${this.historyStatusFilter === 'draft' ? 'active' : ''}" data-status="draft">
              Drafts (${stats.totalDraftCount})
            </button>
            ${stats.totalRejectedCount > 0 ? `
              <button type="button" class="history-filter-btn ${this.historyStatusFilter === 'rejected' ? 'active' : ''}" data-status="rejected" style="color:#e11d48;">
                Revisions (${stats.totalRejectedCount})
              </button>
            ` : ''}
          </div>

          <div style="display:flex; align-items:center; gap:0.4rem;">
            <label style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Project:</label>
            <select class="form-input" id="historyProjectSelect" style="font-size:0.75rem; padding:0.25rem 0.5rem; width:auto;">
              <option value="all" ${(!this.historyProjectFilter || this.historyProjectFilter === 'all') ? 'selected' : ''}>All Projects</option>
              ${projects.map(p => `
                <option value="${p.id}" ${this.historyProjectFilter === p.id ? 'selected' : ''}>${p.name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- 3. Clean Timesheet History Table -->
        <div class="history-table-card">
          <div class="history-table-header">
            <span class="history-table-title">Timesheet Submissions & Audit Archive</span>
            <span class="history-table-count">${records.length} Records Found</span>
          </div>

          <div style="overflow-x:auto;">
            <table class="timesheet-table" style="width:100%; min-width:800px;">
              <thead>
                <tr>
                  <th style="font-size:0.72rem; text-align:left;">Timesheet Period</th>
                  <th style="font-size:0.72rem; text-align:left;">Logged / Cap</th>
                  <th style="font-size:0.72rem; text-align:left;">Billable Hours</th>
                  <th style="font-size:0.72rem; text-align:left;">Allocated Projects</th>
                  <th style="font-size:0.72rem; text-align:center;">Status</th>
                  <th style="font-size:0.72rem; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${records.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.8rem;">
                      No timesheets found matching your filter criteria.
                    </td>
                  </tr>
                ` : records.map(r => `
                  <tr style="${r.isCurrent ? 'background:#f8fafc;' : ''}">
                    <td>
                      <div style="display:flex; align-items:center; gap:0.4rem;">
                        <strong style="font-size:0.82rem; color:var(--text-primary);">${r.label}</strong>
                        ${r.isCurrent ? `<span class="period-tag" style="font-size:0.6rem;">CURRENT</span>` : ''}
                      </div>
                      <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                        ${r.weekId} ${r.holidaysCount > 0 ? `• ${r.holidaysCount} holiday deducted` : ''}
                      </div>
                    </td>

                    <td>
                      <strong class="tabular-nums" style="font-size:0.85rem; color:${r.totalLogged === r.expectedCapacity ? 'var(--status-approved-text)' : (r.totalLogged > r.expectedCapacity ? '#e11d48' : 'var(--text-primary)')};">
                        ${r.totalLogged.toFixed(1)}h
                      </strong>
                      <span style="font-size:0.72rem; color:var(--text-muted);"> / ${r.expectedCapacity}h</span>
                    </td>

                    <td>
                      <span class="billable-pill is-billable" style="font-size:0.7rem;">
                        ⚡ ${r.billableLogged.toFixed(1)}h (${r.billableRatio}%)
                      </span>
                    </td>

                    <td>
                      <div style="display:flex; flex-direction:column; gap:2px; max-width:260px;">
                        ${r.projects.length > 0 ? r.projects.map(p => `
                          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; font-size:0.72rem;">
                            <span style="font-weight:600; color:${p.project?.color || 'var(--text-primary)'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                              ● ${p.project?.name || 'Project'}
                            </span>
                            <span class="tabular-nums" style="color:var(--text-muted); font-size:0.68rem;">${p.hours.toFixed(1)}h</span>
                          </div>
                        `).join('') : '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">No logged projects</span>'}
                      </div>
                    </td>

                    <td style="text-align:center;">
                      <div>
                        <span class="status-badge status-${r.status}">
                          <span class="status-dot"></span>
                          ${r.status === 'pm_approved' ? 'IN RMG QUEUE' : r.status.toUpperCase()}
                        </span>
                      </div>
                      ${r.status === 'approved' ? `
                        <div style="font-size:0.65rem; color:#15803d; margin-top:2px; font-weight:600;">✓ Certified by PM & RMG</div>
                      ` : ''}
                      ${r.status === 'pm_approved' ? `
                        <div style="font-size:0.65rem; color:#6d28d9; margin-top:2px; font-weight:600;">⏱ Endorsed by PM</div>
                      ` : ''}
                      ${r.status === 'submitted' ? `
                        <div style="font-size:0.65rem; color:#1d4ed8; margin-top:2px; font-weight:600;">⏱ Under Review</div>
                      ` : ''}
                      ${r.status === 'rejected' ? `
                        <div style="font-size:0.65rem; color:#b91c1c; margin-top:2px; font-weight:600;">⚠️ Revision Requested</div>
                      ` : ''}
                    </td>

                    <td style="text-align:right;">
                      <div style="display:flex; align-items:center; justify-content:flex-end; gap:0.35rem;">
                        <button 
                          type="button" 
                          class="btn-quick" 
                          data-action="inspect-history-sheet" 
                          data-week-id="${r.weekId}" 
                          data-emp-id="${employee.id}"
                          style="font-size:0.72rem; padding:0.25rem 0.55rem;"
                          title="Inspect full timesheet ledger"
                        >
                          Inspect
                        </button>
                        <button 
                          type="button" 
                          class="btn-quick btn-quick-primary" 
                          data-action="open-history-in-editor" 
                          data-week-id="${r.weekId}"
                          style="font-size:0.72rem; padding:0.25rem 0.55rem;"
                          title="Open this week in active timesheet editor"
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderRejectionBanner(sheet) {
    const isRmg = sheet.rejectedFromStage === 'rmg';
    const rejecter = sheet.rejectedByName || (isRmg ? 'RMG (Elena Rostova)' : 'Project Manager');
    return `
      <div class="rejection-banner">
        <div>
          <div class="rejection-title">Revision Requested by ${rejecter}</div>
          <div class="rejection-reason-text">"${sheet.rejectionReason || 'Please review task breakdown and resubmit.'}"</div>
        </div>
        <button class="btn-primary" id="btnEditAndResubmit" style="background:var(--status-rejected-solid); border-color:var(--status-rejected-solid); font-size:0.75rem;">
          ✏️ Edit & Resubmit
        </button>
      </div>
    `;
  },

  renderNudgeBanner(employee, weekId) {
    const isRmg = employee.rmgNudged;
    const title = isRmg ? 'RMG Submission Notice 🔔' : 'PM Reminder 🔔';
    const message = isRmg 
      ? `Elena Rostova (RMG) requested that you fill and submit your timesheet for ${weekId}.` 
      : `Your Project Manager nudged you to submit your timesheet for ${weekId}.`;

    return `
      <div class="nudge-banner">
        <div>
          <strong style="color:var(--brand-800); font-size:0.8rem;">${title}</strong>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${message}</div>
        </div>
        <button class="btn-quick btn-quick-primary" id="btnNudgeQuickFill" style="font-size:0.75rem;">
          ⚡ Auto-Fill & Submit
        </button>
      </div>
    `;
  },

  renderUnfilledWarning(unfilledCount, employeeId, weekId) {
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--status-over-bg); border:1px solid var(--status-over-border); border-left:3px solid var(--status-over-solid); padding:0.55rem 0.85rem; border-radius:var(--radius-sm); font-size:0.75rem;">
        <div style="color:var(--status-over-text);">
          ⏳ <strong>${unfilledCount} workday(s)</strong> unlogged for this week.
        </div>
        <button class="btn-quick" id="btnResolveMissingDays" style="font-size:0.72rem; padding:0.2rem 0.5rem; background:#ffffff;">
          ⚡ Fill Missing Days (${state.getEmployeeExpectedHoursPerDay(employeeId) * unfilledCount}h)
        </button>
      </div>
    `;
  },

  renderOvertimeApprovedBanner(approvedReqs, expectedWeeklyHours) {
    const totalExtra = approvedReqs.reduce((sum, r) => sum + (Number(r.extraHours) || 0), 0);
    const projectNames = [...new Set(approvedReqs.map(r => r.projectName))].join(', ');
    const isRmgCertified = approvedReqs.some(r => r.status === 'approved');

    return `
      <div class="capacity-approved-banner" style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:3.5px solid #16a34a; padding:0.65rem 0.95rem; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; box-shadow:var(--shadow-xs);">
        <div style="font-size:0.78rem; color:#14532d; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
          <strong style="color:#15803d; display:inline-flex; align-items:center; gap:0.25rem;">
            <span>✓</span> ${isRmgCertified ? 'RMG Extra Hours Approved' : 'PM Endorsed Extra Hours'}:
          </strong>
          <span>
            Your request for <strong>+${totalExtra.toFixed(1)}h</strong> extra capacity on <strong>${projectNames}</strong> has been approved. Your total approved allocation is expanded to <strong>${expectedWeeklyHours}.0h</strong> — ready for submission.
          </span>
        </div>
        <span class="status-badge status-approved" style="font-size:0.65rem; background:#dcfce7; color:#15803d; border-color:#86efac; flex-shrink:0;">
          ✓ Capacity Expanded
        </span>
      </div>
    `;
  },

  renderOvertimePendingBanner(pendingReqs) {
    return `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:3.5px solid var(--brand-600); border-radius:var(--radius-sm); padding:0.6rem 0.85rem; font-size:0.75rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <div style="color:var(--text-primary);">
          <strong style="color:var(--brand-700);">⏱ Extra Hours Request Pending:</strong>
          <span style="color:var(--text-secondary); margin-left:0.35rem;">
            ${pendingReqs.map(r => `+${r.extraHours}h on ${r.projectName}`).join(', ')} is awaiting PM/RMG endorsement. Once approved, your timesheet submission will be unlocked.
          </span>
        </div>
        <span class="status-badge status-submitted" style="font-size:0.65rem; flex-shrink:0;">Under Review</span>
      </div>
    `;
  },

  renderOvertimeStatusBanner(reqs) {
    return `
      <div style="background:#ffffff; border:1px solid var(--grid-border); border-left:3px solid var(--brand-700); border-radius:var(--radius-sm); padding:0.55rem 0.85rem; font-size:0.75rem;">
        <div style="font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">
          Overtime & Extra Hours Status:
        </div>
        <div style="display:flex; flex-direction:column; gap:0.35rem;">
          ${reqs.map(r => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; background:var(--bg-canvas); padding:0.3rem 0.6rem; border-radius:var(--radius-xs);">
              <div>
                <strong>+${r.extraHours}h</strong> on <strong>${r.projectName}</strong>: 
                <span style="color:var(--text-secondary); font-style:italic;">"${r.justification}"</span>
              </div>
              <span class="status-badge status-${r.status === 'approved' ? 'approved' : (r.status === 'rejected' ? 'rejected' : 'submitted')}" style="font-size:0.65rem;">
                ${r.status === 'forwarded_to_rmg' ? 'Endorsed by PM → In RMG Queue' : (r.status === 'pending_pm' ? 'Pending PM Review' : r.status.toUpperCase())}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  bindEvents(container, sheet, employee) {
    const employeeId = employee.id;
    const weekId = state.selectedWeekId;

    // 1. Cell Inputs with Keyboard Tab / Enter Flow
    container.querySelectorAll('.hour-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const rowId = e.target.getAttribute('data-row-id');
        const dayIdx = parseInt(e.target.getAttribute('data-day-idx'), 10);
        const rawVal = e.target.value.trim();
        const val = parseFloat(rawVal) || 0;

        if (rawVal !== '' && val <= 0) {
          App.showToast("⚠️ Hours cannot be 0. It should be greater than 0.", "warning");
        }

        state.updateCellHours(employeeId, weekId, rowId, dayIdx, Math.max(0, val));
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const rowId = input.getAttribute('data-row-id');
          const dayIdx = parseInt(input.getAttribute('data-day-idx'), 10);
          const nextInput = container.querySelector(`.hour-input[data-row-id="${rowId}"][data-day-idx="${dayIdx + 1}"]`);
          if (nextInput) nextInput.focus();
        }
      });
    });

    // 2. Micro-steppers
    container.querySelectorAll('.btn-step-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowId = btn.getAttribute('data-row-id');
        const dayIdx = parseInt(btn.getAttribute('data-day-idx'), 10);
        const input = container.querySelector(`.hour-input[data-row-id="${rowId}"][data-day-idx="${dayIdx}"]`);
        const current = parseFloat(input.value) || 0;
        const newHrs = current + 0.5;
        state.updateCellHours(employeeId, weekId, rowId, dayIdx, newHrs);
      });
    });

    container.querySelectorAll('.btn-step-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowId = btn.getAttribute('data-row-id');
        const dayIdx = parseInt(btn.getAttribute('data-day-idx'), 10);
        const input = container.querySelector(`.hour-input[data-row-id="${rowId}"][data-day-idx="${dayIdx}"]`);
        const current = parseFloat(input.value) || 0;
        const newHrs = Math.max(0, current - 0.5);
        if (newHrs === 0 && current > 0) {
          App.showToast("⚠️ Hours cannot be 0. It should be greater than 0.", "warning");
        }
        state.updateCellHours(employeeId, weekId, rowId, dayIdx, newHrs);
      });
    });

    // 3. Note trigger (Discreet badge in cell)
    container.querySelectorAll('.cell-note-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rowId = btn.getAttribute('data-row-id');
        const dayIdx = parseInt(btn.getAttribute('data-day-idx'), 10);
        const row = sheet.rows.find(r => r.id === rowId);
        const currentNote = row?.dayNotes ? row.dayNotes[dayIdx] || '' : '';
        const proj = state.getProject(row?.projectId);

        state.openModal('cell-note', {
          employeeId,
          weekId,
          rowId,
          dayIndex: dayIdx,
          dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIdx],
          projectName: proj?.name || 'Project',
          currentNote
        });
      });
    });

    // 4. Daily view textarea notes
    container.querySelectorAll('.daily-note-textarea').forEach(textarea => {
      textarea.addEventListener('change', (e) => {
        const rowId = e.target.getAttribute('data-row-id');
        const dayIdx = parseInt(e.target.getAttribute('data-day-idx'), 10);
        state.updateCellNote(employeeId, weekId, rowId, dayIdx, e.target.value);
        App.showToast('Note saved', 'success');
      });
    });

    // 5. Overtime Modal
    const btnOpenOvertimeModal = container.querySelector('#btnOpenOvertimeModal');
    if (btnOpenOvertimeModal) {
      btnOpenOvertimeModal.addEventListener('click', () => {
        state.openModal('overtime-request', {
          employeeId,
          weekId,
          allocations: state.getEmployeeAllocations(employeeId)
        });
      });
    }

    // 6. Metadata select & input changes (Task Category, Description, and Billable Status)
    container.querySelectorAll('.task-select, .task-desc-input, .billable-select').forEach(elem => {
      elem.addEventListener('change', (e) => {
        const row = e.target.closest('tr')?.getAttribute('data-row-id') || e.target.getAttribute('data-row-id');
        const field = e.target.getAttribute('data-field');
        if (row && field) {
          state.updateRowMetadata(employeeId, weekId, row, field, e.target.value);
          if (field === 'isBillable') {
            App.showToast(`Updated to ${e.target.value === 'true' ? 'Billable' : 'Non-Billable'}`, 'info');
          }
        }
      });
    });

    container.querySelectorAll('.task-workitem-input').forEach(elem => {
      elem.addEventListener('change', (e) => {
        const row = e.target.getAttribute('data-row-id') || e.target.closest('tr')?.getAttribute('data-row-id');
        const projId = e.target.getAttribute('data-proj-id');
        const projName = e.target.getAttribute('data-proj-name');
        if (e.target.value === '__custom__') {
          state.openModal('add-work-item', {
            projectId: projId,
            projectName: projName,
            rowId: row,
            employeeId,
            weekId
          });
        } else if (row) {
          state.updateRowMetadata(employeeId, weekId, row, 'workItem', e.target.value);
        }
      });
    });

    container.querySelectorAll('.btn-add-workitem-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowId = btn.getAttribute('data-row-id');
        const projId = btn.getAttribute('data-proj-id');
        const projName = btn.getAttribute('data-proj-name');
        state.openModal('add-work-item', {
          projectId: projId,
          projectName: projName,
          rowId,
          employeeId,
          weekId
        });
      });
    });

    // 7. Row Delete
    container.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowId = btn.getAttribute('data-row-id');
        state.deleteRow(employeeId, weekId, rowId);
        App.showToast('Row removed', 'warning');
      });
    });

    // 9. Toolbar Automations
    const btnFillWorkdays = container.querySelector('#btnFillWorkdays');
    if (btnFillWorkdays) {
      btnFillWorkdays.addEventListener('click', () => {
        state.quickFillWorkdays(employeeId, weekId);
        App.showToast('Filled standard allocation for Mon–Fri! Target requirements met.', 'success');
      });
    }

    const btnCopyLastWeek = container.querySelector('#btnCopyLastWeek');
    if (btnCopyLastWeek) {
      btnCopyLastWeek.addEventListener('click', () => {
        state.copyLastWeek(employeeId, weekId);
        App.showToast('Copied tasks, hours & notes from last week!', 'success');
      });
    }

    const btnCopyMondayToWeek = container.querySelector('#btnCopyMondayToWeek');
    if (btnCopyMondayToWeek) {
      btnCopyMondayToWeek.addEventListener('click', () => {
        state.copyMondayToWeek(employeeId, weekId);
        App.showToast("Copied Monday's hours & notes across all weekdays!", 'success');
      });
    }

    container.querySelectorAll('[data-action="row-copy-mon"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rowId = btn.getAttribute('data-row-id');
        state.copyMondayToWeek(employeeId, weekId, rowId);
        App.showToast("Copied Monday's schedule for this row across all weekdays!", 'success');
      });
    });

    const btnAddCustomTask = container.querySelector('#btnAddCustomTask');
    if (btnAddCustomTask) {
      btnAddCustomTask.addEventListener('click', () => {
        const allocs = state.getEmployeeAllocations(employeeId);
        const projId = allocs[0]?.projectId || state.data.projects[0].id;
        state.addRow(employeeId, weekId, projId);
        App.showToast('Added project task row', 'success');
      });
    }

    const btnClearSheet = container.querySelector('#btnClearSheet');
    if (btnClearSheet) {
      btnClearSheet.addEventListener('click', () => {
        state.clearTimesheet(employeeId, weekId);
        App.showToast('Cleared timesheet hours', 'warning');
      });
    }

    // 10. Missing days & Nudge quick fills
    const btnResolveMissingDays = container.querySelector('#btnResolveMissingDays');
    if (btnResolveMissingDays) {
      btnResolveMissingDays.addEventListener('click', () => {
        state.quickFillWorkdays(employeeId, weekId);
        App.showToast('Quick-filled missing workdays!', 'success');
      });
    }

    const btnNudgeQuickFill = container.querySelector('#btnNudgeQuickFill');
    if (btnNudgeQuickFill) {
      btnNudgeQuickFill.addEventListener('click', () => {
        state.quickFillWorkdays(employeeId, weekId);
        state.submitTimesheet(employeeId, weekId);
        App.showToast('Auto-filled and submitted timesheet to PM!', 'success');
      });
    }

    // 11. Draft / Submit Actions with Strict Guardrails
    const btnSaveDraft = container.querySelector('#btnSaveDraft');
    if (btnSaveDraft) {
      btnSaveDraft.addEventListener('click', () => {
        state.saveDraft(employeeId, weekId);
        App.showToast('Timesheet draft saved.', 'info');
      });
    }

    const btnSubmitTimesheet = container.querySelector('#btnSubmitTimesheet');
    if (btnSubmitTimesheet) {
      btnSubmitTimesheet.addEventListener('click', () => {
        const currentSheet = state.getOrCreateTimesheet(employeeId, weekId);
        const expHours = state.getWeeklyAllowedHours(employeeId, weekId);
        let curTotal = 0;
        currentSheet.rows.forEach(r => curTotal += r.hours.reduce((s, h) => s + (Number(h) || 0), 0));
        const capCheck = state.isTimesheetOverCapacity(employeeId, weekId);

        if (capCheck.isOver || curTotal > expHours) {
          App.showToast(`⚠️ Limit Exceeded: You logged ${curTotal.toFixed(1)}h against ${expHours}h allocated. Please request your manager for additional hours if you work extra hours.`, 'error');
          return;
        }

        if (curTotal < expHours) {
          App.showToast(`⏳ Incomplete Timesheet: You are left to fill ${(expHours - curTotal).toFixed(1)}h for this duration. Submission is blocked until all ${expHours}h are filled.`, 'warning');
          return;
        }

        const res = state.submitTimesheet(employeeId, weekId);
        if (res && res.success) {
          App.showToast('Timesheet submitted! Forwarded to PM for endorsement.', 'success');
        } else if (res && res.message) {
          App.showToast(res.message, 'error');
        }
      });
    }

    const btnEditAndResubmit = container.querySelector('#btnEditAndResubmit');
    if (btnEditAndResubmit) {
      btnEditAndResubmit.addEventListener('click', () => {
        state.editAndResubmit(sheet.id);
        App.showToast('Timesheet unlocked for revision.', 'info');
      });
    }

    // 12. Daily view day tabs & Toolbar Automations
    [0, 1, 2, 3, 4, 5, 6].forEach(i => {
      const btn = container.querySelector(`#btnSelectDay_${i}`);
      if (btn) {
        btn.addEventListener('click', () => {
          state.setActiveDay(i);
          App.showToast(`Switched day focus to ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}`, 'info');
        });
      }
    });

    const btnDailyFillCap = container.querySelector('#btnDailyFillCap');
    if (btnDailyFillCap) {
      btnDailyFillCap.addEventListener('click', () => {
        const dayIdx = state.activeDayIndex;
        const lock = state.getDayLockStatus(employeeId, dayIdx, weekId);
        if (lock.isLocked) {
          App.showToast(`Cannot log hours on ${lock.label}`, 'warning');
          return;
        }
        const maxAllowed = state.getDailyAllowedHours(employeeId, weekId, dayIdx);
        const hrsPerRow = Math.round((maxAllowed / (sheet.rows.length || 1)) * 10) / 10;
        sheet.rows.forEach(r => {
          r.hours[dayIdx] = hrsPerRow;
          if (!r.dayNotes[dayIdx]) r.dayNotes[dayIdx] = `${r.task} (${hrsPerRow}h)`;
        });
        state.saveState();
        state.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
        App.showToast(`Filled ${maxAllowed}h cap for ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIdx]}!`, 'success');
      });
    }

    const btnDailyAddRow = container.querySelector('#btnDailyAddRow');
    if (btnDailyAddRow) {
      btnDailyAddRow.addEventListener('click', () => {
        const allocs = state.getEmployeeAllocations(employeeId);
        const projId = allocs[0]?.projectId || state.data.projects[0].id;
        state.addRow(employeeId, weekId, projId);
        App.showToast('Added task / role row for today', 'success');
      });
    }

    const btnDailyCopyYesterday = container.querySelector('#btnDailyCopyYesterday');
    if (btnDailyCopyYesterday) {
      btnDailyCopyYesterday.addEventListener('click', () => {
        state.copyYesterday(employeeId, weekId, state.activeDayIndex);
        App.showToast("Copied yesterday's hours and standup notes!", 'success');
      });
    }

    const btnDailyClearDay = container.querySelector('#btnDailyClearDay');
    if (btnDailyClearDay) {
      btnDailyClearDay.addEventListener('click', () => {
        const dayIdx = state.activeDayIndex;
        sheet.rows.forEach(r => {
          r.hours[dayIdx] = 0;
          if (r.dayNotes) r.dayNotes[dayIdx] = '';
        });
        state.saveState();
        state.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
        App.showToast(`Cleared hours for ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIdx]}`, 'warning');
      });
    }

    // 13. Monthly Focus View Navigation
    const btnPrevMonth = container.querySelector('#btnPrevMonth');
    if (btnPrevMonth) {
      btnPrevMonth.addEventListener('click', () => {
        state.prevMonth();
        App.showToast(`Navigated to ${state.selectedMonth}`, 'info');
      });
    }

    const btnNextMonth = container.querySelector('#btnNextMonth');
    if (btnNextMonth) {
      btnNextMonth.addEventListener('click', () => {
        state.nextMonth();
        App.showToast(`Navigated to ${state.selectedMonth}`, 'info');
      });
    }

    container.querySelectorAll('[data-action="set-month"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.getAttribute('data-month');
        if (m) {
          state.setSelectedMonth(m);
          App.showToast(`Viewing ${m}`, 'info');
        }
      });
    });

    container.querySelectorAll('.btn-jump-week').forEach(btn => {
      btn.addEventListener('click', () => {
        const wId = btn.getAttribute('data-week-id');
        if (wId) {
          state.setSelectedWeek(wId);
          state.setViewMode('weekly');
          App.showToast(`Jumped to ${wId} Weekly Grid`, 'success');
        }
      });
    });

    const btnAlertOvertimeModal = container.querySelector('#btnAlertOvertimeModal');
    if (btnAlertOvertimeModal) {
      btnAlertOvertimeModal.addEventListener('click', () => {
        state.openModal('overtime-request', {
          employeeId,
          weekId,
          allocations: state.getEmployeeAllocations(employeeId)
        });
      });
    }

    // 14. Timesheet History Filters and Actions
    container.querySelectorAll('.history-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const st = btn.getAttribute('data-status');
        this.historyStatusFilter = st;
        this.render(container);
      });
    });

    const historyProjectSelect = container.querySelector('#historyProjectSelect');
    if (historyProjectSelect) {
      historyProjectSelect.addEventListener('change', (e) => {
        this.historyProjectFilter = e.target.value;
        this.render(container);
      });
    }

    container.querySelectorAll('[data-action="inspect-history-sheet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetWeekId = btn.getAttribute('data-week-id');
        const sheet = state.getTimesheet(employeeId, targetWeekId);
        state.openModal('review-sheet', { employeeId, weekId: targetWeekId, sheet, isAudit: true });
      });
    });

    container.querySelectorAll('[data-action="open-history-in-editor"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetWeekId = btn.getAttribute('data-week-id');
        if (targetWeekId) {
          state.setSelectedWeek(targetWeekId);
          state.setViewMode('weekly');
          App.showToast(`Opened ${targetWeekId} in Weekly Grid editor`, 'success');
        }
      });
    });
  }
};

if (typeof window !== 'undefined') window.EmployeeView = EmployeeView;
if (typeof global !== 'undefined') global.EmployeeView = EmployeeView;
if (typeof module !== 'undefined') module.exports = EmployeeView;
