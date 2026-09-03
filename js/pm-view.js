/* ==========================================================================
   Pulse Project Manager (PM) View: High-Density Team Review Workspace
   ========================================================================== */

const PMView = {
  render(container) {
    const pm = state.getActivePM();
    const weekId = state.selectedWeekId;
    const pmProjects = state.data.projects.filter(p => pm.projectIds.includes(p.id));

    // Find all employees allocated to PM's projects
    const pmAllocations = state.data.allocations.filter(a => pm.projectIds.includes(a.projectId));
    const teamEmployeeIds = [...new Set(pmAllocations.map(a => a.employeeId))];
    const teamEmployees = state.data.employees.filter(e => teamEmployeeIds.includes(e.id));

    // Compile team status records for current week
    const teamRecords = teamEmployees.map(emp => {
      const sheet = state.getTimesheet(emp.id, weekId) || {
        status: 'draft',
        rows: []
      };
      const allocs = pmAllocations.filter(a => a.employeeId === emp.id);
      const allocatedHrs = allocs.reduce((sum, a) => sum + (Number(a.hoursPerDay) * 5), 0);
      
      const loggedHrs = sheet.rows ? sheet.rows.reduce((sum, r) => {
        return sum + r.hours.reduce((hSum, h) => hSum + (Number(h) || 0), 0);
      }, 0) : 0;

      return {
        employee: emp,
        allocations: allocs,
        allocatedHrs,
        loggedHrs,
        sheet
      };
    });

    const stats = {
      totalTeam: teamEmployees.length,
      submitted: teamRecords.filter(r => r.sheet.status === 'submitted').length,
      pm_approved: teamRecords.filter(r => r.sheet.status === 'pm_approved').length,
      approved: teamRecords.filter(r => r.sheet.status === 'approved').length,
      draft: teamRecords.filter(r => r.sheet.status === 'draft').length,
      rejected: teamRecords.filter(r => r.sheet.status === 'rejected').length
    };

    // Filter incoming overtime requests for this PM
    const pmProjectIds = pm.projectIds || [];
    const pendingOvertimeReqs = (state.data.overtimeRequests || []).filter(r => 
      pmProjectIds.includes(r.projectId) && r.status === 'pending_pm'
    );
    const overtimeEmployeesCount = [...new Set(pendingOvertimeReqs.map(r => r.employeeId))].length;

    let html = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <!-- RMG Escalation Reminder Banner -->
        ${pm.rmgNudged && stats.submitted > 0 ? `
          <div style="background:var(--brand-50); border:1px solid var(--brand-200); border-left:3px solid var(--brand-700); padding:0.65rem 1rem; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <strong style="color:var(--brand-900); font-size:0.85rem;">RMG Sign-Off Notice: ${stats.submitted} Timesheet(s) Awaiting Review</strong>
              <div style="font-size:0.75rem; color:var(--text-secondary);">Elena Rostova (Head of RMG) requested endorsement for pending team timesheets.</div>
            </div>
            <button class="btn-primary" id="btnApproveAndForwardAll" style="font-size:0.75rem; padding:0.3rem 0.75rem;">
              ✓ Endorse All (${stats.submitted}) to RMG →
            </button>
          </div>
        ` : ''}

        <!-- 1. Header with PM Project Badges & Action -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; background:#ffffff; padding:0.85rem 1.15rem; border-radius:var(--radius-md); border:1px solid var(--grid-border); box-shadow:var(--shadow-xs);">
          <div>
            <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary);">
              ${pm.name}'s Project Management Hub
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
              <span style="font-weight:600; color:var(--text-secondary);">Managed Projects (Click for Details):</span>
              ${pmProjects.map(p => `
                <button 
                  type="button" 
                  class="btn-quick" 
                  data-action="open-project-details" 
                  data-project-id="${p.id}" 
                  style="cursor:pointer; display:inline-flex; align-items:center; gap:0.35rem; font-weight:700; font-size:0.72rem; color:${p.color || 'var(--brand-700)'}; background:#ffffff; padding:0.25rem 0.65rem; border-radius:var(--radius-sm); border:1px solid var(--grid-border); box-shadow:0 1px 2px rgba(0,0,0,0.04);"
                  title="Click to view full project breakdown, allocated team, work items and timesheet status"
                >
                  <span style="font-size:0.85rem;">●</span>
                  <span>${p.name}</span>
                  <span style="font-size:0.65rem; background:var(--bg-canvas); padding:1px 5px; border-radius:3px; color:var(--text-muted); margin-left:2px;">🔍 Details</span>
                </button>
              `).join('')}
            </div>
          </div>

          <button class="btn-primary" id="btnOpenRequestResourceModal" style="font-size:0.75rem;">
            ➕ Request Resource from RMG
          </button>
        </div>

        <!-- 2. KPI Metrics Summary Cards (5 Cards) -->
        <div class="stats-overview-row">
          <!-- Card 1: Managed Team -->
          <div class="stat-card">
            <div>
              <div class="stat-label">Managed Team</div>
              <div class="stat-val">${stats.totalTeam}</div>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted);">${pmProjects.length} Projects</span>
          </div>

          <!-- Card 2: Pending Approvals -->
          <div class="stat-card" style="border-left:3px solid var(--brand-700);">
            <div>
              <div class="stat-label">Pending Approvals</div>
              <div class="stat-val" style="color:var(--brand-700);">${stats.submitted}</div>
            </div>
            <span class="status-badge status-submitted" style="font-size:0.65rem;">To Review</span>
          </div>

          <!-- Card 3: Returned / Rejected (Replaced In RMG Queue) -->
          <div class="stat-card" style="border-left:3px solid var(--status-rejected-solid);">
            <div>
              <div class="stat-label">Returned / Rejected</div>
              <div class="stat-val" style="color:var(--status-rejected-text);">${stats.rejected}</div>
            </div>
            <span class="status-badge status-rejected" style="font-size:0.65rem;">Revisions</span>
          </div>

          <!-- Card 4: Approved Timesheets -->
          <div class="stat-card" style="border-left:3px solid var(--status-approved-solid);">
            <div>
              <div class="stat-label">Approved Timesheets</div>
              <div class="stat-val" style="color:var(--status-approved-text);">${stats.approved}</div>
            </div>
            <span class="status-badge status-approved" style="font-size:0.65rem;">Approved</span>
          </div>

          <!-- Card 5: Extra Hours / Overtime Requests -->
          <div class="stat-card" style="border-left:3px solid #7c3aed;">
            <div>
              <div class="stat-label">Extra Hours Requests</div>
              <div class="stat-val" style="color:#7c3aed;">${overtimeEmployeesCount} <span style="font-size:0.75rem; font-weight:500; color:var(--text-muted);">(${pendingOvertimeReqs.length} reqs)</span></div>
            </div>
            <span class="status-badge" style="background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe; font-size:0.65rem;">${pendingOvertimeReqs.length} Pending</span>
          </div>
        </div>

        <!-- 3. Overtime Requests Endorsement Queue (Employee -> PM -> RMG) -->
        ${pendingOvertimeReqs.length > 0 ? `
          <div class="chart-card" style="border-left:3px solid var(--brand-700);">
            <div class="chart-header">
              <div>
                <div class="chart-title">Overtime & Capacity Expansion Requests</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
                  Endorse and forward excess hours requests to RMG for final sign-off
                </div>
              </div>
              <span class="status-badge status-submitted" style="font-size:0.68rem;">
                ${pendingOvertimeReqs.length} Pending
              </span>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${pendingOvertimeReqs.map(req => `
                <div style="border:1px solid var(--grid-border); border-radius:var(--radius-sm); padding:0.65rem 0.85rem; background:#ffffff; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
                  <div>
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                      <strong style="font-size:0.85rem; color:var(--text-primary);">${req.employeeName}</strong>
                      <span style="font-size:0.7rem; font-weight:700; background:var(--brand-50); color:var(--brand-700); padding:0.1rem 0.4rem; border-radius:var(--radius-xs);">
                        +${req.extraHours}h on ${req.projectName}
                      </span>
                      <span style="font-size:0.7rem; color:var(--text-muted);">for ${req.dateRequested}</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
                      "${req.justification}"
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:0.4rem;">
                    <button class="btn-secondary" data-action="pm-reject-ot" data-ot-id="${req.id}" style="color:var(--status-rejected-text); font-size:0.72rem; padding:0.25rem 0.6rem;">
                      Decline
                    </button>
                    <button class="btn-primary" data-action="pm-forward-ot" data-ot-id="${req.id}" style="font-size:0.72rem; padding:0.25rem 0.75rem;">
                      ✓ Endorse to RMG →
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4. Team Timesheet Submission Board -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="chart-title">Team Timesheet Submissions</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:1px;">
                Review submissions, inspect granular notes, and endorse hours to send to RMG
              </div>
            </div>
            <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
              ${stats.submitted > 0 ? `
                <button class="btn-primary" id="btnApproveAllSubmitted" style="font-size:0.72rem; padding:0.25rem 0.65rem;">
                  ✓ Endorse All (${stats.submitted}) to RMG →
                </button>
              ` : ''}
              <button class="btn-secondary" id="btnNudgeAllDrafts" style="font-size:0.72rem; padding:0.25rem 0.65rem;">
                🔔 Nudge All Pending
              </button>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table class="pm-team-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Assigned Projects</th>
                  <th>Weekly Cap</th>
                  <th>Logged Hours</th>
                  <th>Billable Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${teamRecords.map(rec => this.renderTeamRow(rec, pm.id)).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 5. Team Status Breakdown & Budget Utilization Charts -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Submission Status Distribution</div>
            </div>
            <div style="position:relative; height:180px;">
              <canvas id="pmTeamStatusCanvas"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <div class="chart-title">Project Burn & Hours Consumed</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.85rem; padding:0.25rem 0;">
              ${pmProjects.map(proj => {
                const pct = Math.round((proj.loggedHours / proj.budgetHours) * 100);
                return `
                  <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; margin-bottom:0.25rem;">
                      <span style="color:${proj.color};">● ${proj.name}</span>
                      <span class="tabular-nums">${proj.loggedHours}h / ${proj.budgetHours}h (${pct}%)</span>
                    </div>
                    <div style="height:6px; background:var(--bg-canvas); border-radius:var(--radius-full); overflow:hidden;">
                      <div style="height:100%; width:${pct}%; background:${proj.color}; border-radius:var(--radius-full);"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.bindEvents(container, teamRecords, pm.id);
  },

  renderTeamRow(rec, pmId) {
    const { employee, allocatedHrs, loggedHrs, sheet } = rec;
    const isSubmitted = sheet.status === 'submitted';
    const isPmApproved = sheet.status === 'pm_approved';
    const isApproved = sheet.status === 'approved';
    const isDraft = sheet.status === 'draft';
    const isRejected = sheet.status === 'rejected';

    let billableHrs = 0;
    if (sheet.rows) {
      sheet.rows.forEach(r => {
        if (r.isBillable !== false) {
          billableHrs += r.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
        }
      });
    }

    const projLinks = rec.allocations.map(a => {
      const p = state.getProject(a.projectId);
      if (!p) return '<span>Internal</span>';
      return `
        <button 
          type="button" 
          class="btn-quick" 
          data-action="open-project-details" 
          data-project-id="${p.id}" 
          style="font-size:0.72rem; padding:0.12rem 0.45rem; font-weight:600; color:${p.color || 'var(--brand-700)'}; cursor:pointer; background:#ffffff; border:1px solid var(--grid-border); border-radius:var(--radius-xs);"
          title="Click to view full project breakdown for ${p.name}"
        >
          ● ${p.name}
        </button>
      `;
    }).join(' ');

    return `
      <tr data-emp-id="${employee.id}">
        <td>
          <div style="font-weight:600; color:var(--text-primary);">${employee.name}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${employee.role}</div>
        </td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
            ${projLinks || '<span style="color:var(--text-muted); font-size:0.75rem;">Internal</span>'}
          </div>
        </td>
        <td class="tabular-nums" style="font-size:0.75rem;">${allocatedHrs}h</td>
        <td>
          <strong class="tabular-nums" style="font-size:0.85rem; color:${loggedHrs === allocatedHrs ? 'var(--status-approved-text)' : 'var(--text-primary)'};">
            ${loggedHrs.toFixed(1)}h
          </strong>
        </td>
        <td>
          <span class="billable-pill is-billable" style="font-size:0.7rem;">
            ⚡ ${billableHrs.toFixed(1)}h
          </span>
        </td>
        <td>
          <span class="status-badge status-${sheet.status}">
            <span class="status-dot"></span>
            ${sheet.status === 'pm_approved' ? 'IN RMG QUEUE' : sheet.status.toUpperCase()}
          </span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
            <button class="btn-secondary" data-action="inspect-sheet" data-emp-id="${employee.id}" style="font-size:0.72rem; padding:0.2rem 0.5rem;">
              Inspect
            </button>
            ${isSubmitted ? `
              <button class="btn-primary" data-action="pm-approve" data-emp-id="${employee.id}" style="font-size:0.72rem; padding:0.2rem 0.6rem;">
                ✓ Endorse to RMG
              </button>
              <button class="btn-secondary" data-action="pm-reject" data-emp-id="${employee.id}" style="font-size:0.72rem; padding:0.2rem 0.5rem; color:var(--status-rejected-text);">
                Reject
              </button>
            ` : ''}
            ${isDraft ? `
              <button class="btn-secondary" data-action="nudge-emp" data-emp-id="${employee.id}" style="font-size:0.72rem; padding:0.2rem 0.5rem;">
                🔔 Nudge
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  },

  bindEvents(container, teamRecords, pmId) {
    const weekId = state.selectedWeekId;

    // Open Project Details Modal on Click
    container.querySelectorAll('[data-action="open-project-details"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = btn.getAttribute('data-project-id');
        if (projectId) {
          state.openModal('project-details', { projectId, pmId, weekId });
        }
      });
    });

    container.querySelectorAll('[data-action="inspect-sheet"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        const sheet = state.getTimesheet(empId, weekId);
        state.openModal('review-sheet', { employeeId: empId, sheet, isAudit: true });
      });
    });

    container.querySelectorAll('[data-action="pm-approve"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        const sheet = state.getTimesheet(empId, weekId);
        if (sheet) {
          state.approveTimesheetByPM(sheet.id, pmId);
          App.showToast('Timesheet endorsed and forwarded to RMG queue for final approval!', 'success');
        }
      });
    });

    container.querySelectorAll('[data-action="pm-reject"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        const sheet = state.getTimesheet(empId, weekId);
        state.openModal('rejection', { sheetId: sheet?.id, employeeId: empId, stage: 'pm' });
      });
    });

    container.querySelectorAll('[data-action="nudge-emp"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        state.nudgeEmployee(empId, pmId);
        const emp = state.getEmployee(empId);
        App.showToast(`Nudge notification sent to ${emp?.name || 'Employee'}.`, 'info');
      });
    });

    const btnApproveAllSubmitted = container.querySelector('#btnApproveAllSubmitted') || container.querySelector('#btnApproveAndForwardAll');
    if (btnApproveAllSubmitted) {
      btnApproveAllSubmitted.addEventListener('click', () => {
        const count = state.approveAllSubmitted(pmId, weekId);
        App.showToast(`All submitted timesheets (${count}) endorsed and forwarded to RMG!`, 'success');
      });
    }

    const btnNudgeAllDrafts = container.querySelector('#btnNudgeAllDrafts');
    if (btnNudgeAllDrafts) {
      btnNudgeAllDrafts.addEventListener('click', () => {
        const count = state.nudgeAllPending(pmId, weekId);
        App.showToast(`Nudge sent to ${count} employee(s) with pending drafts.`, 'info');
      });
    }

    const btnOpenRequestResourceModal = container.querySelector('#btnOpenRequestResourceModal');
    if (btnOpenRequestResourceModal) {
      btnOpenRequestResourceModal.addEventListener('click', () => {
        const pm = state.getActivePM();
        state.openModal('request-resource', { pmId, projectIds: pm?.projectIds || [] });
      });
    }

    // Overtime Endorsement & Reject
    container.querySelectorAll('[data-action="pm-forward-ot"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const otId = btn.getAttribute('data-ot-id');
        state.forwardOvertimeRequestToRMG(otId);
        App.showToast('Overtime request endorsed and forwarded to RMG for final approval!', 'success');
      });
    });

    container.querySelectorAll('[data-action="pm-reject-ot"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const otId = btn.getAttribute('data-ot-id');
        state.rejectOvertimeRequestByPM(otId);
        App.showToast('Overtime request declined.', 'warning');
      });
    });

    // Render PM charts
    if (typeof Charts !== 'undefined' && Charts.renderPMTeamStatusChart) {
      Charts.renderPMTeamStatusChart('pmTeamStatusCanvas', teamRecords);
    }
  }
};

if (typeof window !== 'undefined') window.PMView = PMView;
if (typeof global !== 'undefined') global.PMView = PMView;
if (typeof module !== 'undefined') module.exports = PMView;
