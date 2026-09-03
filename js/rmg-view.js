/* ==========================================================================
   Pulse Resource Manager (RMG) View: Workforce Governance & Sign-off Hub
   ========================================================================== */

const RMGView = {
  render(container) {
    const employees = state.data.employees;
    const projects = state.data.projects;
    const allocations = state.data.allocations;
    const requests = state.data.resourceRequests;
    const overtimeRequests = state.data.overtimeRequests || [];
    const selectedWeekId = state.selectedWeekId;
    const selectedPmId = state.rmgSelectedPmId || 'all';

    let benchCount = 0;
    let fullCount = 0;
    let partialCount = 0;
    let overCount = 0;

    const employeeRows = employees.map(emp => {
      const empAllocs = allocations.filter(a => a.employeeId === emp.id);
      const totalHours = empAllocs.reduce((sum, a) => sum + Number(a.hoursPerDay), 0);
      const utilPct = Math.round((totalHours / 8) * 100);

      let statusType = 'full';
      if (utilPct === 0) {
        statusType = 'bench';
        benchCount++;
      } else if (utilPct < 100) {
        statusType = 'partial';
        partialCount++;
      } else if (utilPct === 100) {
        statusType = 'full';
        fullCount++;
      } else {
        statusType = 'over';
        overCount++;
      }

      return {
        employee: emp,
        allocations: empAllocs,
        totalHours,
        utilPct,
        statusType
      };
    });

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const pendingOvertimeForRMG = overtimeRequests.filter(r => r.status === 'forwarded_to_rmg');
    const pendingPmApprovedTimesheets = state.data.timesheets.filter(t => t.status === 'pm_approved');
    const orgSummary = state.getOrgTimesheetSummary(selectedWeekId);

    const targetPMs = selectedPmId === 'all' 
      ? state.data.projectManagers 
      : state.data.projectManagers.filter(p => p.id === selectedPmId);

    let html = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <!-- 1. Header & Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; background:#ffffff; padding:0.85rem 1.15rem; border-radius:var(--radius-md); border:1px solid var(--grid-border); box-shadow:var(--shadow-xs);">
          <div>
            <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary);">
              Resource Management & Governance Hub (RMG)
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
              Workforce capacity, PM submission oversight, reminder dispatches, timesheet final certification, and talent allocation
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn-secondary" id="btnNudgeAllUnfilledOrg" style="font-size:0.72rem; padding:0.25rem 0.6rem; color:var(--status-over-solid);">
              🔔 Nudge All Unfilled (${orgSummary.draftCount})
            </button>
            <button class="btn-secondary" id="btnNudgeAllPendingPmsOrg" style="font-size:0.72rem; padding:0.25rem 0.6rem; color:var(--brand-700);">
              📢 Remind Pending PMs (${orgSummary.submittedCount})
            </button>
            <button class="btn-primary" id="btnCreateNewAllocation" style="font-size:0.72rem; padding:0.25rem 0.75rem;">
              ➕ Create Allocation
            </button>
          </div>
        </div>

        <!-- 2. KPI Metrics Summary Cards -->
        <div class="stats-overview-row">
          <div class="stat-card">
            <div>
              <div class="stat-label">Total Workforce</div>
              <div class="stat-val">${employees.length}</div>
            </div>
            <span style="font-size:0.72rem; color:var(--text-muted);">${projects.length} Projects</span>
          </div>

          <div class="stat-card" style="border-left:3.5px solid #10b981;">
            <div>
              <div class="stat-label">On Bench (0% Utilized)</div>
              <div class="stat-val" style="color:#059669;">${benchCount}</div>
            </div>
            <span class="alloc-badge badge-bench" style="font-size:0.65rem;"><span class="alloc-dot"></span> Available</span>
          </div>

          <div class="stat-card" style="border-left:3.5px solid #f97316;">
            <div>
              <div class="stat-label">Partial Allocation</div>
              <div class="stat-val" style="color:#ea580c;">${partialCount}</div>
            </div>
            <span class="alloc-badge badge-partial" style="font-size:0.65rem;"><span class="alloc-dot"></span> 1-99% Load</span>
          </div>

          <div class="stat-card" style="border-left:3.5px solid #ef4444;">
            <div>
              <div class="stat-label">100% Fully Allocated</div>
              <div class="stat-val" style="color:#dc2626;">${fullCount}</div>
            </div>
            <span class="alloc-badge badge-full" style="font-size:0.65rem;"><span class="alloc-dot"></span> Full Capacity</span>
          </div>

          <div class="stat-card" style="border-left:3px solid var(--brand-700);">
            <div>
              <div class="stat-label">Pending PM Sign-Off</div>
              <div class="stat-val" style="color:var(--brand-700);">${orgSummary.submittedCount}</div>
            </div>
            <span class="status-badge status-submitted" style="font-size:0.65rem;">With PM</span>
          </div>

          <div class="stat-card" style="border-left:3px solid var(--status-approved-solid);">
            <div>
              <div class="stat-label">In RMG Final Queue</div>
              <div class="stat-val" style="color:var(--status-approved-text);">${pendingPmApprovedTimesheets.length}</div>
            </div>
            <span class="status-badge status-pm_approved" style="font-size:0.65rem;">To Certify</span>
          </div>
        </div>

        <!-- 3. PM & Team Timesheet Governance & Nudge Control Center -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Project Manager & Team Submission Governance</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
                Monitor timesheet status per PM team, view unfilled employees, and dispatch targeted reminders
              </div>
            </div>

            <!-- Filter by PM Dropdown -->
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <label for="rmgPmTeamFilterSelect" style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">
                PM Team:
              </label>
              <select id="rmgPmTeamFilterSelect" class="form-select" style="width:auto; min-width:200px; padding:0.25rem 0.6rem; font-size:0.75rem;">
                <option value="all" ${selectedPmId === 'all' ? 'selected' : ''}>🌐 All PM Teams</option>
                ${state.data.projectManagers.map(pm => `
                  <option value="${pm.id}" ${selectedPmId === pm.id ? 'selected' : ''}>
                    👔 ${pm.name} (${pm.title})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${targetPMs.map(pm => {
              const teamSummary = state.getPMTimesheetSummary(pm.id, selectedWeekId);
              if (!teamSummary) return '';

              return `
                <div style="border:1px solid var(--grid-border); border-radius:var(--radius-sm); overflow:hidden; background:#ffffff;">
                  <div style="background:#f8fafc; border-bottom:1px solid var(--grid-border); padding:0.6rem 0.85rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                      <strong style="font-size:0.85rem; color:var(--text-primary);">${pm.name}</strong>
                      <span style="font-size:0.7rem; color:var(--text-muted); margin-left:0.35rem;">(${pm.title})</span>
                      <span style="font-size:0.7rem; color:var(--text-muted); margin-left:0.5rem;">
                        Projects: ${teamSummary.projects.map(p => p.name).join(', ')}
                      </span>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                      <span class="status-badge status-draft" style="font-size:0.65rem;">⏳ ${teamSummary.draftCount} Unfilled</span>
                      <span class="status-badge status-submitted" style="font-size:0.65rem;">⏱ ${teamSummary.submittedCount} Pending PM</span>
                      <span class="status-badge status-pm_approved" style="font-size:0.65rem;">📋 ${teamSummary.pmApprovedCount} In RMG</span>
                      <span class="status-badge status-approved" style="font-size:0.65rem;">✓ ${teamSummary.approvedCount} Approved</span>

                      ${teamSummary.draftCount > 0 ? `
                        <button class="btn-secondary" data-action="rmg-nudge-pm-team-unfilled" data-pm-id="${pm.id}" style="font-size:0.68rem; padding:0.15rem 0.45rem; color:var(--status-over-solid);">
                          🔔 Nudge Unfilled
                        </button>
                      ` : ''}
                      ${teamSummary.submittedCount > 0 ? `
                        <button class="btn-primary" data-action="rmg-nudge-pm-direct" data-pm-id="${pm.id}" data-pending-count="${teamSummary.submittedCount}" style="font-size:0.68rem; padding:0.15rem 0.5rem;">
                          📢 Remind PM
                        </button>
                      ` : ''}
                    </div>
                  </div>

                  <table class="rmg-matrix-table" style="margin:0;">
                    <thead>
                      <tr>
                        <th>Team Member</th>
                        <th>Assigned Project(s)</th>
                        <th>Logged Hours</th>
                        <th>Status</th>
                        <th style="text-align:right;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${teamSummary.teamMembers.length === 0 ? `
                        <tr><td colspan="5" style="text-align:center; padding:0.85rem; color:var(--text-muted);">No members currently allocated.</td></tr>
                      ` : teamSummary.teamMembers.map(member => {
                        const emp = member.employee;
                        const sheet = member.sheet;
                        const status = member.status;
                        const isDraft = status === 'draft';
                        const isSubmitted = status === 'submitted';

                        return `
                          <tr>
                            <td>
                              <div style="font-weight:600; color:var(--text-primary); font-size:0.8rem;">${emp?.name}</div>
                              <div style="font-size:0.68rem; color:var(--text-muted);">${emp?.role}</div>
                            </td>
                            <td style="font-size:0.75rem; color:var(--text-secondary);">
                              ${member.allocations.map(a => `${state.getProject(a.projectId)?.name || 'Project'} (${a.hoursPerDay}h/d)`).join(', ')}
                            </td>
                            <td>
                              <strong class="tabular-nums" style="font-size:0.8rem; color:${member.totalLoggedHours >= member.targetWeeklyHours ? 'var(--status-approved-text)' : 'var(--text-primary)'};">
                                ${member.totalLoggedHours.toFixed(1)}h / ${member.targetWeeklyHours}h
                              </strong>
                            </td>
                            <td>
                              <span class="status-badge status-${status}" style="font-size:0.65rem;">
                                ${status === 'pm_approved' ? 'IN RMG QUEUE' : status.toUpperCase()}
                              </span>
                            </td>
                            <td style="text-align:right;">
                              <div style="display:inline-flex; gap:0.3rem;">
                                ${isDraft ? `
                                  <button class="btn-secondary" data-action="rmg-nudge-single-emp" data-emp-id="${emp.id}" style="font-size:0.68rem; padding:0.15rem 0.4rem; color:var(--status-over-solid);">
                                    🔔 Nudge
                                  </button>
                                ` : ''}
                                ${isSubmitted ? `
                                  <button class="btn-secondary" data-action="rmg-remind-pm-single" data-pm-id="${pm.id}" data-emp-id="${emp.id}" style="font-size:0.68rem; padding:0.15rem 0.4rem; color:var(--brand-700);">
                                    📢 Remind PM
                                  </button>
                                ` : ''}
                                ${sheet ? `
                                  <button class="btn-secondary" data-action="rmg-inspect-sheet" data-emp-id="${emp.id}" data-sheet-id="${sheet.id}" style="font-size:0.68rem; padding:0.15rem 0.4rem;">
                                    Inspect
                                  </button>
                                ` : ''}
                              </div>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 4. Overtime & Extra Hours Governance Queue (PM-Endorsed) -->
        <div class="chart-card" style="border-left:3px solid #7c3aed;">
          <div class="chart-header">
            <div>
              <div class="chart-title">Overtime & Capacity Expansion Requests (PM-Endorsed)</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
                Review and approve extra hours endorsed by Project Managers for sprint delivery
              </div>
            </div>
            <span class="status-badge" style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; font-size:0.68rem;">
              ${pendingOvertimeForRMG.length} Pending Sign-Off
            </span>
          </div>

          <div style="overflow-x:auto;">
            <table class="rmg-matrix-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Project</th>
                  <th>Extra Hours</th>
                  <th>Target Date</th>
                  <th>PM Endorsement & Justification</th>
                  <th>Status</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${overtimeRequests.length === 0 ? `
                  <tr><td colspan="7" style="text-align:center; padding:1.25rem; color:var(--text-muted);">No overtime requests in system.</td></tr>
                ` : overtimeRequests.map(req => {
                  const emp = state.getEmployee(req.employeeId);
                  const isPendingRmg = req.status === 'forwarded_to_rmg';
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';

                  return `
                    <tr>
                      <td>
                        <strong style="color:var(--text-primary); font-size:0.8rem;">${req.employeeName || emp?.name}</strong>
                        <div style="font-size:0.68rem; color:var(--text-muted);">${emp?.role || 'Engineer'}</div>
                      </td>
                      <td style="font-size:0.75rem; font-weight:600; color:var(--brand-700);">
                        ${req.projectName}
                      </td>
                      <td>
                        <strong class="tabular-nums" style="font-size:0.85rem; color:#7c3aed; background:#f5f3ff; padding:0.1rem 0.4rem; border-radius:var(--radius-xs); border:1px solid #ddd6fe;">
                          +${req.extraHours}h
                        </strong>
                      </td>
                      <td style="font-size:0.75rem; color:var(--text-secondary);">
                        ${req.dateRequested || '2026-08-26'}
                      </td>
                      <td style="font-size:0.75rem; max-width:280px;">
                        <div style="color:var(--text-primary); font-style:italic;">"${req.justification}"</div>
                        <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                          Endorsed by PM: <strong>${req.pmName || 'PM'}</strong> ${req.pmNotes ? `("${req.pmNotes}")` : ''}
                        </div>
                      </td>
                      <td>
                        <span class="status-badge status-${isApproved ? 'approved' : (isRejected ? 'rejected' : (isPendingRmg ? 'pm_approved' : 'submitted'))}" style="font-size:0.65rem;">
                          ${isPendingRmg ? 'PENDING RMG' : req.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style="text-align:right;">
                        ${isPendingRmg ? `
                          <div style="display:inline-flex; gap:0.3rem;">
                            <button class="btn-primary" data-action="rmg-approve-ot" data-ot-id="${req.id}" style="font-size:0.68rem; padding:0.18rem 0.6rem; background:#7c3aed; border-color:#7c3aed;">
                              ✓ Approve Extra Hours
                            </button>
                            <button class="btn-secondary" data-action="rmg-reject-ot" data-ot-id="${req.id}" style="font-size:0.68rem; padding:0.18rem 0.45rem; color:var(--status-rejected-text);">
                              Decline
                            </button>
                          </div>
                        ` : (isApproved ? `
                          <span style="font-size:0.7rem; color:var(--status-approved-text); font-weight:600;">✓ Approved</span>
                        ` : `
                          <span style="font-size:0.7rem; color:var(--status-rejected-text); font-weight:600;">Declined</span>
                        `)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. PM-Approved Timesheets Queue (Final Certification by RMG) -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">PM-Approved Timesheets Queue (Final RMG Sign-off)</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
                Timesheets reviewed by PMs ready for final certification and payroll archiving
              </div>
            </div>
            ${pendingPmApprovedTimesheets.length > 0 ? `
              <button class="btn-primary" id="btnApproveAllRmgTimesheets" style="font-size:0.72rem; padding:0.25rem 0.65rem;">
                ✓ Certify All (${pendingPmApprovedTimesheets.length})
              </button>
            ` : ''}
          </div>

          <div style="overflow-x:auto;">
            <table class="rmg-matrix-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>PM Endorser</th>
                  <th>Logged Hours</th>
                  <th>Status</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pendingPmApprovedTimesheets.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center; padding:1.25rem; color:var(--text-muted);">No pending PM-approved timesheets in queue.</td></tr>
                ` : pendingPmApprovedTimesheets.map(sheet => {
                  const emp = state.getEmployee(sheet.employeeId);
                  const totalHrs = sheet.rows.reduce((sum, r) => sum + r.hours.reduce((hSum, h) => hSum + (Number(h) || 0), 0), 0);

                  return `
                    <tr>
                      <td>
                        <strong style="color:var(--text-primary); font-size:0.8rem;">${emp?.name}</strong>
                        <div style="font-size:0.68rem; color:var(--text-muted);">${emp?.role}</div>
                      </td>
                      <td style="font-size:0.75rem;">
                        ${sheet.pmApprovedByName || 'Project Manager'}
                      </td>
                      <td>
                        <strong class="tabular-nums" style="font-size:0.8rem;">${totalHrs.toFixed(1)}h</strong>
                      </td>
                      <td>
                        <span class="status-badge status-pm_approved" style="font-size:0.65rem;">PM Endorsed</span>
                      </td>
                      <td style="text-align:right;">
                        <div style="display:inline-flex; gap:0.3rem;">
                          <button class="btn-secondary" data-action="rmg-inspect-sheet" data-emp-id="${emp.id}" data-sheet-id="${sheet.id}" style="font-size:0.68rem; padding:0.15rem 0.45rem;">
                            Inspect
                          </button>
                          <button class="btn-primary" data-action="rmg-approve-sheet" data-sheet-id="${sheet.id}" style="font-size:0.68rem; padding:0.15rem 0.55rem;">
                            ✓ Certify
                          </button>
                          <button class="btn-secondary" data-action="rmg-reject-sheet" data-sheet-id="${sheet.id}" data-emp-id="${emp.id}" style="font-size:0.68rem; padding:0.15rem 0.45rem; color:var(--status-rejected-text);">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. Capacity Matrix & Allocation Board -->
        <div class="chart-card">
          <div class="chart-header">
            <div class="chart-title">Workforce Capacity Matrix</div>
          </div>
          <div style="overflow-x:auto;">
            <table class="rmg-matrix-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Current Allocations</th>
                  <th>Total Allocated</th>
                  <th>Utilization</th>
                  <th style="text-align:right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${employeeRows.map(row => {
                  let fillClass = 'fill-bench';
                  let badgeHtml = '<span class="alloc-badge badge-bench"><span class="alloc-dot"></span> 0% Bench (Available)</span>';
                  let allocHtml = '<span class="alloc-badge badge-bench"><span class="alloc-dot"></span> Bench (0h Available)</span>';

                  if (row.utilPct === 0) {
                    fillClass = 'fill-bench';
                    badgeHtml = '<span class="alloc-badge badge-bench"><span class="alloc-dot"></span> 0% Bench (Available)</span>';
                    allocHtml = '<span class="alloc-badge badge-bench"><span class="alloc-dot"></span> Bench (0h Available)</span>';
                  } else if (row.utilPct < 100) {
                    fillClass = 'fill-partial';
                    badgeHtml = `<span class="alloc-badge badge-partial"><span class="alloc-dot"></span> ${row.utilPct}% Partial</span>`;
                    allocHtml = row.allocations.map(a => `<span style="display:inline-block; margin:2px 4px 2px 0; padding:2px 7px; background:#fff7ed; border:1px solid #fed7aa; color:#c2410c; border-radius:3px; font-weight:600; font-size:0.72rem;">● ${state.getProject(a.projectId)?.name || 'Project'} (${a.hoursPerDay}h/d)</span>`).join('');
                  } else if (row.utilPct === 100) {
                    fillClass = 'fill-full';
                    badgeHtml = `<span class="alloc-badge badge-full"><span class="alloc-dot"></span> 100% Fully Allocated</span>`;
                    allocHtml = row.allocations.map(a => `<span style="display:inline-block; margin:2px 4px 2px 0; padding:2px 7px; background:#fff1f2; border:1px solid #fecdd3; color:#be123c; border-radius:3px; font-weight:600; font-size:0.72rem;">● ${state.getProject(a.projectId)?.name || 'Project'} (${a.hoursPerDay}h/d)</span>`).join('');
                  } else {
                    fillClass = 'fill-over';
                    badgeHtml = `<span class="alloc-badge badge-over"><span class="alloc-dot"></span> ${row.utilPct}% Over-Allocated</span>`;
                    allocHtml = row.allocations.map(a => `<span style="display:inline-block; margin:2px 4px 2px 0; padding:2px 7px; background:#fef2f2; border:1px solid #fca5a5; color:#991b1b; border-radius:3px; font-weight:600; font-size:0.72rem;">● ${state.getProject(a.projectId)?.name || 'Project'} (${a.hoursPerDay}h/d)</span>`).join('');
                  }

                  return `
                    <tr>
                      <td>
                        <strong style="color:var(--text-primary); font-size:0.8rem;">${row.employee.name}</strong>
                        <div style="font-size:0.68rem; color:var(--text-muted);">${row.employee.role}</div>
                      </td>
                      <td>
                        ${allocHtml}
                      </td>
                      <td class="tabular-nums" style="font-size:0.8rem; font-weight:600;">
                        ${row.totalHours}h / 8h
                      </td>
                      <td>
                        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                          <div class="utilization-bar-container" title="Utilization: ${row.utilPct}%">
                            <div class="utilization-bar-fill ${fillClass}" style="width:${row.utilPct === 0 ? 100 : Math.min(100, row.utilPct)}%;"></div>
                          </div>
                          ${badgeHtml}
                        </div>
                      </td>
                      <td style="text-align:right;">
                        <button class="btn-secondary" data-action="allocate-emp" data-emp-id="${row.employee.id}" style="font-size:0.68rem; padding:0.15rem 0.45rem;">
                          Manage Allocation
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.bindEvents(container);
  },

  bindEvents(container) {
    const selectedWeekId = state.selectedWeekId;

    // Filter Dropdown
    const filterSelect = container.querySelector('#rmgPmTeamFilterSelect');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        state.setRmgSelectedPmId(e.target.value);
        App.showToast(`Filtered RMG Governance by: ${e.target.selectedOptions[0].text}`, 'info');
      });
    }

    // Reminders
    const btnNudgeAllUnfilledOrg = container.querySelector('#btnNudgeAllUnfilledOrg');
    if (btnNudgeAllUnfilledOrg) {
      btnNudgeAllUnfilledOrg.addEventListener('click', () => {
        const count = state.nudgeAllUnfilledEmployeesFromRMG(selectedWeekId);
        App.showToast(`RMG notice dispatched to ${count} employees with unfilled timesheets.`, 'success');
      });
    }

    const btnNudgeAllPendingPmsOrg = container.querySelector('#btnNudgeAllPendingPmsOrg');
    if (btnNudgeAllPendingPmsOrg) {
      btnNudgeAllPendingPmsOrg.addEventListener('click', () => {
        const count = state.nudgeAllPendingPMsFromRMG(selectedWeekId);
        App.showToast(`RMG sign-off reminder sent to ${count} Project Managers.`, 'info');
      });
    }

    // Team nudges
    container.querySelectorAll('[data-action="rmg-nudge-pm-team-unfilled"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pmId = btn.getAttribute('data-pm-id');
        const count = state.nudgeAllUnfilledEmployeesFromRMG(selectedWeekId, pmId);
        App.showToast(`Nudge dispatched to ${count} employees in this PM team.`, 'success');
      });
    });

    container.querySelectorAll('[data-action="rmg-nudge-pm-direct"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pmId = btn.getAttribute('data-pm-id');
        state.nudgePMFromRMG(pmId, selectedWeekId);
        const pm = state.getPM(pmId);
        App.showToast(`Sign-off notice dispatched to ${pm?.name || 'PM'}.`, 'info');
      });
    });

    container.querySelectorAll('[data-action="rmg-nudge-single-emp"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        state.nudgeEmployeeFromRMG(empId, selectedWeekId);
        const emp = state.getEmployee(empId);
        App.showToast(`RMG submission reminder dispatched to ${emp?.name || 'Employee'}.`, 'info');
      });
    });

    container.querySelectorAll('[data-action="rmg-remind-pm-single"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pmId = btn.getAttribute('data-pm-id');
        state.nudgePMFromRMG(pmId, selectedWeekId);
        const pm = state.getPM(pmId);
        App.showToast(`Sign-off reminder dispatched to ${pm?.name || 'PM'}.`, 'info');
      });
    });

    // Allocations
    const btnCreateNewAllocation = container.querySelector('#btnCreateNewAllocation');
    if (btnCreateNewAllocation) {
      btnCreateNewAllocation.addEventListener('click', () => {
        state.openModal('new-allocation', {});
      });
    }

    container.querySelectorAll('[data-action="allocate-emp"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        state.openModal('new-allocation', { employeeId: empId });
      });
    });

    // Certify / Reject Timesheets
    container.querySelectorAll('[data-action="rmg-approve-sheet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sheetId = btn.getAttribute('data-sheet-id');
        state.approveTimesheetByRMG(sheetId, 'rmg_elena');
        App.showToast('Timesheet certified & archived! Employee and PM notified.', 'success');
      });
    });

    container.querySelectorAll('[data-action="rmg-reject-sheet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sheetId = btn.getAttribute('data-sheet-id');
        const empId = btn.getAttribute('data-emp-id');
        state.openModal('rejection', { sheetId, employeeId: empId, stage: 'rmg' });
      });
    });

    container.querySelectorAll('[data-action="rmg-inspect-sheet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        const sheetId = btn.getAttribute('data-sheet-id');
        const sheet = state.data.timesheets.find(t => t.id === sheetId) || state.getOrCreateTimesheet(empId, state.selectedWeekId);
        state.openModal('review-sheet', { employeeId: empId, sheet, isRmgReview: true });
      });
    });

    // Overtime Approval & Rejection by RMG
    container.querySelectorAll('[data-action="rmg-approve-ot"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const otId = btn.getAttribute('data-ot-id');
        state.approveOvertimeRequestByRMG(otId);
        App.showToast('Extra hours request approved by RMG! Capacity officially updated.', 'success');
      });
    });

    container.querySelectorAll('[data-action="rmg-reject-ot"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const otId = btn.getAttribute('data-ot-id');
        state.rejectOvertimeRequestByRMG(otId);
        App.showToast('Extra hours request declined by RMG.', 'warning');
      });
    });

    const btnApproveAllRmgTimesheets = container.querySelector('#btnApproveAllRmgTimesheets');
    if (btnApproveAllRmgTimesheets) {
      btnApproveAllRmgTimesheets.addEventListener('click', () => {
        const pmApproved = state.data.timesheets.filter(t => t.status === 'pm_approved');
        pmApproved.forEach(sheet => {
          state.approveTimesheetByRMG(sheet.id, 'rmg_elena');
        });
        App.showToast(`Certified ${pmApproved.length} PM-endorsed timesheets!`, 'success');
      });
    }
  }
};

if (typeof window !== 'undefined') window.RMGView = RMGView;
if (typeof global !== 'undefined') global.RMGView = RMGView;
if (typeof module !== 'undefined') module.exports = RMGView;
