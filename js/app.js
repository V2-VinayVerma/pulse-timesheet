/* ==========================================================================
   Pulse Master Application Orchestrator & Modal Handlers (Enhanced)
   ========================================================================== */

const App = {
  init() {
    this.container = document.getElementById('app');
    this.setupTooltipEngine();
    this.setupListeners();
    this.render();
  },

  setupTooltipEngine() {
    let tooltipEl = document.getElementById('pulseGlobalTooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'pulseGlobalTooltip';
      tooltipEl.className = 'pulse-tooltip-bubble';
      tooltipEl.innerHTML = `
        <div class="pulse-tooltip-header">
          <span class="pulse-tooltip-title" id="pulseTooltipTitle"></span>
          <span class="pulse-tooltip-badge" id="pulseTooltipBadge"></span>
        </div>
        <div class="pulse-tooltip-content" id="pulseTooltipContent"></div>
        <div class="pulse-tooltip-hint" id="pulseTooltipHint">
          <span>💡</span> <span>Click to edit or view task notes</span>
        </div>
        <div class="pulse-tooltip-arrow"></div>
      `;
      document.body.appendChild(tooltipEl);
    }

    const titleEl = document.getElementById('pulseTooltipTitle');
    const badgeEl = document.getElementById('pulseTooltipBadge');
    const contentEl = document.getElementById('pulseTooltipContent');

    const showTooltip = (target) => {
      const note = target.getAttribute('data-tooltip-note');
      if (!note) return;

      const title = target.getAttribute('data-tooltip-title') || 'Standup Note';
      const hours = target.getAttribute('data-tooltip-hours') || '';

      titleEl.innerHTML = `<span>💬</span> <span>${title}</span>`;
      if (hours) {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = hours;
      } else {
        badgeEl.style.display = 'none';
      }

      contentEl.textContent = note;

      // Position logic
      const rect = target.getBoundingClientRect();
      tooltipEl.classList.add('is-visible');

      const tooltipWidth = tooltipEl.offsetWidth || 260;
      const tooltipHeight = tooltipEl.offsetHeight || 90;

      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));

      let top = rect.top - tooltipHeight - 10;
      let placement = 'top';

      if (top < 10) {
        top = rect.bottom + 10;
        placement = 'bottom';
      }

      tooltipEl.setAttribute('data-placement', placement);
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    };

    const hideTooltip = () => {
      if (tooltipEl) {
        tooltipEl.classList.remove('is-visible');
      }
    };

    document.body.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip-note]');
      if (target) {
        showTooltip(target);
      }
    });

    document.body.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip-note]');
      if (target) {
        hideTooltip();
      }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
  },

  setupListeners() {
    state.subscribe((event, payload) => {
      this.render();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.currentRole === 'employee' && state.viewMode === 'weekly') {
          const emp = state.getActiveEmployee();
          const sheet = state.getTimesheet(emp.id, state.selectedWeekId);
          if (sheet) {
            const dailyTotals = [0, 1, 2, 3, 4, 5, 6].map(d => sheet.rows.reduce((s, r) => s + (Number(r.hours[d]) || 0), 0));
            const expectedHrs = state.getEmployeeExpectedHoursPerDay(emp.id);
            PulseCharts.renderWeeklyHoursChart('empHoursCanvas', dailyTotals, expectedHrs);
          }
        } else if (state.currentRole === 'rmg') {
          PulseCharts.renderUtilizationDonut('rmgUtilDonut', state.getOrgUtilizationStats());
        }
      }, 100);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.modalState.activeModal) {
        state.closeModal();
      }
    });
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '✕';
    if (type === 'nudge') icon = '🔔';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-closing');
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  },

  render() {
    const role = state.currentRole;
    const activeUserId = state.activeUserId;
    const currentWeek = state.weeks.find(w => w.id === state.selectedWeekId) || state.weeks[3];
    const unreadNotifs = state.getActiveUserUnreadCount();

    let activeUserName = 'Alex Chen';
    let roleLabel = 'Senior Full-Stack Engineer';
    if (role === 'employee') {
      const emp = state.getActiveEmployee();
      if (emp) {
        activeUserName = emp.name;
        roleLabel = emp.role;
      }
    } else if (role === 'pm') {
      const pmObj = state.getActivePM();
      if (pmObj) {
        activeUserName = pmObj.name;
        roleLabel = 'Project Manager';
      }
    } else if (role === 'rmg') {
      activeUserName = 'Elena Rostova';
      roleLabel = 'Head of Resource Management';
    }

    const pm = state.getActivePM();
    const pmProjects = state.data.projects.filter(p => p.pmId === pm.id);
    const pmPendingCount = state.data.timesheets.filter(t => t.status === 'submitted').length;
    const rmgPendingCount = state.data.timesheets.filter(t => t.status === 'pm_approved').length + 
                           state.data.resourceRequests.filter(r => r.status === 'pending').length + 
                           ((state.data.overtimeRequests || []).filter(r => r.status === 'forwarded_to_rmg').length);

    let userOptionsHtml = '';
    if (role === 'employee') {
      userOptionsHtml = state.data.employees.map(e => `
        <option value="${e.id}" ${e.id === activeUserId ? 'selected' : ''}>${e.name} (${e.role.split(' ')[0]})</option>
      `).join('');
    } else if (role === 'pm') {
      userOptionsHtml = state.data.projectManagers.map(p => `
        <option value="${p.id}" ${p.id === activeUserId ? 'selected' : ''}>${p.name} (PM)</option>
      `).join('');
    } else if (role === 'rmg') {
      userOptionsHtml = `
        <option value="rmg_elena" selected>Elena Rostova (Head of RMG)</option>
      `;
    }

    const html = `
      <div class="app-shell">
        <!-- 1. Left Sidebar Navigation -->
        <aside class="app-sidebar" id="appSidebar">
          <!-- Brand Logo -->
          <div class="sidebar-brand">
            <div class="brand-group">
              <div class="brand-icon-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div class="brand-title">
                <span>PULSE</span>
                <span class="brand-tag">PROTOTYPE</span>
              </div>
            </div>
          </div>

          <!-- Active User Profile Card in Sidebar -->
          <div class="sidebar-user-card">
            <div class="sidebar-user-avatar">
              ${this.getUserInitials()}
            </div>
            <div class="sidebar-user-info">
              <div class="sidebar-user-name" title="${activeUserName}">${activeUserName}</div>
              <div class="sidebar-user-role" title="${roleLabel}">${roleLabel}</div>
            </div>
          </div>

          <!-- Role Selector Switcher -->
          <div class="sidebar-role-selector">
            <button class="sidebar-role-btn ${role === 'employee' ? 'active' : ''}" id="tabRoleEmployee" title="Switch to Employee Timesheet Workspace">
              <span>👨‍💻</span> Emp
            </button>
            <button class="sidebar-role-btn ${role === 'pm' ? 'active' : ''}" id="tabRolePM" title="Switch to Project Manager Hub">
              <span>📊</span> PM
              ${pmPendingCount > 0 ? `<span class="sidebar-badge">${pmPendingCount}</span>` : ''}
            </button>
            <button class="sidebar-role-btn ${role === 'rmg' ? 'active' : ''}" id="tabRoleRMG" title="Switch to Resource Management (RMG) Governance">
              <span>🎯</span> RMG
              ${rmgPendingCount > 0 ? `<span class="sidebar-badge">${rmgPendingCount}</span>` : ''}
            </button>
          </div>

          <!-- Role-Aware Navigation Menu -->
          <nav class="sidebar-nav-menu">
            ${role === 'employee' ? `
              <div class="nav-section-title">Timesheet Workspace</div>
              <button class="nav-item-btn ${state.viewMode === 'weekly' ? 'active' : ''}" id="sideNavWeekly">
                <span class="nav-icon">📅</span>
                <span class="nav-label">Weekly Grid</span>
              </button>
              <button class="nav-item-btn ${state.viewMode === 'daily' ? 'active' : ''}" id="sideNavDaily">
                <span class="nav-icon">🎯</span>
                <span class="nav-label">Daily Focus</span>
              </button>
              <button class="nav-item-btn ${state.viewMode === 'monthly' ? 'active' : ''}" id="sideNavMonthly">
                <span class="nav-icon">📊</span>
                <span class="nav-label">Monthly Overview</span>
              </button>
              <button class="nav-item-btn ${state.viewMode === 'history' ? 'active' : ''}" id="sideNavHistory">
                <span class="nav-icon">📜</span>
                <span class="nav-label">Timesheet History</span>
                <span class="nav-pill-count">${state.weeks.length}</span>
              </button>
            ` : (role === 'pm' ? `
              <div class="nav-section-title">Project Management</div>
              <button class="nav-item-btn active" id="sideNavPmTeam">
                <span class="nav-icon">👥</span>
                <span class="nav-label">Team Submissions</span>
                ${pmPendingCount > 0 ? `<span class="sidebar-badge">${pmPendingCount}</span>` : ''}
              </button>

              <div class="nav-section-title">Managed Projects (Click)</div>
              ${pmProjects.map(p => `
                <button class="nav-item-btn" data-action="open-project-details" data-project-id="${p.id}" style="font-size:0.75rem;">
                  <span style="color:${p.color || 'var(--brand-700)'}; font-size:0.85rem;">●</span>
                  <span class="nav-label">${p.name}</span>
                </button>
              `).join('')}
            ` : `
              <div class="nav-section-title">Resource Governance</div>
              <button class="nav-item-btn active" id="sideNavRmgMatrix">
                <span class="nav-icon">🏢</span>
                <span class="nav-label">Allocation Matrix</span>
              </button>
            `)}
          </nav>

          <!-- Sidebar Bottom Footer Utilities -->
          <div class="sidebar-footer">
            <button class="sidebar-action-btn" id="btnOpenNotifications" title="View in-app notifications and approval logs">
              <span>🔔 Notifications</span>
              ${unreadNotifs > 0 ? `<span class="notif-badge-pill">${unreadNotifs}</span>` : ''}
            </button>

            <div class="sidebar-persona-wrap">
              <label class="sidebar-micro-label">Simulate Persona:</label>
              <select class="sidebar-persona-select" id="userPersonaSelect">
                ${userOptionsHtml}
              </select>
            </div>

            <button class="sidebar-reset-btn" id="btnResetDemoData" title="Reset all demo state">
              ↺ Reset Demo Data
            </button>
          </div>
        </aside>

        <!-- 2. Main Content Workspace Area -->
        <div class="app-content-wrapper">
          <!-- Top Context Strip (Period & Breadcrumbs) -->
          <header class="top-context-bar">
            <div class="top-context-left">
              <!-- Date Navigation Controls -->
              <div class="date-controls">
                <button class="date-nav-btn" id="btnPrevWeek" title="Previous Week">◀</button>
                <span class="current-period-label">
                  <span>${currentWeek.label}</span>
                  ${currentWeek.isCurrent ? '<span class="period-tag">CURRENT</span>' : ''}
                </span>
                <button class="date-nav-btn" id="btnNextWeek" title="Next Week">▶</button>
              </div>

              <button class="date-nav-btn" id="btnCurrentWeek" style="border:1px solid var(--grid-border); background:var(--bg-canvas); width:auto; padding:0 0.55rem; font-weight:600; font-size:0.75rem;">
                Today
              </button>

              <div class="top-breadcrumb" style="margin-left:0.5rem;">
                <span>›</span>
                <span class="top-breadcrumb-active">
                  ${role === 'employee' 
                    ? (state.viewMode === 'history' ? 'Timesheet History & Archive' : (state.viewMode === 'monthly' ? 'Monthly Focus' : (state.viewMode === 'daily' ? 'Daily Focus Mode' : 'Weekly Timesheet Grid')))
                    : (role === 'pm' ? `${activeUserName}'s Project Hub` : 'Resource Management Office')
                  }
                </span>
              </div>
            </div>

            <div class="top-context-right">
              ${role === 'employee' ? `
                <div class="view-mode-toggle">
                  <button class="view-mode-btn ${state.viewMode === 'weekly' ? 'active' : ''}" id="btnViewWeekly">
                    Weekly
                  </button>
                  <button class="view-mode-btn ${state.viewMode === 'daily' ? 'active' : ''}" id="btnViewDaily">
                    Daily
                  </button>
                  <button class="view-mode-btn ${state.viewMode === 'monthly' ? 'active' : ''}" id="btnViewMonthly">
                    Monthly
                  </button>
                  <button class="view-mode-btn ${state.viewMode === 'history' ? 'active' : ''}" id="btnViewHistory">
                    History
                  </button>
                </div>
              ` : ''}
            </div>
          </header>

          <!-- Main Dynamic Views Container -->
          <main class="app-main" style="padding: 1.25rem 1.5rem 3rem 1.5rem;">
            <section class="view-section ${role === 'employee' ? 'active' : ''}" id="sectionEmployee"></section>
            <section class="view-section ${role === 'pm' ? 'active' : ''}" id="sectionPM"></section>
            <section class="view-section ${role === 'rmg' ? 'active' : ''}" id="sectionRMG"></section>
          </main>
        </div>

        <!-- Dynamic Modals Overlay Container -->
        <div class="modal-overlay ${state.modalState.activeModal ? 'is-active' : ''}" id="globalModalOverlay">
          <div class="modal-card ${state.modalState.activeModal === 'project-details' || state.modalState.activeModal === 'review-sheet' || state.modalState.activeModal === 'timesheet-audit' ? 'modal-card-wide' : ''}">
            ${this.renderModalContent()}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindGlobalEvents();

    if (typeof document !== 'undefined') {
      const secEmp = document.getElementById('sectionEmployee');
      const secPM = document.getElementById('sectionPM');
      const secRMG = document.getElementById('sectionRMG');

      if (role === 'employee' && secEmp) EmployeeView.render(secEmp);
      if (role === 'pm' && secPM) PMView.render(secPM);
      if (role === 'rmg' && secRMG) RMGView.render(secRMG);
    }
  },

  getUserInitials() {
    const role = state.currentRole;
    if (role === 'employee') {
      return state.getActiveEmployee()?.avatar || 'EM';
    } else if (role === 'pm') {
      return state.getActivePM()?.avatar || 'PM';
    }
    return 'ER';
  },

  renderModalContent() {
    const modalType = state.modalState.activeModal;
    const modalData = state.modalState.data;

    if (!modalType) return '';

    // 1. Cell Note Modal (Per-Day Description for a project row)
    if (modalType === 'cell-note') {
      const { employeeId, weekId, rowId, dayIndex, dayName, projectName, currentNote } = modalData;
      return `
        <div class="modal-header">
          <div class="modal-title">
            <span>📝</span>
            <span>Day Activity Description: ${dayName} (${projectName})</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.85rem; color:var(--text-secondary);">
            Add granular details for the hours you worked on <strong>${projectName}</strong> on <strong>${dayName}</strong>.
          </p>
          <div class="form-group">
            <label class="form-label">Task Description / Activity Details *</label>
            <textarea class="form-textarea" id="txtCellNoteInput" rows="4" placeholder="e.g. Fixed OAuth2 token expiry refresh and refactored API interceptor.">${currentNote || ''}</textarea>
            <span class="form-hint">Visible to your Project Manager during weekly review.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Cancel</button>
          <button class="btn-primary" id="btnSaveCellNote">Save Day Description</button>
        </div>
      `;
    }

    // 2. Overtime & Extra Hours Request Modal (Employee -> PM -> RMG)
    if (modalType === 'overtime-request') {
      const { employeeId, weekId, allocations } = modalData;
      const emp = state.getEmployee(employeeId);
      const userProjects = state.getEmployeeProjects(employeeId);

      return `
        <div class="modal-header">
          <div class="modal-title">
            <span>⚡</span>
            <span>Request Overtime / Extra Capacity</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:var(--radius-md); padding:0.75rem 1rem; font-size:0.85rem; color:#0369a1;">
            💡 <strong>Multi-Tier Workflow:</strong> Your request will be sent to your <strong>Project Manager</strong> for endorsement, and then forwarded to <strong>RMG</strong> for final allocation capacity increase.
          </div>

          <div class="form-group">
            <label class="form-label">Select Project</label>
            <select class="form-select" id="otProjectSelect">
              ${userProjects.map(p => `<option value="${p.id}">${p.name} (PM: ${state.data.projectManagers.find(pm => pm.id === p.pmId)?.name || 'PM'})</option>`).join('')}
            </select>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Day / Date</label>
              <select class="form-select" id="otDaySelect">
                <option value="0">Monday (Aug 24)</option>
                <option value="1">Tuesday (Aug 25)</option>
                <option value="2" selected>Wednesday (Aug 26 - Today)</option>
                <option value="3">Thursday (Aug 27)</option>
                <option value="4">Friday (Aug 28)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Extra Hours Needed</label>
              <input type="number" step="0.5" min="0.5" max="8" class="form-input" id="otExtraHoursInput" value="2.0">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Business Justification / Reason *</label>
            <textarea class="form-textarea" id="otJustificationInput" rows="3" placeholder="Explain why extra hours are required (e.g. Critical production release, urgent client bug fix, sprint blocker resolution)..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Cancel</button>
          <button class="btn-primary" id="btnSubmitOvertimeRequest" style="background:#7c3aed;">
            Submit Request to PM →
          </button>
        </div>
      `;
    }

    // 3. Rejection Modal
    if (modalType === 'rejection' || modalType === 'reject-reason') {
      return `
        <div class="modal-header">
          <div class="modal-title">
            <span style="color:#e11d48;">⚠️</span>
            <span>Return Timesheet for Revision</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.875rem; color:var(--text-secondary);">
            Please provide a specific reason for returning this timesheet. The employee will see your note in their dashboard and will be able to edit and resubmit their hours.
          </p>
          <div class="form-group">
            <label class="form-label">Rejection Remarks / Requested Changes *</label>
            <textarea class="form-textarea" id="txtRejectionReason" rows="4" placeholder="e.g. Please clarify Wednesday's 4h logged under Architecture Review and add work item task breakdown."></textarea>
            <span class="form-hint">Mandatory feedback required before rejection.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Cancel</button>
          <button class="btn-primary" id="btnConfirmRejection" style="background:#e11d48;">
            Confirm & Return to Employee
          </button>
        </div>
      `;
    }

    // 4. New Allocation Modal (with Live Conflict Check!)
    if (modalType === 'new-allocation') {
      const selectedEmpId = modalData?.employeeId || state.data.employees[0].id;
      const emp = state.getEmployee(selectedEmpId);
      const currentAllocHours = state.getEmployeeExpectedHoursPerDay(selectedEmpId);

      return `
        <div class="modal-header">
          <div class="modal-title">
            <span>➕</span>
            <span>Create New Resource Allocation</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Select Employee</label>
            <select class="form-select" id="allocEmployeeSelect">
              ${state.data.employees.map(e => `
                <option value="${e.id}" ${e.id === selectedEmpId ? 'selected' : ''}>
                  ${e.name} (${e.role}) — Current: ${state.getEmployeeExpectedHoursPerDay(e.id)}h/day (${state.getEmployeeUtilization(e.id)}%)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Assign to Project</label>
            <select class="form-select" id="allocProjectSelect">
              ${state.data.projects.map(p => `
                <option value="${p.id}">${p.name} (${p.client})</option>
              `).join('')}
            </select>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Hours / Day</label>
              <input type="number" step="0.5" min="1" max="16" class="form-input" id="allocHoursInput" value="4">
            </div>
            <div class="form-group">
              <label class="form-label">Role Description</label>
              <input type="text" class="form-input" id="allocRoleInput" value="Assigned Developer">
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" class="form-input" id="allocStartDate" value="2026-09-01">
            </div>
            <div class="form-group">
              <label class="form-label">End Date</label>
              <input type="date" class="form-input" id="allocEndDate" value="2026-11-30">
            </div>
          </div>

          <div id="allocConflictWarningBox" class="conflict-alert" style="${currentAllocHours + 4 > 8 ? 'display:flex;' : 'display:none;'}">
            <span>⚠️</span>
            <div>
              <strong>High Utilization Warning:</strong>
              <div id="allocConflictText">
                Assigning this allocation will bring ${emp?.name || 'employee'} to <strong>${currentAllocHours + 4}h/day (${Math.round(((currentAllocHours + 4) / 8) * 100)}%)</strong>, exceeding standard 8h/day capacity!
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Cancel</button>
          <button class="btn-primary" id="btnConfirmAllocation">
            Confirm & Save Allocation
          </button>
        </div>
      `;
    }

    // 5. Request Resource Modal (PM -> RMG)
    if (modalType === 'request-resource' || modalType === 'resource-request') {
      const pmProjects = state.data.projects.filter(p => (modalData?.projectIds || []).includes(p.id));

      return `
        <div class="modal-header">
          <div class="modal-title">
            <span>➕</span>
            <span>Request Additional Resource Capacity</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Target Project</label>
            <select class="form-select" id="reqProjectSelect">
              ${(pmProjects.length > 0 ? pmProjects : state.data.projects).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Role / Skill Required</label>
            <input type="text" class="form-input" id="reqRoleInput" value="Senior Backend Engineer (Node.js & PostgreSQL)">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Hours / Week</label>
              <input type="number" class="form-input" id="reqHoursWeek" value="20" min="5" max="40" step="5">
            </div>
            <div class="form-group">
              <label class="form-label">Duration (Weeks)</label>
              <input type="number" class="form-input" id="reqDurationWeeks" value="4" min="1" max="24">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Justification & Scope Notes</label>
            <textarea class="form-textarea" id="reqNotes" rows="3" placeholder="Explain sprint milestones and why extra capacity is needed..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Cancel</button>
          <button class="btn-primary" id="btnConfirmResourceRequest">
            Submit Request to RMG
          </button>
        </div>
      `;
    }

    // 6. Review Sheet Detailed Modal with Day-by-Day Task Notes
    if (modalType === 'review-sheet' || modalType === 'timesheet-audit') {
      const employeeId = modalData.employeeId;
      const sheet = modalData.sheet || state.getTimesheet(employeeId, modalData.weekId || state.selectedWeekId);
      const isAudit = modalData.isAudit;
      const emp = state.getEmployee(employeeId);
      const isSubmitted = sheet?.status === 'submitted';

      let total = 0;
      if (sheet && sheet.rows) {
        sheet.rows.forEach(r => total += r.hours.reduce((s, h) => s + (Number(h) || 0), 0));
      }
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      return `
        <div class="modal-header">
          <div class="modal-title">
            <span>📋</span>
            <span>Timesheet Inspection: ${emp?.name || 'Employee'} (${sheet.weekId})</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-canvas); padding:0.85rem 1rem; border-radius:var(--radius-md); border:1px solid var(--grid-border); flex-wrap:wrap; gap:0.5rem;">
            <div>
              <strong>${emp?.name}</strong> • ${emp?.role} (${emp?.department})
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="status-badge status-${sheet.status}">${sheet.status.toUpperCase()}</span>
              <strong class="tabular-nums" style="font-size:1.05rem;">${total.toFixed(1)}h Total</strong>
            </div>
          </div>

          <div style="margin-top:0.5rem; overflow-x:auto;">
            <table class="timesheet-table" style="min-width:100%;">
              <thead>
                <tr>
                  <th style="text-align:left; padding-left:1rem;">Project & Work Item</th>
                  <th style="text-align:center;">Billable</th>
                  <th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${sheet.rows.map(row => {
                  const proj = state.getProject(row.projectId);
                  const rTot = row.hours.reduce((s, h) => s + (Number(h) || 0), 0);
                  const isBillable = row.isBillable !== false;
                  return `
                    <tr>
                      <td style="padding:0.75rem 1rem;">
                        <strong style="color:${proj?.color || 'var(--brand-700)'};">● ${proj?.name}</strong>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">${row.task} (${row.workItem})</div>
                      </td>
                      <td style="text-align:center;">
                        <span class="billable-pill ${isBillable ? 'is-billable' : 'non-billable'}">
                          ${isBillable ? '⚡ Billable' : '⚪ Non-Billable'}
                        </span>
                      </td>
                      ${row.hours.map((h, d) => {
                        const note = row.dayNotes ? row.dayNotes[d] || '' : '';
                        return `
                          <td style="text-align:center; font-family:var(--font-mono); font-weight:700; vertical-align:middle;">
                            <div>${Number(h) || '-'}</div>
                            ${note ? `
                              <div 
                                style="font-size:0.65rem; color:#6d28d9; background:#f5f3ff; border:1px solid #ddd6fe; border-radius:3px; padding:1px 4px; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:2px auto 0; cursor:pointer;" 
                                data-tooltip-note="${note.replace(/"/g, '&quot;')}"
                                data-tooltip-title="${days[d]} • ${proj?.name || 'Task'}"
                                data-tooltip-hours="${Number(h) || 0}h"
                              >
                                💬 ${note}
                              </div>
                            ` : ''}
                          </td>
                        `;
                      }).join('')}
                      <td style="text-align:center; font-family:var(--font-mono); font-weight:800; background:#f8fafc;">${rTot}h</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Close</button>
          ${isSubmitted && !isAudit && state.currentRole === 'pm' ? `
            <button class="btn-secondary" id="btnModalReject" style="color:#e11d48; border-color:#fecdd3;">✕ Reject with Note</button>
            <button class="btn-primary" id="btnModalApprove" style="background:#10b981;">✓ Approve & Forward to RMG →</button>
          ` : ''}
          ${(sheet.status === 'pm_approved' || modalData.isRmgReview) && state.currentRole === 'rmg' ? `
            <button class="btn-secondary" id="btnModalRmgReject" style="color:#e11d48; border-color:#fecdd3;">✕ Reject / Return</button>
            <button class="btn-primary" id="btnModalRmgApprove" style="background:#10b981;">✓ Final Approve & Archive</button>
          ` : ''}
        </div>
      `;
    }

    // 7. Notifications Center Modal (Strictly Filtered by Active Role & Persona!)
    if (modalType === 'notifications') {
      const notifs = state.getActiveUserNotifications();
      const unreadCount = state.getActiveUserUnreadCount();
      const role = state.currentRole;
      let activeUserName = 'User';
      let roleIcon = '🔔';
      let roleTitle = 'Feed';

      if (role === 'employee') {
        const emp = state.getActiveEmployee();
        activeUserName = emp ? emp.name : 'Employee';
        roleIcon = '👤';
        roleTitle = `${activeUserName} (Employee)`;
      } else if (role === 'pm') {
        const pm = state.getActivePM();
        activeUserName = pm ? pm.name : 'Project Manager';
        roleIcon = '👔';
        roleTitle = `${activeUserName} (PM)`;
      } else if (role === 'rmg') {
        activeUserName = 'Elena Rostova (RMG)';
        roleIcon = '🎯';
        roleTitle = 'Elena Rostova (Head of RMG)';
      }

      return `
        <div class="modal-header" style="background:#f8fafc;">
          <div>
            <div class="modal-title" style="font-size:1.1rem; display:flex; align-items:center; gap:0.5rem;">
              <span>${roleIcon}</span>
              <span>Notifications & Activity Feed for ${roleTitle}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
              Personalized live notifications strictly routed to your account and role
            </div>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body" style="max-height:60vh; overflow-y:auto; padding:1.25rem;">
          ${notifs.length === 0 ? `
            <div style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">✨</div>
              <div style="font-weight:700; color:var(--text-primary);">All caught up!</div>
              <div style="font-size:0.85rem; margin-top:4px;">No notifications recorded for ${activeUserName} at this time.</div>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${notifs.map(n => `
                <div style="border:1px solid ${!n.read ? 'var(--brand-300)' : 'var(--grid-border)'}; border-radius:var(--radius-md); padding:0.85rem 1rem; background:${!n.read ? 'var(--brand-50)' : 'white'}; display:flex; gap:0.85rem; box-shadow:var(--shadow-xs); transition:all 0.15s ease;">
                  <div style="font-size:1.35rem; display:flex; align-items:flex-start; padding-top:2px;">
                    ${n.type === 'rejection' ? '⚠️' : (n.type === 'approval' ? '🎉' : (n.type === 'nudge' ? '🔔' : (n.type === 'overtime' ? '⚡' : '📥')))}
                  </div>
                  <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                      <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">${n.title}</div>
                      ${!n.read ? `
                        <span style="font-size:0.68rem; font-weight:800; background:var(--brand-600); color:white; padding:0.1rem 0.45rem; border-radius:var(--radius-xs);">
                          NEW
                        </span>
                      ` : ''}
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:3px; line-height:1.4;">${n.message}</div>
                    <div style="font-size:0.75rem; color:var(--text-light); margin-top:5px; display:flex; align-items:center; gap:0.4rem;">
                      <span>🕒</span>
                      <span>${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${new Date(n.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
        <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            ${unreadCount > 0 ? `
              <button class="btn-secondary" id="btnMarkAllNotifsRead" style="font-size:0.8rem; padding:0.35rem 0.75rem; color:var(--brand-700); border-color:var(--brand-300);">
                ✓ Mark All as Read (${unreadCount})
              </button>
            ` : ''}
          </div>
          <button class="btn-secondary" id="btnCancelModal">Close</button>
        </div>
      `;
    }

    // 8. Add Custom Work Item Modal
    if (modalType === 'add-work-item') {
      const { projectId, projectName, rowId, employeeId, weekId } = modalData || {};
      const proj = state.getProject(projectId);
      const existingItems = proj?.workItems || [];

      return `
        <div class="modal-header">
          <div class="modal-title">
            <span>📌</span>
            <span>Add Work Item for ${projectName || proj?.name || 'Project'}</span>
          </div>
          <button class="modal-close-btn" id="btnCloseModal">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.75rem;">
            Add a specific task / work item or Jira ticket for this project. It will be assigned to your timesheet row and added to the project work items list.
          </p>
          <div class="form-group">
            <label class="form-label">Work Item Name / Jira Ticket *</label>
            <input type="text" class="form-input" id="txtCustomWorkItemName" placeholder="e.g. APEX-412: Kafka Event Pipeline Sync" autofocus />
          </div>

          ${existingItems.length > 0 ? `
            <div style="margin-top:0.75rem;">
              <label class="form-label" style="font-size:0.75rem; color:var(--text-muted);">Existing Project Work Items:</label>
              <div style="display:flex; flex-wrap:wrap; gap:0.35rem; max-height:120px; overflow-y:auto; padding:0.25rem 0;">
                ${existingItems.map(item => `
                  <button type="button" class="btn-quick btn-select-existing-workitem" data-item="${item}" style="font-size:0.7rem; padding:0.15rem 0.45rem;">
                    ${item}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btnCancelModal">Cancel</button>
          <button class="btn-primary" id="btnSaveCustomWorkItem" data-proj-id="${projectId}" data-row-id="${rowId}" data-emp-id="${employeeId}" data-week-id="${weekId}">
            ✓ Add & Assign Work Item
          </button>
        </div>
      `;
    }

    // 9. Project Details & Team Workspace Modal (for PM / RMG)
    if (modalType === 'project-details') {
      const { projectId, weekId: targetWeekId, pmId } = modalData || {};
      const weekId = targetWeekId || state.selectedWeekId;
      const proj = state.getProject(projectId);
      if (!proj) return '';

      const pm = state.data.projectManagers.find(p => p.id === proj.pmId) || state.getActivePM();
      const projAllocs = state.data.allocations.filter(a => a.projectId === projectId);
      const teamEmployeeIds = [...new Set(projAllocs.map(a => a.employeeId))];
      const assignedEmployees = state.data.employees.filter(e => teamEmployeeIds.includes(e.id));

      // Calculate project metrics and employee rollups for this week
      let totalAllocatedHrs = 0;
      let totalLoggedHrs = 0;
      let totalBillableHrs = 0;
      const recentActivityNotes = [];

      const employeeBreakdowns = assignedEmployees.map(emp => {
        const empAllocs = projAllocs.filter(a => a.employeeId === emp.id);
        const dailyCap = empAllocs.reduce((sum, a) => sum + Number(a.hoursPerDay), 0);
        
        let weeklyCap = 0;
        for (let d = 0; d < 5; d++) {
          if (!state.getDayLockStatus(emp.id, d, weekId).isLocked) {
            weeklyCap += dailyCap;
          }
        }
        totalAllocatedHrs += weeklyCap;

        const sheet = state.getTimesheet(emp.id, weekId) || { status: 'draft', rows: [] };
        const projRows = (sheet.rows || []).filter(r => r.projectId === projectId);

        let empLogged = 0;
        let empBillable = 0;
        const workItems = new Set();
        const tasks = new Set();

        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        projRows.forEach(r => {
          if (r.task) tasks.add(r.task);
          if (r.workItem) workItems.add(r.workItem);
          r.hours.forEach((h, d) => {
            const val = Number(h) || 0;
            empLogged += val;
            if (r.isBillable !== false) {
              empBillable += val;
            }
            if (val > 0 && r.dayNotes && r.dayNotes[d] && r.dayNotes[d].trim()) {
              recentActivityNotes.push({
                author: emp.name,
                avatar: emp.avatar,
                role: emp.role,
                day: dayNames[d],
                hours: val,
                task: r.task,
                workItem: r.workItem,
                note: r.dayNotes[d]
              });
            }
          });
        });

        totalLoggedHrs += empLogged;
        totalBillableHrs += empBillable;

        return {
          employee: emp,
          allocations: empAllocs,
          dailyCap,
          weeklyCap,
          sheet,
          loggedHours: empLogged,
          billableHours: empBillable,
          tasks: Array.from(tasks),
          workItems: Array.from(workItems)
        };
      });

      const totalNonBillableHrs = Math.max(0, totalLoggedHrs - totalBillableHrs);
      const billableRatio = totalLoggedHrs > 0 ? Math.round((totalBillableHrs / totalLoggedHrs) * 100) : 100;
      const burnPct = totalAllocatedHrs > 0 ? Math.round((totalLoggedHrs / totalAllocatedHrs) * 100) : 0;
      const submittedCount = employeeBreakdowns.filter(b => b.sheet.status === 'submitted' || b.sheet.status === 'pm_approved' || b.sheet.status === 'approved').length;

      // Work Items aggregated metrics
      const workItemMetrics = (proj.workItems || []).map(item => {
        let itemLogged = 0;
        state.data.timesheets.filter(t => t.weekId === weekId).forEach(t => {
          (t.rows || []).filter(r => r.projectId === projectId && r.workItem === item).forEach(r => {
            itemLogged += r.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
          });
        });
        return { name: item, loggedHours: itemLogged };
      });

      return `
        <div class="modal-header" style="background:#ffffff; border-bottom:1px solid var(--grid-border); padding:0.85rem 1.25rem;">
          <div class="modal-title" style="display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:1.15rem; color:${proj.color || 'var(--brand-700)'};">●</span>
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:var(--text-primary);">
                ${proj.name}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">
                Client: <strong>${proj.client}</strong> • Managed by: <strong>${pm?.name || 'Sarah Jenkins'}</strong> • Period: <strong>${weekId}</strong>
              </div>
            </div>
          </div>
          <button class="modal-close-btn" id="btnCloseModal" title="Close">✕</button>
        </div>

        <div class="modal-body" style="max-height:75vh; overflow-y:auto; padding:1.15rem 1.25rem; display:flex; flex-direction:column; gap:1.15rem;">
          <!-- 1. KPI Metrics Summary Cards -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem;">
            <div style="background:#ffffff; border:1px solid var(--grid-border); border-left:3px solid ${proj.color || 'var(--brand-700)'}; border-radius:var(--radius-sm); padding:0.65rem 0.85rem;">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Assigned Team</div>
              <div style="font-size:1.35rem; font-weight:800; color:var(--text-primary); margin-top:2px;">
                ${assignedEmployees.length} <span style="font-size:0.75rem; font-weight:500; color:var(--text-secondary);">Developers</span>
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">RMG Allocated Staff</div>
            </div>

            <div style="background:#ffffff; border:1px solid var(--grid-border); border-left:3px solid var(--brand-700); border-radius:var(--radius-sm); padding:0.65rem 0.85rem;">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Weekly Capacity</div>
              <div style="font-size:1.35rem; font-weight:800; color:var(--brand-800); margin-top:2px;">
                ${totalAllocatedHrs.toFixed(1)}h
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">Approved RMG Budget</div>
            </div>

            <div style="background:#ffffff; border:1px solid var(--grid-border); border-left:3px solid #10b981; border-radius:var(--radius-sm); padding:0.65rem 0.85rem;">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Logged Hours (${burnPct}%)</div>
              <div style="font-size:1.35rem; font-weight:800; color:#059669; margin-top:2px;">
                ${totalLoggedHrs.toFixed(1)}h
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                ⚡ ${totalBillableHrs.toFixed(1)}h Billable (${billableRatio}%)
              </div>
            </div>

            <div style="background:#ffffff; border:1px solid var(--grid-border); border-left:3px solid #6366f1; border-radius:var(--radius-sm); padding:0.65rem 0.85rem;">
              <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Timesheet Health</div>
              <div style="font-size:1.35rem; font-weight:800; color:#4f46e5; margin-top:2px;">
                ${submittedCount} / ${assignedEmployees.length}
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">
                ${assignedEmployees.length - submittedCount} Pending Submission
              </div>
            </div>
          </div>

          <!-- 2. Assigned Team Members & Real-Time Timesheets -->
          <div style="border:1px solid var(--grid-border); border-radius:var(--radius-md); overflow:hidden; background:#ffffff;">
            <div style="background:var(--bg-canvas); padding:0.65rem 1rem; border-bottom:1px solid var(--grid-border); display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:0.85rem; color:var(--text-primary);">Assigned Team Members & Timesheet Status</strong>
              <span style="font-size:0.72rem; color:var(--text-muted);">${employeeBreakdowns.length} Engineers in this workspace</span>
            </div>

            <table class="timesheet-table" style="min-width:100%;">
              <thead>
                <tr>
                  <th style="font-size:0.72rem; text-align:left;">Team Member</th>
                  <th style="font-size:0.72rem; text-align:left;">Project Allocation</th>
                  <th style="font-size:0.72rem; text-align:left;">Logged / Cap</th>
                  <th style="font-size:0.72rem; text-align:left;">Assigned Tasks & Work Items</th>
                  <th style="font-size:0.72rem; text-align:center;">Timesheet Status</th>
                  <th style="font-size:0.72rem; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${employeeBreakdowns.map(b => `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:0.5rem;">
                        <div style="width:28px; height:28px; border-radius:50%; background:var(--brand-50); border:1px solid var(--brand-200); color:var(--brand-700); font-weight:800; font-size:0.7rem; display:flex; align-items:center; justify-content:center;">
                          ${b.employee.avatar || b.employee.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style="font-weight:700; color:var(--text-primary); font-size:0.8rem;">${b.employee.name}</div>
                          <div style="font-size:0.68rem; color:var(--text-muted);">${b.employee.role}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style="font-size:0.75rem; font-weight:600; color:var(--text-primary);">
                        ${b.dailyCap}h/day (${b.weeklyCap}h/wk)
                      </div>
                      <div style="font-size:0.68rem; color:var(--text-muted);">
                        ${b.allocations[0]?.roleDescription || b.employee.role}
                      </div>
                    </td>

                    <td>
                      <strong class="tabular-nums" style="font-size:0.85rem; color:${b.loggedHours >= b.weeklyCap ? '#059669' : (b.loggedHours > 0 ? '#d97706' : '#64748b')};">
                        ${b.loggedHours.toFixed(1)}h
                      </strong>
                      <span style="font-size:0.7rem; color:var(--text-muted);"> / ${b.weeklyCap}h</span>
                      ${b.billableHours > 0 ? `
                        <div style="font-size:0.65rem; color:#059669; font-weight:600;">⚡ ${b.billableHours.toFixed(1)}h Billable</div>
                      ` : ''}
                    </td>

                    <td>
                      <div style="display:flex; flex-direction:column; gap:2px; max-width:260px;">
                        ${b.workItems.length > 0 ? b.workItems.map(wi => `
                          <span style="font-size:0.7rem; background:#f1f5f9; padding:1px 6px; border-radius:3px; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                            📌 ${wi}
                          </span>
                        `).join('') : (b.tasks.length > 0 ? b.tasks.map(t => `
                          <span style="font-size:0.7rem; color:var(--text-muted);">● ${t}</span>
                        `).join('') : '<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">No logged tasks</span>')}
                      </div>
                    </td>

                    <td style="text-align:center;">
                      <span class="status-badge status-${b.sheet.status}">
                        <span class="status-dot"></span>
                        ${b.sheet.status.toUpperCase()}
                      </span>
                    </td>

                    <td style="text-align:right;">
                      <div style="display:flex; align-items:center; justify-content:flex-end; gap:0.35rem;">
                        <button 
                          type="button" 
                          class="btn-quick btn-quick-primary" 
                          data-action="inspect-sheet-from-proj" 
                          data-emp-id="${b.employee.id}" 
                          data-week-id="${weekId}"
                          style="font-size:0.7rem; padding:0.2rem 0.5rem;"
                          title="Inspect full weekly timesheet"
                        >
                          📋 Inspect Timesheet ➔
                        </button>
                        ${b.sheet.status === 'draft' ? `
                          <button 
                            type="button" 
                            class="btn-quick" 
                            data-action="nudge-emp-from-proj" 
                            data-emp-id="${b.employee.id}" 
                            style="font-size:0.7rem; padding:0.2rem 0.45rem;"
                            title="Send reminder to submit timesheet"
                          >
                            🔔 Nudge
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- 3. Active Work Items & Sprint Backlog -->
          <div style="border:1px solid var(--grid-border); border-radius:var(--radius-md); padding:0.85rem 1rem; background:#ffffff;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.65rem;">
              <div>
                <strong style="font-size:0.85rem; color:var(--text-primary);">Active Work Items & Jira Tickets</strong>
                <div style="font-size:0.7rem; color:var(--text-muted);">Sprint tasks tracked on ${proj.name}</div>
              </div>
              <button 
                type="button" 
                class="btn-quick btn-quick-primary" 
                data-action="add-workitem-from-proj" 
                data-proj-id="${proj.id}" 
                data-proj-name="${proj.name}" 
                style="font-size:0.72rem; padding:0.2rem 0.55rem;"
              >
                ➕ Add Work Item / Ticket
              </button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:0.5rem;">
              ${workItemMetrics.map(wi => `
                <div style="background:var(--bg-canvas); border:1px solid var(--grid-border); border-radius:var(--radius-xs); padding:0.45rem 0.65rem; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.75rem; font-weight:600; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    📌 ${wi.name}
                  </span>
                  <span class="tabular-nums" style="font-size:0.72rem; font-weight:700; color:var(--brand-700); background:#ffffff; padding:1px 6px; border-radius:3px; border:1px solid var(--grid-border); margin-left:4px;">
                    ${wi.loggedHours.toFixed(1)}h
                  </span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 4. Team Standup Activity Feed & Notes for this Project -->
          <div style="border:1px solid var(--grid-border); border-radius:var(--radius-md); padding:0.85rem 1rem; background:#ffffff;">
            <strong style="font-size:0.85rem; color:var(--text-primary); display:block; margin-bottom:0.5rem;">
              Team Standup Logs & Task Notes (${weekId})
            </strong>

            ${recentActivityNotes.length === 0 ? `
              <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; padding:0.5rem 0;">
                No standup notes logged by the team for ${proj.name} yet this week.
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:0.4rem; max-height:160px; overflow-y:auto;">
                ${recentActivityNotes.map(n => `
                  <div style="background:var(--bg-canvas); border:1px solid var(--grid-border); border-radius:var(--radius-xs); padding:0.4rem 0.65rem; font-size:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                      <div>
                        <strong>${n.author}</strong> <span style="color:var(--text-muted);">(${n.role})</span> • <span style="font-weight:700; color:var(--brand-700);">${n.day}</span>
                      </div>
                      <span class="tabular-nums" style="font-size:0.7rem; font-weight:700; color:#059669;">
                        ${n.hours}h (${n.workItem || n.task})
                      </span>
                    </div>
                    <div style="color:var(--text-secondary); font-style:italic;">
                      "${n.note}"
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <button 
            type="button" 
            class="btn-primary" 
            data-action="request-resource-from-proj" 
            data-proj-id="${proj.id}" 
            style="font-size:0.75rem; padding:0.35rem 0.75rem;"
          >
            ➕ Request Extra Capacity from RMG
          </button>
          <button class="btn-secondary" id="btnCancelModal">Close</button>
        </div>
      `;
    }

    return '';
  },

  bindGlobalEvents() {
    if (typeof document === 'undefined') return;

    // 1. Role Tabs
    document.getElementById('tabRoleEmployee')?.addEventListener('click', () => {
      state.setRole('employee');
      this.showToast('Switched to Employee Timesheet Workspace', 'info');
    });
    document.getElementById('tabRolePM')?.addEventListener('click', () => {
      state.setRole('pm');
      this.showToast('Switched to Project Manager Hub', 'info');
    });
    document.getElementById('tabRoleRMG')?.addEventListener('click', () => {
      state.setRole('rmg');
      this.showToast('Switched to Resource Management (RMG) Hub', 'info');
    });

    // 2. User Persona Selector
    document.getElementById('userPersonaSelect')?.addEventListener('change', (e) => {
      state.setActiveUser(e.target.value);
      this.showToast(`Switched user persona to ${e.target.selectedOptions[0].text}`, 'info');
    });

    // 3. Period Navigation
    document.getElementById('btnPrevWeek')?.addEventListener('click', () => {
      state.prevWeek();
      this.showToast('Navigated to previous work period', 'info');
    });
    document.getElementById('btnNextWeek')?.addEventListener('click', () => {
      state.nextWeek();
      this.showToast('Navigated to next work period', 'info');
    });
    document.getElementById('btnCurrentWeek')?.addEventListener('click', () => {
      state.goToCurrentWeek();
      this.showToast('Returned to current work week', 'info');
    });

    // 4. View Mode Toggle (Top Bar & Sidebar Nav)
    const setMode = (mode, label) => {
      state.setViewMode(mode);
      this.showToast(`Switched to ${label}`, 'info');
    };

    document.getElementById('btnViewWeekly')?.addEventListener('click', () => setMode('weekly', 'Weekly Grid'));
    document.getElementById('sideNavWeekly')?.addEventListener('click', () => setMode('weekly', 'Weekly Grid'));

    document.getElementById('btnViewDaily')?.addEventListener('click', () => setMode('daily', 'Daily Focus Mode'));
    document.getElementById('sideNavDaily')?.addEventListener('click', () => setMode('daily', 'Daily Focus Mode'));

    document.getElementById('btnViewMonthly')?.addEventListener('click', () => setMode('monthly', 'Monthly Overview'));
    document.getElementById('sideNavMonthly')?.addEventListener('click', () => setMode('monthly', 'Monthly Overview'));

    document.getElementById('btnViewHistory')?.addEventListener('click', () => setMode('history', 'Timesheet History Archive'));
    document.getElementById('sideNavHistory')?.addEventListener('click', () => setMode('history', 'Timesheet History Archive'));

    // 5. Notifications
    document.getElementById('btnOpenNotifications')?.addEventListener('click', () => state.openModal('notifications'));

    // 5b. Mark All Notifications as Read
    const btnMarkAllNotifsRead = document.getElementById('btnMarkAllNotifsRead');
    if (btnMarkAllNotifsRead) {
      btnMarkAllNotifsRead.addEventListener('click', () => {
        state.markActiveUserNotificationsAsRead();
        this.showToast('All your notifications marked as read.', 'info');
      });
    }

    // 6. Reset
    document.getElementById('btnResetDemoData')?.addEventListener('click', () => {
      if (confirm('Reset prototype state back to initial seed data?')) {
        state.resetToDefaults();
        this.showToast('Demo data reset back to clean defaults.', 'warning');
      }
    });

    // 7. Close Modals
    document.querySelectorAll('#btnCloseModal, #btnCancelModal').forEach(btn => {
      btn.addEventListener('click', () => state.closeModal());
    });

    // 8. Save Cell Note Modal
    const btnSaveCellNote = document.getElementById('btnSaveCellNote');
    if (btnSaveCellNote) {
      btnSaveCellNote.addEventListener('click', () => {
        const { employeeId, weekId, rowId, dayIndex } = state.modalState.data;
        const note = document.getElementById('txtCellNoteInput').value.trim();
        state.updateCellNote(employeeId, weekId, rowId, dayIndex, note);
        state.closeModal();
        this.showToast('Day task description saved successfully!', 'success');
      });
    }

    // 9. Submit Overtime Request (Employee -> PM)
    const btnSubmitOvertimeRequest = document.getElementById('btnSubmitOvertimeRequest');
    if (btnSubmitOvertimeRequest) {
      btnSubmitOvertimeRequest.addEventListener('click', () => {
        const { employeeId, weekId } = state.modalState.data;
        const projId = document.getElementById('otProjectSelect').value;
        const dayIdx = parseInt(document.getElementById('otDaySelect').value, 10);
        const extraHrs = Number(document.getElementById('otExtraHoursInput').value) || 2;
        const justification = document.getElementById('otJustificationInput').value.trim();

        if (!justification) {
          alert('Please enter a business justification for extra hours.');
          return;
        }

        const dateMap = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28'];

        state.submitOvertimeRequest({
          employeeId,
          projectId: projId,
          weekId,
          dayIndex: dayIdx,
          dateRequested: dateMap[dayIdx] || '2026-08-26',
          extraHours: extraHrs,
          justification
        });

        state.closeModal();
        this.showToast(`Overtime request (+${extraHrs}h) submitted to Project Manager for endorsement!`, 'success');
      });
    }

    // 10. Rejection confirmation (Handles both PM & RMG rejections!)
    const btnConfirmRejection = document.getElementById('btnConfirmRejection');
    if (btnConfirmRejection) {
      btnConfirmRejection.addEventListener('click', () => {
        const reason = document.getElementById('txtRejectionReason').value.trim();
        if (!reason) {
          alert('Please enter a rejection reason.');
          return;
        }
        const sheetId = state.modalState.data?.sheetId;
        const isRmgStage = state.modalState.data?.stage === 'rmg' || state.currentRole === 'rmg';

        if (isRmgStage) {
          state.rejectTimesheetByRMG(sheetId, 'rmg_elena', reason);
          state.closeModal();
          this.showToast('Timesheet returned by RMG. Notifications sent to both Employee and PM!', 'warning');
        } else {
          const pm = state.getActivePM();
          state.rejectTimesheetByPM(sheetId, pm.id, reason);
          state.closeModal();
          this.showToast('Timesheet returned to employee with revision notes.', 'warning');
        }
      });
    }

    // 11. Modal Approve/Reject from Review Modal
    const btnModalApprove = document.getElementById('btnModalApprove');
    if (btnModalApprove) {
      btnModalApprove.addEventListener('click', () => {
        const sheet = state.modalState.data?.sheet;
        const pm = state.getActivePM();
        state.approveTimesheetByPM(sheet.id, pm.id);
        state.closeModal();
        this.showToast('Timesheet approved by PM! Forwarded to RMG for final sign-off.', 'success');
      });
    }

    const btnModalReject = document.getElementById('btnModalReject');
    if (btnModalReject) {
      btnModalReject.addEventListener('click', () => {
        const sheet = state.modalState.data?.sheet;
        state.openModal('rejection', { sheetId: sheet.id, employeeId: sheet.employeeId, stage: 'pm' });
      });
    }

    const btnModalRmgApprove = document.getElementById('btnModalRmgApprove');
    if (btnModalRmgApprove) {
      btnModalRmgApprove.addEventListener('click', () => {
        const sheet = state.modalState.data?.sheet;
        state.approveTimesheetByRMG(sheet.id, 'rmg_elena');
        state.closeModal();
        this.showToast('Timesheet officially approved by RMG! Employee and PM notified.', 'success');
      });
    }

    const btnModalRmgReject = document.getElementById('btnModalRmgReject');
    if (btnModalRmgReject) {
      btnModalRmgReject.addEventListener('click', () => {
        const sheet = state.modalState.data?.sheet;
        state.openModal('rejection', { sheetId: sheet.id, employeeId: sheet.employeeId, stage: 'rmg' });
      });
    }

    // 12. Live conflict validator for New Allocation Modal
    const allocEmpSelect = document.getElementById('allocEmployeeSelect');
    const allocHrsInput = document.getElementById('allocHoursInput');
    const warnBox = document.getElementById('allocConflictWarningBox');
    const warnText = document.getElementById('allocConflictText');

    const updateAllocationWarning = () => {
      if (!allocEmpSelect || !allocHrsInput || !warnBox) return;
      const empId = allocEmpSelect.value;
      const newHrs = Number(allocHrsInput.value) || 0;
      const curHrs = state.getEmployeeExpectedHoursPerDay(empId);
      const combined = curHrs + newHrs;
      const emp = state.getEmployee(empId);

      if (combined > 8) {
        warnBox.style.display = 'flex';
        warnText.innerHTML = `Assigning this allocation will bring ${emp?.name} to <strong>${combined}h/day (${Math.round((combined / 8) * 100)}%)</strong>, exceeding standard 8h/day capacity!`;
      } else {
        warnBox.style.display = 'none';
      }
    };

    if (allocEmpSelect && allocHrsInput) {
      allocEmpSelect.addEventListener('change', updateAllocationWarning);
      allocHrsInput.addEventListener('input', updateAllocationWarning);
    }

    const btnConfirmAllocation = document.getElementById('btnConfirmAllocation');
    if (btnConfirmAllocation) {
      btnConfirmAllocation.addEventListener('click', () => {
        const empId = allocEmpSelect.value;
        const projId = document.getElementById('allocProjectSelect').value;
        const hrs = Number(allocHrsInput.value) || 8;
        const role = document.getElementById('allocRoleInput').value;
        const sDate = document.getElementById('allocStartDate').value;
        const eDate = document.getElementById('allocEndDate').value;

        state.createAllocation({
          employeeId: empId,
          projectId: projId,
          hoursPerDay: hrs,
          roleDescription: role,
          startDate: sDate,
          endDate: eDate
        });

        state.closeModal();
        this.showToast('New allocation saved and linked to employee!', 'success');
      });
    }

    const btnConfirmResourceRequest = document.getElementById('btnConfirmResourceRequest');
    if (btnConfirmResourceRequest) {
      btnConfirmResourceRequest.addEventListener('click', () => {
        const pm = state.getActivePM();
        const projId = document.getElementById('reqProjectSelect').value;
        const proj = state.getProject(projId);
        const role = document.getElementById('reqRoleInput').value;
        const hrsWk = Number(document.getElementById('reqHoursWeek').value) || 20;
        const duration = Number(document.getElementById('reqDurationWeeks').value) || 4;
        const notes = document.getElementById('reqNotes').value;

        state.submitResourceRequest({
          pmId: pm.id,
          pmName: pm.name,
          projectId: projId,
          projectName: proj?.name || 'Project',
          roleRequired: role,
          hoursPerWeek: hrsWk,
          durationWeeks: duration,
          notes
        });

        state.closeModal();
        this.showToast('Resource request sent to RMG queue!', 'success');
      });
    }

    // 13. Save Custom Work Item Modal Action
    const btnSaveCustomWorkItem = document.getElementById('btnSaveCustomWorkItem');
    if (btnSaveCustomWorkItem) {
      btnSaveCustomWorkItem.addEventListener('click', () => {
        const input = document.getElementById('txtCustomWorkItemName');
        const val = input ? input.value.trim() : '';
        if (!val) {
          alert('Please enter a work item name.');
          return;
        }

        const projId = btnSaveCustomWorkItem.getAttribute('data-proj-id');
        const rowId = btnSaveCustomWorkItem.getAttribute('data-row-id');
        const empId = btnSaveCustomWorkItem.getAttribute('data-emp-id');
        const weekId = btnSaveCustomWorkItem.getAttribute('data-week-id');

        state.addWorkItem(projId, val, empId, weekId, rowId);
        state.closeModal();
        this.showToast(`Work item "${val}" added and assigned!`, 'success');
      });
    }

    document.querySelectorAll('.btn-select-existing-workitem').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-item');
        const saveBtn = document.getElementById('btnSaveCustomWorkItem');
        const projId = saveBtn?.getAttribute('data-proj-id');
        const rowId = saveBtn?.getAttribute('data-row-id');
        const empId = saveBtn?.getAttribute('data-emp-id');
        const weekId = saveBtn?.getAttribute('data-week-id');

        if (projId && rowId && empId && weekId) {
          state.updateRowMetadata(empId, weekId, rowId, 'workItem', val);
          state.closeModal();
          this.showToast(`Assigned work item: "${val}"`, 'success');
        }
      });
    });

    // 14. Project Details Modal Actions
    document.querySelectorAll('[data-action="inspect-sheet-from-proj"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        const wId = btn.getAttribute('data-week-id') || state.selectedWeekId;
        const sheet = state.getTimesheet(empId, wId);
        state.openModal('review-sheet', { employeeId: empId, weekId: wId, sheet, isAudit: true });
      });
    });

    document.querySelectorAll('[data-action="nudge-emp-from-proj"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        const pm = state.getActivePM();
        state.nudgeEmployee(empId, pm.id);
        const emp = state.getEmployee(empId);
        this.showToast(`Nudge notification sent to ${emp?.name || 'Employee'}.`, 'info');
      });
    });

    document.querySelectorAll('[data-action="add-workitem-from-proj"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const projId = btn.getAttribute('data-proj-id');
        const projName = btn.getAttribute('data-proj-name');
        state.openModal('add-work-item', { projectId: projId, projectName: projName });
      });
    });

    document.querySelectorAll('[data-action="request-resource-from-proj"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const projId = btn.getAttribute('data-proj-id');
        const pm = state.getActivePM();
        state.openModal('request-resource', { pmId: pm.id, projectIds: [projId] });
      });
    });
  }
};

if (typeof window !== 'undefined') window.App = App;
if (typeof global !== 'undefined') global.App = App;
if (typeof module !== 'undefined') module.exports = App;

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
}
