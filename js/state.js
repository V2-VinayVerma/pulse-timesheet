/* ==========================================================================
   Pulse Central Reactive State Engine (Enhanced with Caps & Overtime Pipeline)
   ========================================================================== */

class PulseState {
  constructor() {
    this.storageKey = 'pulse_app_state_v3';
    this.subscribers = new Set();
    this.loadState();
  }

  loadState() {
    const defaultData = typeof INITIAL_MOCK_DATA !== 'undefined' 
      ? INITIAL_MOCK_DATA 
      : (typeof window !== 'undefined' && window.INITIAL_MOCK_DATA) 
        || (typeof global !== 'undefined' && global.INITIAL_MOCK_DATA) 
        || {};

    try {
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(this.storageKey) : null;
      if (saved) {
        this.data = JSON.parse(saved);
        // Guarantee overtimeRequests array exists
        if (!this.data.overtimeRequests) {
          this.data.overtimeRequests = JSON.parse(JSON.stringify(defaultData.overtimeRequests || []));
        }
        // Merge holidays
        const existingHolidays = this.data.holidays || [];
        (defaultData.holidays || []).forEach(dh => {
          if (!existingHolidays.some(h => h.weekId === dh.weekId && h.dayIndex === dh.dayIndex)) {
            existingHolidays.push(JSON.parse(JSON.stringify(dh)));
          }
        });
        this.data.holidays = existingHolidays;

        // Merge leaves
        const existingLeaves = this.data.leaves || [];
        (defaultData.leaves || []).forEach(dl => {
          if (!existingLeaves.some(l => l.employeeId === dl.employeeId && l.weekId === dl.weekId && l.dayIndex === dl.dayIndex)) {
            existingLeaves.push(JSON.parse(JSON.stringify(dl)));
          }
        });
        this.data.leaves = existingLeaves;
      } else {
        this.data = JSON.parse(JSON.stringify(defaultData));
      }
    } catch (e) {
      console.warn('Failed to parse saved state, using initial mock data', e);
      this.data = JSON.parse(JSON.stringify(defaultData));
    }

    // Active session parameters
    this.currentRole = 'employee'; // 'employee' | 'pm' | 'rmg'
    this.activeUserId = 'emp_alex'; // Default active user
    this.selectedWeekId = '2026-W36'; // Current week containing today
    this.selectedMonth = '2026-09'; // Default September 2026
    this.viewMode = 'daily'; // 'daily' (primary) | 'weekly' | 'monthly' | 'history'
    this.activeDayIndex = this.getRealTodayInfo().dayIndex; // Real-time today's day of week
    this.modalState = {
      activeModal: null, // 'rejection' | 'new-allocation' | 'request-resource' | 'review-sheet' | 'overtime-request' | 'cell-note'
      data: null
    };
    this.rmgSelectedPmId = 'all'; // 'all' | 'pm_sarah' | 'pm_david'

    // Available weeks metadata with start dates
    this.weeks = [
      { id: '2026-W32', label: 'Aug 03 – Aug 09, 2026', weekNum: 32, isCurrent: false, startDate: '2026-08-03' },
      { id: '2026-W33', label: 'Aug 10 – Aug 16, 2026', weekNum: 33, isCurrent: false, startDate: '2026-08-10' },
      { id: '2026-W34', label: 'Aug 17 – Aug 23, 2026', weekNum: 34, isCurrent: false, startDate: '2026-08-17' },
      { id: '2026-W35', label: 'Aug 24 – Aug 30, 2026', weekNum: 35, isCurrent: false, startDate: '2026-08-24' },
      { id: '2026-W36', label: 'Aug 31 – Sep 06, 2026 (Current)', weekNum: 36, isCurrent: true, startDate: '2026-08-31' },
      { id: '2026-W37', label: 'Sep 07 – Sep 13, 2026', weekNum: 37, isCurrent: false, startDate: '2026-09-07' }
    ];
  }

  getRealTodayInfo() {
    const now = new Date();
    // Monday = 0, Tuesday = 1, Wednesday = 2, Thursday = 3, Friday = 4, Saturday = 5, Sunday = 6
    const jsDay = now.getDay();
    const dayIndex = (jsDay === 0) ? 6 : jsDay - 1;
    const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const fullDayName = dayNamesFull[dayIndex];
    const shortDayName = dayNamesShort[dayIndex];
    const monthShort = monthNamesShort[now.getMonth()];
    const monthFull = monthNamesFull[now.getMonth()];
    const dateNum = now.getDate();
    const year = now.getFullYear();
    const dateFormatted = `${monthShort} ${dateNum < 10 ? '0' + dateNum : dateNum}`;
    const formattedDate = `${shortDayName}, ${monthShort} ${dateNum < 10 ? '0' + dateNum : dateNum}`;
    const fullFormattedDate = `${fullDayName}, ${monthShort} ${dateNum < 10 ? '0' + dateNum : dateNum}, ${year}`;

    return {
      dayIndex,
      fullDayName,
      shortDayName,
      monthShort,
      monthFull,
      dateNum,
      year,
      dateFormatted,
      formattedDate,
      fullFormattedDate
    };
  }

  getWeekDays(weekId) {
    const week = this.weeks.find(w => w.id === weekId) || this.weeks.find(w => w.isCurrent) || this.weeks[4];
    const startDate = new Date(week.startDate ? week.startDate + 'T00:00:00' : '2026-08-31T00:00:00');
    const dayNamesShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const now = new Date();
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    return dayNamesShort.map((name, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const mStr = monthNamesShort[d.getMonth()];
      const dNum = d.getDate();
      const isToday = (d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD);
      return {
        name,
        fullName: dayNamesFull[i],
        date: `${mStr} ${dNum < 10 ? '0' + dNum : dNum}`,
        fullDate: `${dayNamesFull[i]}, ${mStr} ${dNum < 10 ? '0' + dNum : dNum}, ${d.getFullYear()}`,
        isWeekend: i >= 5,
        isToday
      };
    });
  }

  saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      }
    } catch (e) {
      console.error('Error saving state', e);
    }
  }

  resetToDefaults() {
    const defaultData = typeof INITIAL_MOCK_DATA !== 'undefined' 
      ? INITIAL_MOCK_DATA 
      : (typeof window !== 'undefined' && window.INITIAL_MOCK_DATA) 
        || (typeof global !== 'undefined' && global.INITIAL_MOCK_DATA) 
        || {};
    this.data = JSON.parse(JSON.stringify(defaultData));
    this.saveState();
    this.notify('DATA_RESET');
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(eventType, payload = {}) {
    this.subscribers.forEach(cb => {
      try {
        cb(eventType, payload);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  /* --------------------------------------------------------------------------
     Navigation & Mode State
     -------------------------------------------------------------------------- */
  setRole(role) {
    this.currentRole = role;
    if (role === 'employee') {
      const isStillEmp = this.data.employees.some(e => e.id === this.activeUserId);
      if (!isStillEmp) this.activeUserId = this.data.employees[0].id;
    } else if (role === 'pm') {
      const isStillPm = this.data.projectManagers.some(p => p.id === this.activeUserId);
      if (!isStillPm) this.activeUserId = this.data.projectManagers[0].id;
    } else if (role === 'rmg') {
      this.activeUserId = 'rmg_elena';
    }
    this.notify('ROLE_CHANGED', { role: this.currentRole, activeUserId: this.activeUserId });
  }

  setActiveUser(userId) {
    this.activeUserId = userId;
    if (this.data.employees.some(e => e.id === userId)) {
      this.currentRole = 'employee';
    } else if (this.data.projectManagers.some(p => p.id === userId)) {
      this.currentRole = 'pm';
    } else if (userId === 'rmg_elena' || this.data.resourceManagers.some(r => r.id === userId)) {
      this.currentRole = 'rmg';
    }
    this.notify('USER_CHANGED', { userId: this.activeUserId, role: this.currentRole });
  }

  setSelectedWeek(weekId) {
    this.selectedWeekId = weekId;
    this.notify('WEEK_CHANGED', { weekId: this.selectedWeekId });
  }

  setSelectedMonth(monthStr) {
    this.selectedMonth = monthStr;
    this.notify('MONTH_CHANGED', { selectedMonth: this.selectedMonth });
  }

  prevMonth() {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.setSelectedMonth(newMonth);
  }

  nextMonth() {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.setSelectedMonth(newMonth);
  }

  nextWeek() {
    const idx = this.weeks.findIndex(w => w.id === this.selectedWeekId);
    if (idx < this.weeks.length - 1) {
      this.setSelectedWeek(this.weeks[idx + 1].id);
    }
  }

  prevWeek() {
    const idx = this.weeks.findIndex(w => w.id === this.selectedWeekId);
    if (idx > 0) {
      this.setSelectedWeek(this.weeks[idx - 1].id);
    }
  }

  goToCurrentWeek() {
    const cur = this.weeks.find(w => w.isCurrent) || this.weeks[3];
    this.setSelectedWeek(cur.id);
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.notify('VIEW_MODE_CHANGED', { viewMode: this.viewMode });
  }

  setActiveDay(dayIndex) {
    this.activeDayIndex = dayIndex;
    this.notify('ACTIVE_DAY_CHANGED', { dayIndex: this.activeDayIndex });
  }

  openModal(modalType, data = {}) {
    this.modalState = { activeModal: modalType, data };
    this.notify('MODAL_OPENED', { modalType, data });
  }

  closeModal() {
    this.modalState = { activeModal: null, data: null };
    this.notify('MODAL_CLOSED');
  }

  /* --------------------------------------------------------------------------
     Query Selectors, Holidays & Leave Checkers
     -------------------------------------------------------------------------- */
  getActiveEmployee() {
    return this.data.employees.find(e => e.id === this.activeUserId) || this.data.employees[0];
  }

  getActivePM() {
    return this.data.projectManagers.find(p => p.id === this.activeUserId) || this.data.projectManagers[0];
  }

  getEmployeeAllocations(employeeId) {
    return this.data.allocations.filter(a => a.employeeId === employeeId);
  }

  getEmployeeProjects(employeeId) {
    const allocs = this.getEmployeeAllocations(employeeId);
    return allocs.map(a => {
      const project = this.data.projects.find(p => p.id === a.projectId);
      return {
        ...project,
        allocation: a
      };
    });
  }

  getProject(projectId) {
    return this.data.projects.find(p => p.id === projectId);
  }

  getEmployee(employeeId) {
    return this.data.employees.find(e => e.id === employeeId);
  }

  getPM(pmId) {
    return this.data.projectManagers.find(p => p.id === pmId);
  }

  getEmployeeExpectedHoursPerDay(employeeId) {
    const allocs = this.getEmployeeAllocations(employeeId);
    return allocs.reduce((sum, a) => sum + (Number(a.hoursPerDay) || 0), 0);
  }

  // Check if a day is a Statutory Company Holiday
  getHolidayForDay(dayIndex, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const holidays = this.data.holidays || [];
    return holidays.find(h => h.weekId === targetWeek && h.dayIndex === dayIndex) || null;
  }

  // Check if an employee is on approved leave
  getEmployeeLeaveForDay(employeeId, dayIndex, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const leaves = this.data.leaves || [];
    return leaves.find(l => l.employeeId === employeeId && l.weekId === targetWeek && l.dayIndex === dayIndex) || null;
  }

  // Consolidated day lock status (Holiday / Approved Leave / Weekend / Working)
  getDayLockStatus(employeeId, dayIndex, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    if (dayIndex === 5 || dayIndex === 6) {
      return { 
        isLocked: true, 
        statusType: 'weekend',
        type: 'weekend', 
        label: dayIndex === 5 ? 'Saturday (Weekend)' : 'Sunday (Weekend)', 
        badge: '🏖️ WEEKEND',
        statusLabel: 'Weekend'
      };
    }
    const holiday = this.getHolidayForDay(dayIndex, targetWeek);
    if (holiday) {
      return { 
        isLocked: true, 
        statusType: 'holiday',
        type: 'holiday', 
        label: holiday.name, 
        badge: '🏖️ HOLIDAY',
        statusLabel: 'Holiday'
      };
    }
    const leave = this.getEmployeeLeaveForDay(employeeId, dayIndex, targetWeek);
    if (leave) {
      return { 
        isLocked: true, 
        statusType: 'leave',
        type: 'leave', 
        label: leave.name, 
        badge: '🌴 ON LEAVE',
        statusLabel: 'Leave'
      };
    }
    return { 
      isLocked: false, 
      statusType: 'working',
      type: 'working', 
      label: 'Working Day', 
      badge: '💼 WORKING',
      statusLabel: 'Working'
    };
  }

  // Check if an employee has approved or PM-endorsed overtime for a specific day/week
  getApprovedOvertimeHours(employeeId, weekId, dayIndex = null) {
    const otList = (this.data.overtimeRequests || []).filter(r => 
      r.employeeId === employeeId && 
      r.weekId === weekId && 
      (dayIndex === null || dayIndex === undefined || r.dayIndex === dayIndex) && 
      (r.status === 'approved' || r.status === 'forwarded_to_rmg' || r.status === 'pm_approved')
    );
    return otList.reduce((sum, r) => sum + (Number(r.extraHours) || 0), 0);
  }

  // Daily Allowed Hours Cap (0h if weekend/holiday/leave unless approved overtime, else base expected + approved overtime)
  getDailyAllowedHours(employeeId, weekId, dayIndex) {
    const isWeekend = dayIndex >= 5;
    const lock = this.getDayLockStatus(employeeId, dayIndex, weekId);
    const weeklyOT = this.getApprovedOvertimeHours(employeeId, weekId, null);
    const specificOT = this.getApprovedOvertimeHours(employeeId, weekId, dayIndex);

    if (isWeekend || (lock && lock.isLocked)) {
      return specificOT;
    }
    const baseExpected = this.getEmployeeExpectedHoursPerDay(employeeId);
    return baseExpected + weeklyOT;
  }

  // Weekly Allowed Capacity (Sum of valid workdays + total approved overtime for week)
  getWeeklyAllowedHours(employeeId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    let totalBase = 0;
    for (let d = 0; d < 5; d++) {
      const lock = this.getDayLockStatus(employeeId, d, targetWeek);
      if (!lock.isLocked) {
        totalBase += this.getEmployeeExpectedHoursPerDay(employeeId);
      }
    }
    const weeklyOT = this.getApprovedOvertimeHours(employeeId, targetWeek, null);
    return totalBase + weeklyOT;
  }

  // Evaluates whether timesheet exceeds RMG allocation cap
  isTimesheetOverCapacity(employeeId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const sheet = this.getTimesheet(employeeId, targetWeek);
    const maxAllowed = this.getWeeklyAllowedHours(employeeId, targetWeek);
    
    if (!sheet) {
      return { isOver: false, totalLogged: 0, maxAllowed, excessHours: 0, dayExceeded: false, dayOverDetails: [] };
    }

    let totalLogged = 0;
    sheet.rows.forEach(r => {
      r.hours.forEach(h => totalLogged += (Number(h) || 0));
    });

    let dayExceeded = false;
    let dayOverDetails = [];
    for (let d = 0; d < 7; d++) {
      const dayTotal = sheet.rows.reduce((sum, r) => sum + (Number(r.hours[d]) || 0), 0);
      const dayMax = this.getDailyAllowedHours(employeeId, targetWeek, d);
      if (dayTotal > dayMax) {
        dayExceeded = true;
        dayOverDetails.push({ dayIndex: d, dayTotal, dayMax, excess: dayTotal - dayMax });
      }
    }

    const isOver = (totalLogged > maxAllowed) || dayExceeded;
    return {
      isOver,
      totalLogged,
      maxAllowed,
      excessHours: Math.max(0, totalLogged - maxAllowed),
      dayExceeded,
      dayOverDetails
    };
  }

  getEmployeeUtilization(employeeId) {
    const totalAllocated = this.getEmployeeExpectedHoursPerDay(employeeId);
    const baseHours = 8;
    return Math.round((totalAllocated / baseHours) * 100);
  }

  getMonthlyData(employeeId, monthStr = null) {
    const targetMonth = monthStr || this.selectedMonth || '2026-08';
    const allWeeks = this.weeks;
    
    const monthlySheets = allWeeks.map(w => {
      const sheet = this.getTimesheet(employeeId, w.id);
      let totalHours = 0;
      let billableHours = 0;
      let nonBillableHours = 0;
      let projectBreakdown = {};

      if (sheet) {
        sheet.rows.forEach(r => {
          const rHrs = r.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
          totalHours += rHrs;
          const isBillable = r.isBillable !== false;
          if (isBillable) {
            billableHours += rHrs;
          } else {
            nonBillableHours += rHrs;
          }
          if (!projectBreakdown[r.projectId]) {
            const p = this.getProject(r.projectId);
            projectBreakdown[r.projectId] = {
              project: p,
              hours: 0,
              isBillable
            };
          }
          projectBreakdown[r.projectId].hours += rHrs;
        });
      }

      return {
        week: w,
        sheet,
        status: sheet ? sheet.status : 'draft',
        totalHours,
        billableHours,
        nonBillableHours,
        projectBreakdown
      };
    });

    const grandTotal = monthlySheets.reduce((sum, w) => sum + w.totalHours, 0);
    const grandBillable = monthlySheets.reduce((sum, w) => sum + w.billableHours, 0);
    const grandNonBillable = monthlySheets.reduce((sum, w) => sum + w.nonBillableHours, 0);
    const targetHours = monthlySheets.reduce((sum, w) => sum + this.getWeeklyAllowedHours(employeeId, w.week.id), 0);

    return {
      monthStr: targetMonth,
      monthLabel: targetMonth === '2026-08' ? 'August 2026' : (targetMonth === '2026-09' ? 'September 2026' : targetMonth),
      weeks: monthlySheets,
      grandTotal,
      grandBillable,
      grandNonBillable,
      billableRatio: grandTotal > 0 ? Math.round((grandBillable / grandTotal) * 100) : 0,
      targetHours
    };
  }

  getTimesheetHistory(employeeId, statusFilter = 'all', projectFilter = 'all') {
    const allWeeks = [...this.weeks];

    const records = allWeeks.map(w => {
      const sheet = this.getTimesheet(employeeId, w.id);
      const expectedCapacity = this.getWeeklyAllowedHours(employeeId, w.id);
      
      let totalLogged = 0;
      let billableLogged = 0;
      let nonBillableLogged = 0;
      const projectMap = {};
      const workItemsSet = new Set();
      const taskCategoriesSet = new Set();

      if (sheet && sheet.rows) {
        sheet.rows.forEach(r => {
          const rSum = r.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
          totalLogged += rSum;
          const isBillable = r.isBillable !== false;
          if (isBillable) billableLogged += rSum;
          else nonBillableLogged += rSum;

          if (r.workItem && r.workItem.trim()) workItemsSet.add(r.workItem);
          if (r.task && r.task.trim()) taskCategoriesSet.add(r.task);

          if (!projectMap[r.projectId]) {
            projectMap[r.projectId] = {
              project: this.getProject(r.projectId),
              hours: 0,
              isBillable
            };
          }
          projectMap[r.projectId].hours += rSum;
        });
      }

      const status = sheet ? sheet.status : 'draft';
      const isCompliant = totalLogged === expectedCapacity && status !== 'rejected';
      const billableRatio = totalLogged > 0 ? Math.round((billableLogged / totalLogged) * 100) : 0;

      let holidaysCount = 0;
      for (let d = 0; d < 5; d++) {
        if (this.getDayLockStatus(employeeId, d, w.id).isLocked) holidaysCount++;
      }

      return {
        week: w,
        weekId: w.id,
        label: w.label,
        isCurrent: w.isCurrent,
        sheet,
        status,
        expectedCapacity,
        totalLogged,
        billableLogged,
        nonBillableLogged,
        billableRatio,
        isCompliant,
        holidaysCount,
        projects: Object.values(projectMap),
        workItems: Array.from(workItemsSet),
        tasks: Array.from(taskCategoriesSet),
        submittedAt: sheet?.submittedAt || null,
        pmApprovedByName: sheet?.pmApprovedByName || null,
        pmApprovedAt: sheet?.pmApprovedAt || null,
        rmgApprovedByName: sheet?.rmgApprovedByName || null,
        rmgApprovedAt: sheet?.rmgApprovedAt || null,
        rejectionReason: sheet?.rejectionReason || null,
        rejectedFromStage: sheet?.rejectedFromStage || null,
        rejectedAt: sheet?.rejectedAt || null
      };
    });

    // Summary Stats
    const totalLifetimeHours = records.reduce((s, r) => s + r.totalLogged, 0);
    const totalApprovedCount = records.filter(r => r.status === 'approved').length;
    const totalSubmittedCount = records.filter(r => r.status === 'submitted' || r.status === 'pm_approved').length;
    const totalDraftCount = records.filter(r => r.status === 'draft').length;
    const totalRejectedCount = records.filter(r => r.status === 'rejected').length;
    const complianceRate = records.length > 0 ? Math.round((records.filter(r => r.status === 'approved' || r.isCompliant).length / records.length) * 100) : 100;
    const avgWeeklyHours = records.length > 0 ? (totalLifetimeHours / records.length).toFixed(1) : '0.0';

    // Filter
    let filteredRecords = records;
    if (statusFilter && statusFilter !== 'all') {
      filteredRecords = filteredRecords.filter(r => r.status === statusFilter);
    }
    if (projectFilter && projectFilter !== 'all') {
      filteredRecords = filteredRecords.filter(r => r.projects.some(p => p.project?.id === projectFilter));
    }

    return {
      records: filteredRecords,
      allRecordsCount: records.length,
      stats: {
        totalLifetimeHours,
        totalApprovedCount,
        totalSubmittedCount,
        totalDraftCount,
        totalRejectedCount,
        complianceRate,
        avgWeeklyHours
      }
    };
  }

  getTimesheet(employeeId, weekId) {
    return this.data.timesheets.find(t => t.employeeId === employeeId && t.weekId === weekId);
  }

  getOrCreateTimesheet(employeeId, weekId) {
    let sheet = this.getTimesheet(employeeId, weekId);
    if (!sheet) {
      const allocs = this.getEmployeeAllocations(employeeId);
      const weekInfo = this.weeks.find(w => w.id === weekId) || this.weeks[3];

      const rows = allocs.map((alloc, idx) => {
        const proj = this.getProject(alloc.projectId);
        const defaultBillable = proj?.id !== 'proj_pulse';
        return {
          id: `row_${employeeId}_${Date.now()}_${idx}`,
          projectId: alloc.projectId,
          task: proj?.tasks?.[0] || 'Feature Development',
          workItem: proj?.workItems?.[0] || 'TSK-101',
          description: `Sprint execution for ${proj?.name || 'Project'}`,
          isBillable: defaultBillable,
          hours: [0, 0, 0, 0, 0, 0, 0],
          dayNotes: ['', '', '', '', '', '', '']
        };
      });

      sheet = {
        id: `ts_${employeeId}_${weekId}_${Date.now()}`,
        employeeId,
        weekId,
        weekStart: weekInfo.label.split(' – ')[0] || '2026-08-24',
        weekEnd: weekInfo.label.split(' – ')[1] || '2026-08-30',
        status: 'draft',
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        rows
      };

      this.data.timesheets.push(sheet);
      this.saveState();
    } else {
      // Ensure dayNotes and isBillable exist on every row
      sheet.rows.forEach(r => {
        if (r.isBillable === undefined) {
          r.isBillable = (r.projectId !== 'proj_pulse');
        }
        if (!r.dayNotes || !Array.isArray(r.dayNotes)) {
          r.dayNotes = ['', '', '', '', '', '', ''];
        }
      });
    }
    return sheet;
  }

  /* --------------------------------------------------------------------------
     Timesheet Mutations with Strict Lock and Cap Checking
     -------------------------------------------------------------------------- */
  updateCellHours(employeeId, weekId, rowId, dayIndex, hours) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') {
      return { success: false, reason: 'LOCKED' };
    }

    const lock = this.getDayLockStatus(employeeId, dayIndex, weekId);
    if (lock.isLocked) {
      return { 
        success: false, 
        reason: lock.type === 'weekend' ? 'LOCKED_WEEKEND' : 'LOCKED_DAY', 
        message: lock.type === 'weekend' ? 'Work hours cannot be logged on Saturday or Sunday.' : `Cannot log hours on ${lock.label}` 
      };
    }

    const row = sheet.rows.find(r => r.id === rowId);
    if (!row) return { success: false };

    const parsedHours = Math.max(0, parseFloat(hours) || 0);
    row.hours[dayIndex] = Math.round(parsedHours * 10) / 10;
    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
    return { success: true };
  }

  updateCellNote(employeeId, weekId, rowId, dayIndex, note) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const row = sheet.rows.find(r => r.id === rowId);
    if (row) {
      if (!row.dayNotes) row.dayNotes = ['', '', '', '', '', '', ''];
      row.dayNotes[dayIndex] = note;
      this.saveState();
      this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
    }
  }

  updateRowMetadata(employeeId, weekId, rowId, field, value) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const row = sheet.rows.find(r => r.id === rowId);
    if (row && (row[field] !== undefined || field === 'isBillable')) {
      if (field === 'isBillable') {
        row[field] = value === true || value === 'true';
      } else {
        row[field] = value;
      }
      this.saveState();
      this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
    }
  }

  addWorkItem(projectId, workItemName, employeeId = null, weekId = null, rowId = null) {
    if (!workItemName || !workItemName.trim()) return;
    const cleanName = workItemName.trim();
    const proj = this.getProject(projectId);
    if (proj) {
      if (!proj.workItems) proj.workItems = [];
      if (!proj.workItems.includes(cleanName)) {
        proj.workItems.push(cleanName);
      }
    }

    if (employeeId && weekId && rowId) {
      this.updateRowMetadata(employeeId, weekId, rowId, 'workItem', cleanName);
    }

    this.saveState();
    this.notify('PROJECTS_UPDATED', { projectId, workItem: cleanName });
    if (employeeId && weekId) {
      const sheet = this.getTimesheet(employeeId, weekId);
      this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
    }
  }

  addRow(employeeId, weekId, projectId) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const proj = this.getProject(projectId) || this.data.projects[0];
    const newRow = {
      id: `row_${employeeId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      projectId: proj.id,
      task: proj.tasks?.[0] || 'Feature Development',
      workItem: proj.workItems?.[0] || 'TSK-100',
      description: 'New task entry',
      isBillable: proj.id !== 'proj_pulse',
      hours: [0, 0, 0, 0, 0, 0, 0],
      dayNotes: ['', '', '', '', '', '', '']
    };

    sheet.rows.push(newRow);
    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
    return newRow;
  }

  deleteRow(employeeId, weekId, rowId) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;
    if (sheet.rows.length <= 1) return;

    sheet.rows = sheet.rows.filter(r => r.id !== rowId);
    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
  }

  quickFillWorkdays(employeeId, weekId) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const allocs = this.getEmployeeAllocations(employeeId);
    
    sheet.rows.forEach(row => {
      const alloc = allocs.find(a => a.projectId === row.projectId);
      const targetHrs = alloc ? Number(alloc.hoursPerDay) : 8 / (sheet.rows.length || 1);
      
      for (let d = 0; d < 5; d++) {
        const lock = this.getDayLockStatus(employeeId, d, weekId);
        if (lock.isLocked) {
          row.hours[d] = 0;
          row.dayNotes[d] = `${lock.badge}: ${lock.label}`;
        } else {
          row.hours[d] = targetHrs;
          if (!row.dayNotes[d] || row.dayNotes[d].startsWith('🏖️') || row.dayNotes[d].startsWith('🌴')) {
            row.dayNotes[d] = `${row.task} (${targetHrs}h)`;
          }
        }
      }
      row.hours[5] = 0;
      row.hours[6] = 0;
    });

    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
  }

  copyLastWeek(employeeId, weekId) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const curIdx = this.weeks.findIndex(w => w.id === weekId);
    const prevWeekId = curIdx > 0 ? this.weeks[curIdx - 1].id : '2026-W34';
    const prevSheet = this.getTimesheet(employeeId, prevWeekId);

    if (prevSheet && prevSheet.rows.length > 0) {
      sheet.rows = prevSheet.rows.map((r, i) => {
        const hours = [...r.hours];
        const notes = r.dayNotes ? [...r.dayNotes] : ['', '', '', '', '', '', ''];
        // Zero out locked days
        for (let d = 0; d < 7; d++) {
          const lock = this.getDayLockStatus(employeeId, d, weekId);
          if (lock.isLocked) {
            hours[d] = 0;
            notes[d] = `${lock.badge}: ${lock.label}`;
          }
        }
        return {
          id: `row_${employeeId}_${Date.now()}_copy_${i}`,
          projectId: r.projectId,
          task: r.task,
          workItem: r.workItem,
          description: r.description,
          hours,
          dayNotes: notes
        };
      });
    } else {
      this.quickFillWorkdays(employeeId, weekId);
    }

    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
  }

  copyYesterday(employeeId, weekId, targetDayIndex) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const lock = this.getDayLockStatus(employeeId, targetDayIndex, weekId);
    if (lock.isLocked) return;

    const prevDayIndex = targetDayIndex > 0 ? targetDayIndex - 1 : 0;
    
    sheet.rows.forEach(row => {
      row.hours[targetDayIndex] = row.hours[prevDayIndex];
      if (row.dayNotes) {
        row.dayNotes[targetDayIndex] = row.dayNotes[prevDayIndex] || '';
      }
    });

    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
  }

  copyMondayToWeek(employeeId, weekId, rowId = null) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    const rowsToProcess = rowId ? sheet.rows.filter(r => r.id === rowId) : sheet.rows;

    rowsToProcess.forEach(row => {
      const monHrs = Number(row.hours[0]) || 0;
      const monNote = (row.dayNotes && row.dayNotes[0]) || '';
      for (let d = 1; d <= 4; d++) {
        const lock = this.getDayLockStatus(employeeId, d, weekId);
        if (lock.isLocked) {
          row.hours[d] = 0;
          if (row.dayNotes) row.dayNotes[d] = `${lock.badge}: ${lock.label}`;
        } else {
          row.hours[d] = monHrs;
          if (row.dayNotes) {
            row.dayNotes[d] = monNote;
          }
        }
      }
    });

    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
  }

  clearTimesheet(employeeId, weekId) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    if (sheet.status === 'approved' || sheet.status === 'pm_approved' || sheet.status === 'submitted') return;

    sheet.rows.forEach(row => {
      row.hours = [0, 0, 0, 0, 0, 0, 0];
      row.dayNotes = ['', '', '', '', '', '', ''];
    });

    this.saveState();
    this.notify('TIMESHEET_UPDATED', { employeeId, weekId, sheet });
  }

  submitTimesheet(employeeId, weekId) {
    const sheet = this.getOrCreateTimesheet(employeeId, weekId);
    const emp = this.getEmployee(employeeId);
    const expectedWeeklyHours = this.getWeeklyAllowedHours(employeeId, weekId);

    // 1. Calculate total logged hours
    let totalLogged = 0;
    let billableLogged = 0;
    sheet.rows.forEach(r => {
      const rowSum = r.hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
      totalLogged += rowSum;
      if (r.isBillable !== false) billableLogged += rowSum;
    });

    // 2. Validate RMG Capacity Cap
    const capCheck = this.isTimesheetOverCapacity(employeeId, weekId);
    if (capCheck.isOver) {
      return { 
        success: false, 
        reason: 'CAP_EXCEEDED', 
        message: `Cannot submit: Logged hours (${capCheck.totalLogged.toFixed(1)}h) exceed RMG approved capacity (${capCheck.maxAllowed.toFixed(1)}h). Please request manager for overtime.`,
        capCheck
      };
    }

    // 3. Validate Required Working Hours Completeness
    if (totalLogged !== expectedWeeklyHours) {
      return {
        success: false,
        reason: 'HOURS_MISMATCH',
        message: totalLogged < expectedWeeklyHours
          ? `Cannot submit: You are left to fill ${(expectedWeeklyHours - totalLogged).toFixed(1)}h for this duration (${totalLogged.toFixed(1)}h / ${expectedWeeklyHours}h logged).`
          : `Cannot submit: Logged hours (${totalLogged.toFixed(1)}h) exceed expected requirement (${expectedWeeklyHours}h).`
      };
    }

    // 4. Validate All Mandatory Fields (Project, Role/Category, Work Item, and Task Summary)
    for (let i = 0; i < sheet.rows.length; i++) {
      const r = sheet.rows[i];
      const rHrs = r.hours.reduce((s, h) => s + (Number(h) || 0), 0);
      if (rHrs > 0) {
        if (!r.projectId) {
          return { success: false, reason: 'MANDATORY_FIELD_MISSING', message: `Row ${i + 1}: Project selection is mandatory.` };
        }
        if (!r.task || !r.task.trim()) {
          return { success: false, reason: 'MANDATORY_FIELD_MISSING', message: `Row ${i + 1}: Category/Role selection is mandatory.` };
        }
        if (!r.workItem || !r.workItem.trim()) {
          return { success: false, reason: 'MANDATORY_FIELD_MISSING', message: `Row ${i + 1}: Work Item selection is mandatory.` };
        }
        if (!r.description || !r.description.trim()) {
          return { success: false, reason: 'MANDATORY_FIELD_MISSING', message: `Row ${i + 1}: Task summary / description is mandatory for logged hours.` };
        }
      }
    }

    // 5. Successful Submission Transition
    sheet.status = 'submitted';
    sheet.submittedAt = new Date().toISOString();
    sheet.rejectionReason = null;
    sheet.rejectedAt = null;

    // Clear all pending reminders once submitted
    if (emp) {
      emp.nudged = false;
      emp.nudgedAt = null;
      emp.rmgNudged = false;
      emp.rmgNudgedAt = null;
    }

    // 6. Automatically Send Email & System Notifications to Assigned Project Managers
    const allocs = this.getEmployeeAllocations(employeeId);
    const notifiedPms = new Set();

    allocs.forEach(a => {
      const proj = this.getProject(a.projectId);
      if (proj && proj.pmId && !notifiedPms.has(proj.pmId)) {
        notifiedPms.add(proj.pmId);
        const pm = this.data.projectManagers.find(p => p.id === proj.pmId);

        // System in-app notification with direct review link payload
        this.data.notifications.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          targetRole: 'pm',
          targetId: proj.pmId,
          type: 'submission',
          title: `Timesheet Submitted: ${emp?.name || 'Employee'} (${weekId})`,
          message: `${emp?.name} has successfully submitted their timesheet for ${weekId} (${sheet.weekStart} – ${sheet.weekEnd}). Total Logged: ${totalLogged.toFixed(1)}h (${billableLogged.toFixed(1)}h Billable). Click to review and endorse.`,
          metadata: {
            employeeId,
            employeeName: emp?.name,
            weekId,
            period: `${sheet.weekStart} – ${sheet.weekEnd}`,
            totalHours: totalLogged,
            billableHours: billableLogged,
            reviewLink: `modal:review-sheet:${employeeId}:${weekId}`
          },
          timestamp: new Date().toISOString(),
          read: false
        });

        // Email notification dispatch simulation
        console.log(`[Email Dispatch] Sent to PM (${pm?.email || 'pm@pulse.internal'}): "${emp?.name} submitted timesheet for ${weekId} (${totalLogged}h). Review at: /timesheet-review?emp=${employeeId}&week=${weekId}"`);
      }
    });

    this.saveState();
    this.notify('TIMESHEET_SUBMITTED', { employeeId, weekId, sheet });
    return { success: true };
  }

  editAndResubmit(timesheetId) {
    const sheet = this.data.timesheets.find(t => t.id === timesheetId);
    if (sheet) {
      sheet.status = 'draft';
      sheet.rejectionReason = null;
      sheet.rejectedAt = null;
      this.saveState();
      this.notify('TIMESHEET_UPDATED', { employeeId: sheet.employeeId, weekId: sheet.weekId, sheet });
    }
  }

  /* --------------------------------------------------------------------------
     Overtime & Excess Hours Pipeline (Employee -> PM -> RMG)
     -------------------------------------------------------------------------- */
  submitOvertimeRequest(reqData) {
    const emp = this.getEmployee(reqData.employeeId);
    const proj = this.getProject(reqData.projectId);
    const pm = this.data.projectManagers.find(p => p.id === proj?.pmId) || this.data.projectManagers[0];

    const newReq = {
      id: `ot_req_${Date.now()}`,
      employeeId: reqData.employeeId,
      employeeName: emp?.name || 'Employee',
      projectId: reqData.projectId,
      projectName: proj?.name || 'Project',
      pmId: pm.id,
      pmName: pm.name,
      weekId: reqData.weekId,
      dateRequested: reqData.dateRequested || '2026-08-26',
      dayIndex: reqData.dayIndex !== undefined ? reqData.dayIndex : 2,
      extraHours: Number(reqData.extraHours) || 2,
      status: 'pending_pm', // 'pending_pm' -> 'forwarded_to_rmg' -> 'approved' / 'rejected'
      justification: reqData.justification || 'Additional project deliverables required.',
      pmNotes: null,
      rmgNotes: null,
      requestedAt: new Date().toISOString(),
      forwardedAt: null,
      approvedAt: null
    };

    if (!this.data.overtimeRequests) this.data.overtimeRequests = [];
    this.data.overtimeRequests.unshift(newReq);

    // Notify PM
    this.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      targetRole: 'pm',
      targetId: pm.id,
      type: 'overtime',
      title: 'Extra Hours Request Received',
      message: `${emp?.name} requested +${newReq.extraHours}h for ${newReq.projectName}.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('OVERTIME_REQUEST_SUBMITTED', { request: newReq });
    return newReq;
  }

  forwardOvertimeRequestToRMG(requestId, pmNotes) {
    const req = (this.data.overtimeRequests || []).find(r => r.id === requestId);
    if (!req) return;

    req.status = 'forwarded_to_rmg';
    req.pmNotes = pmNotes || 'Endorsed by PM for sprint delivery.';
    req.forwardedAt = new Date().toISOString();

    // Notify Employee
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_emp`,
      targetRole: 'employee',
      targetId: req.employeeId,
      type: 'approval',
      title: 'Extra Hours Request Endorsed by PM! 🎉',
      message: `${req.pmName} has endorsed your +${req.extraHours}h request for ${req.projectName}. Capacity is expanded and timesheet is unlocked for submission.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // Notify RMG
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_rmg`,
      targetRole: 'rmg',
      targetId: 'rmg_elena',
      type: 'overtime',
      title: 'PM Endorsed Extra Hours Request',
      message: `${req.pmName} forwarded ${req.employeeName}'s +${req.extraHours}h request on ${req.projectName}.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('OVERTIME_REQUEST_FORWARDED', { request: req });
  }

  rejectOvertimeRequestByPM(requestId, reason) {
    const req = (this.data.overtimeRequests || []).find(r => r.id === requestId);
    if (!req) return;

    req.status = 'rejected';
    req.pmNotes = reason || 'Declined by PM.';

    this.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      targetRole: 'employee',
      targetId: req.employeeId,
      type: 'rejection',
      title: 'Extra Hours Request Declined by PM',
      message: `Your +${req.extraHours}h request for ${req.projectName} was declined: "${req.pmNotes}"`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('OVERTIME_REQUEST_REJECTED', { request: req });
  }

  approveOvertimeRequestByRMG(requestId, rmgNotes) {
    const req = (this.data.overtimeRequests || []).find(r => r.id === requestId);
    if (!req) return;

    req.status = 'approved';
    req.rmgNotes = rmgNotes || 'Approved by RMG. Allocation capacity expanded.';
    req.approvedAt = new Date().toISOString();

    // Notify Employee & PM
    this.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      targetRole: 'employee',
      targetId: req.employeeId,
      type: 'approval',
      title: 'Extra Hours Request Approved by RMG! 🎉',
      message: `Your +${req.extraHours}h capacity on ${req.projectName} for ${req.dateRequested} has been approved. You can now log up to ${this.getDailyAllowedHours(req.employeeId, req.weekId, req.dayIndex)}h today.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('OVERTIME_REQUEST_APPROVED', { request: req });
  }

  rejectOvertimeRequestByRMG(requestId, reason) {
    const req = (this.data.overtimeRequests || []).find(r => r.id === requestId);
    if (!req) return;

    req.status = 'rejected';
    req.rmgNotes = reason || 'Declined by RMG due to org capacity budget constraints.';

    this.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      targetRole: 'employee',
      targetId: req.employeeId,
      type: 'rejection',
      title: 'Extra Hours Request Declined by RMG',
      message: `Your +${req.extraHours}h request was declined by RMG: "${req.rmgNotes}"`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('OVERTIME_REQUEST_REJECTED', { request: req });
  }

  /* --------------------------------------------------------------------------
     PM & RMG Multi-Stage Review & Approval Actions
     Stage 1: Employee submits -> status = 'submitted' (Under PM Review)
     Stage 2: PM approves -> status = 'pm_approved' (Automatically sent to RMG)
     Stage 3: RMG approves -> status = 'approved' (Final Approved)
     Rejections:
     - PM rejects: returns to employee as 'rejected' (reason, notified)
     - RMG rejects: returns to employee as 'rejected' -> BOTH Employee AND PM get notified!
     -------------------------------------------------------------------------- */
  approveTimesheetByPM(timesheetId, pmId) {
    const sheet = this.data.timesheets.find(t => t.id === timesheetId);
    if (!sheet) return;

    const pm = this.data.projectManagers.find(p => p.id === pmId) || { name: 'Project Manager', id: pmId };
    const emp = this.getEmployee(sheet.employeeId);

    sheet.status = 'pm_approved';
    sheet.pmApprovedBy = pm.id;
    sheet.pmApprovedByName = pm.name;
    sheet.pmApprovedAt = new Date().toISOString();
    sheet.rejectionReason = null;
    sheet.rejectedAt = null;
    sheet.rejectedBy = null;
    sheet.rejectedByName = null;
    sheet.rejectedFromStage = null;

    // 1. Notify RMG that PM approved this timesheet and it is awaiting final RMG sign-off
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_rmg`,
      targetRole: 'rmg',
      targetId: 'rmg_elena',
      type: 'submission',
      title: 'PM-Approved Timesheet Awaiting Sign-Off 📋',
      message: `${pm.name} approved ${emp?.name || 'Employee'}'s timesheet for ${sheet.weekId}. Awaiting final RMG clearance.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // 2. Notify Employee that PM approved and forwarded to RMG
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_emp`,
      targetRole: 'employee',
      targetId: sheet.employeeId,
      type: 'approval',
      title: 'Timesheet Approved by PM ⏱',
      message: `Your timesheet for ${sheet.weekId} was approved by ${pm.name} and forwarded to RMG for final sign-off.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // Clear any reminders/nudges
    if (emp) {
      emp.nudged = false;
      emp.nudgedAt = null;
      emp.rmgNudged = false;
      emp.rmgNudgedAt = null;
    }

    this.saveState();
    this.notify('TIMESHEET_PM_APPROVED', { sheet, pm });
  }

  // Alias for PM approval
  approveTimesheet(timesheetId, approverId) {
    return this.approveTimesheetByPM(timesheetId, approverId);
  }

  approveTimesheetByRMG(timesheetId, rmgId = 'rmg_elena') {
    const sheet = this.data.timesheets.find(t => t.id === timesheetId);
    if (!sheet) return;

    const emp = this.getEmployee(sheet.employeeId);

    sheet.status = 'approved';
    sheet.rmgApprovedBy = rmgId;
    sheet.rmgApprovedByName = 'Elena Rostova (Head of RMG)';
    sheet.rmgApprovedAt = new Date().toISOString();
    sheet.approvedAt = sheet.rmgApprovedAt;
    sheet.approvedBy = rmgId;
    sheet.rejectionReason = null;

    // Clear any reminders/nudges
    if (emp) {
      emp.nudged = false;
      emp.nudgedAt = null;
      emp.rmgNudged = false;
      emp.rmgNudgedAt = null;
    }

    // 1. Notify Employee of Final RMG Approval
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_emp`,
      targetRole: 'employee',
      targetId: sheet.employeeId,
      type: 'approval',
      title: 'Timesheet Final Approved! 🎉',
      message: `Your timesheet for ${sheet.weekId} has received final RMG approval and is officially archived.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // 2. Notify PM who endorsed it that RMG finalized it
    if (sheet.pmApprovedBy) {
      this.data.notifications.unshift({
        id: `notif_${Date.now()}_pm`,
        targetRole: 'pm',
        targetId: sheet.pmApprovedBy,
        type: 'approval',
        title: 'Timesheet Finalized by RMG ✓',
        message: `${emp?.name || 'Employee'}'s timesheet for ${sheet.weekId} (which you endorsed) received final RMG sign-off.`,
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    this.saveState();
    this.notify('TIMESHEET_RMG_APPROVED', { sheet });
  }

  rejectTimesheetByPM(timesheetId, pmId, reason) {
    const sheet = this.data.timesheets.find(t => t.id === timesheetId);
    if (!sheet) return;

    const pm = this.data.projectManagers.find(p => p.id === pmId) || { name: 'Project Manager', id: pmId };
    const emp = this.getEmployee(sheet.employeeId);

    sheet.status = 'rejected';
    sheet.rejectedAt = new Date().toISOString();
    sheet.rejectedBy = pm.id;
    sheet.rejectedByName = pm.name;
    sheet.rejectedFromStage = 'pm';
    sheet.rejectionReason = reason || 'Please revise task details and resubmit.';

    // Clear any reminders/nudges
    if (emp) {
      emp.nudged = false;
      emp.nudgedAt = null;
      emp.rmgNudged = false;
      emp.rmgNudgedAt = null;
    }

    // Notify Employee
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_emp`,
      targetRole: 'employee',
      targetId: sheet.employeeId,
      type: 'rejection',
      title: 'Timesheet Revision Requested by PM ⚠️',
      message: `${pm.name} returned your timesheet for ${sheet.weekId} with remarks: "${sheet.rejectionReason}"`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('TIMESHEET_REJECTED', { sheet, reason, rejectedBy: pm.name, stage: 'pm' });
  }

  // Alias for PM rejection
  rejectTimesheet(timesheetId, approverId, reason) {
    return this.rejectTimesheetByPM(timesheetId, approverId, reason);
  }

  rejectTimesheetByRMG(timesheetId, rmgId = 'rmg_elena', reason) {
    const sheet = this.data.timesheets.find(t => t.id === timesheetId);
    if (!sheet) return;

    const emp = this.getEmployee(sheet.employeeId);
    const rmgName = 'RMG (Elena Rostova)';

    sheet.status = 'rejected';
    sheet.rejectedAt = new Date().toISOString();
    sheet.rejectedBy = rmgId;
    sheet.rejectedByName = rmgName;
    sheet.rejectedFromStage = 'rmg';
    sheet.rejectionReason = reason || 'RMG audit rejected hours allocation. Please revise.';

    // 1. Notify Employee
    this.data.notifications.unshift({
      id: `notif_${Date.now()}_emp`,
      targetRole: 'employee',
      targetId: sheet.employeeId,
      type: 'rejection',
      title: 'Timesheet Rejected by RMG ⚠️',
      message: `RMG returned your timesheet for ${sheet.weekId} with remarks: "${sheet.rejectionReason}". Please edit and resubmit.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    // 2. Notify PM who previously approved this timesheet
    if (sheet.pmApprovedBy) {
      this.data.notifications.unshift({
        id: `notif_${Date.now()}_pm`,
        targetRole: 'pm',
        targetId: sheet.pmApprovedBy,
        type: 'rejection',
        title: 'Timesheet Rejected by RMG ⚠️',
        message: `${emp?.name || 'Employee'}'s timesheet for ${sheet.weekId} (which you approved) was rejected by RMG with remarks: "${sheet.rejectionReason}".`,
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    this.saveState();
    this.notify('TIMESHEET_RMG_REJECTED', { sheet, reason, stage: 'rmg' });
  }

  getPMApprovedTimesheets(weekId = null) {
    return this.data.timesheets.filter(t => {
      if (weekId && t.weekId !== weekId) return false;
      return t.status === 'pm_approved';
    });
  }

  pmApproveTimesheet(employeeId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const sheet = this.getTimesheet(employeeId, targetWeek);
    const pm = this.getActivePM();
    if (sheet) {
      this.approveTimesheetByPM(sheet.id, pm?.id || 'pm_sarah');
    }
  }

  approveAllSubmitted(pmId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const summary = this.getPMTimesheetSummary(pmId, targetWeek);
    if (!summary) return 0;

    let count = 0;
    summary.teamMembers.forEach(m => {
      if (m.status === 'submitted' && m.sheet) {
        this.approveTimesheetByPM(m.sheet.id, pmId);
        count++;
      }
    });
    return count;
  }

  nudgeAllPending(pmId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const summary = this.getPMTimesheetSummary(pmId, targetWeek);
    if (!summary) return 0;

    let count = 0;
    summary.teamMembers.forEach(m => {
      if (m.status === 'draft') {
        this.nudgeEmployee(m.employee.id, pmId);
        count++;
      }
    });
    return count;
  }

  forwardOvertimeToRMG(requestId, pmNotes) {
    return this.forwardOvertimeRequestToRMG(requestId, pmNotes);
  }

  rejectOvertimeByPM(requestId, reason) {
    return this.rejectOvertimeRequestByPM(requestId, reason);
  }

  nudgeEmployee(employeeId, pmId) {
    const emp = this.getEmployee(employeeId);
    if (!emp) return;

    emp.nudged = true;
    emp.nudgedAt = new Date().toISOString();

    const pm = this.data.projectManagers.find(p => p.id === pmId) || this.getActivePM() || { name: 'Project Manager' };

    this.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      targetRole: 'employee',
      targetId: employeeId,
      type: 'nudge',
      title: `Reminder from ${pm.name}`,
      message: `Please complete and submit your timesheet for ${this.selectedWeekId}.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('EMPLOYEE_NUDGED', { employeeId, pmId });
  }

  /* --------------------------------------------------------------------------
     RMG Compliance, Reminders & Multi-PM Team Governance
     -------------------------------------------------------------------------- */
  setRmgSelectedPmId(pmId) {
    this.rmgSelectedPmId = pmId || 'all';
    this.notify('RMG_PM_FILTER_CHANGED', { pmId: this.rmgSelectedPmId });
  }

  // RMG sends direct reminder to an employee to submit their timesheet
  nudgeEmployeeFromRMG(employeeId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const emp = this.getEmployee(employeeId);
    if (!emp) return;

    emp.rmgNudged = true;
    emp.rmgNudgedAt = new Date().toISOString();

    this.data.notifications.unshift({
      id: `notif_${Date.now()}_emp_rmg`,
      targetRole: 'employee',
      targetId: employeeId,
      type: 'nudge',
      title: 'Timesheet Submission Notice from RMG 🔔',
      message: `Elena Rostova (Head of RMG) requested that you fill and submit your timesheet for ${targetWeek}.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('RMG_EMPLOYEE_NUDGED', { employeeId, weekId: targetWeek });
  }

  // RMG sends reminder to a PM who has pending employee timesheets awaiting PM approval
  nudgePMFromRMG(pmId, weekId = null, pendingCount = 1) {
    const targetWeek = weekId || this.selectedWeekId;
    const pm = this.data.projectManagers.find(p => p.id === pmId);
    if (!pm) return;

    pm.rmgNudged = true;
    pm.rmgNudgedAt = new Date().toISOString();

    this.data.notifications.unshift({
      id: `notif_${Date.now()}_pm_rmg`,
      targetRole: 'pm',
      targetId: pmId,
      type: 'nudge',
      title: 'Timesheet Review Reminder from RMG 📢',
      message: `Elena Rostova (RMG) noticed you have ${pendingCount} timesheet(s) awaiting your PM review for ${targetWeek}. Please review and endorse to RMG.`,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.saveState();
    this.notify('RMG_PM_NUDGED', { pmId, weekId: targetWeek, pendingCount });
  }

  // RMG Bulk Reminder to all unfilled/draft employees
  nudgeAllUnfilledEmployeesFromRMG(weekId = null, pmId = 'all') {
    const targetWeek = weekId || this.selectedWeekId;
    let targetEmployees = [];

    if (pmId === 'all') {
      targetEmployees = this.data.employees;
    } else {
      const pm = this.data.projectManagers.find(p => p.id === pmId);
      if (pm) {
        const empIds = new Set(this.data.allocations.filter(a => pm.projectIds.includes(a.projectId)).map(a => a.employeeId));
        targetEmployees = this.data.employees.filter(e => empIds.has(e.id));
      }
    }

    let count = 0;
    targetEmployees.forEach(emp => {
      const sheet = this.getTimesheet(emp.id, targetWeek);
      const isDraftOrEmpty = !sheet || sheet.status === 'draft' || sheet.rows.reduce((s, r) => s + r.hours.reduce((x, h) => x + (Number(h) || 0), 0), 0) === 0;
      if (isDraftOrEmpty) {
        emp.rmgNudged = true;
        emp.rmgNudgedAt = new Date().toISOString();

        this.data.notifications.unshift({
          id: `notif_${Date.now()}_${emp.id}`,
          targetRole: 'employee',
          targetId: emp.id,
          type: 'nudge',
          title: 'Timesheet Submission Notice from RMG 🔔',
          message: `Elena Rostova (Head of RMG) requested that you fill and submit your timesheet for ${targetWeek}.`,
          timestamp: new Date().toISOString(),
          read: false
        });
        count++;
      }
    });

    this.saveState();
    this.notify('RMG_ALL_UNFILLED_NUDGED', { count, weekId: targetWeek, pmId });
    return count;
  }

  // RMG Bulk Reminder to all PMs who have pending employee timesheets
  nudgeAllPendingPMsFromRMG(weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    let notifiedPMsCount = 0;

    this.data.projectManagers.forEach(pm => {
      const teamSummary = this.getPMTimesheetSummary(pm.id, targetWeek);
      if (teamSummary.submittedCount > 0) {
        this.nudgePMFromRMG(pm.id, targetWeek, teamSummary.submittedCount);
        notifiedPMsCount++;
      }
    });

    return notifiedPMsCount;
  }

  // Query team timesheet breakdown for a given PM
  getPMTimesheetSummary(pmId, weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const pm = this.data.projectManagers.find(p => p.id === pmId);
    if (!pm) return null;

    const pmProjects = this.data.projects.filter(p => pm.projectIds.includes(p.id));
    const pmAllocations = this.data.allocations.filter(a => pm.projectIds.includes(a.projectId));
    const teamEmpIds = [...new Set(pmAllocations.map(a => a.employeeId))];

    const teamMembers = teamEmpIds.map(empId => {
      const emp = this.getEmployee(empId);
      const empAllocs = pmAllocations.filter(a => a.employeeId === empId);
      const sheet = this.getTimesheet(empId, targetWeek);
      const totalLoggedHours = sheet ? sheet.rows.reduce((s, r) => s + r.hours.reduce((x, h) => x + (Number(h) || 0), 0), 0) : 0;
      const targetDailyHours = empAllocs.reduce((s, a) => s + Number(a.hoursPerDay), 0);
      let targetWeeklyHours = 0;
      for (let d = 0; d < 5; d++) {
        const lock = this.getDayLockStatus(empId, d, targetWeek);
        if (!lock.isLocked) {
          targetWeeklyHours += targetDailyHours;
        }
      }

      let status = 'draft';
      if (sheet) {
        status = sheet.status;
      }

      return {
        employee: emp,
        allocations: empAllocs,
        projects: empAllocs.map(a => this.getProject(a.projectId)),
        sheet,
        status,
        totalLoggedHours,
        targetWeeklyHours
      };
    });

    const draftCount = teamMembers.filter(m => m.status === 'draft').length;
    const submittedCount = teamMembers.filter(m => m.status === 'submitted').length;
    const pmApprovedCount = teamMembers.filter(m => m.status === 'pm_approved').length;
    const approvedCount = teamMembers.filter(m => m.status === 'approved').length;
    const rejectedCount = teamMembers.filter(m => m.status === 'rejected').length;
    const totalTeam = teamMembers.length;
    const complianceRate = totalTeam > 0 ? Math.round(((totalTeam - draftCount) / totalTeam) * 100) : 100;

    return {
      pm,
      projects: pmProjects,
      teamMembers,
      totalTeam,
      draftCount,
      submittedCount,
      pmApprovedCount,
      approvedCount,
      rejectedCount,
      complianceRate
    };
  }

  // Org-wide timesheet status breakdown for RMG
  getOrgTimesheetSummary(weekId = null) {
    const targetWeek = weekId || this.selectedWeekId;
    const totalEmployees = this.data.employees.length;

    let draftCount = 0;
    let submittedCount = 0;
    let pmApprovedCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    this.data.employees.forEach(emp => {
      const sheet = this.getTimesheet(emp.id, targetWeek);
      if (!sheet || sheet.status === 'draft') {
        draftCount++;
      } else if (sheet.status === 'submitted') {
        submittedCount++;
      } else if (sheet.status === 'pm_approved') {
        pmApprovedCount++;
      } else if (sheet.status === 'approved') {
        approvedCount++;
      } else if (sheet.status === 'rejected') {
        rejectedCount++;
      }
    });

    return {
      totalEmployees,
      draftCount,
      submittedCount,
      pmApprovedCount,
      approvedCount,
      rejectedCount
    };
  }

  /* --------------------------------------------------------------------------
     RMG Allocations & Resource Requests
     -------------------------------------------------------------------------- */
  createAllocation(allocData) {
    const newAlloc = {
      id: `alloc_${Date.now()}`,
      employeeId: allocData.employeeId,
      projectId: allocData.projectId,
      hoursPerDay: Number(allocData.hoursPerDay) || 8,
      startDate: allocData.startDate || '2026-09-01',
      endDate: allocData.endDate || '2026-11-30',
      roleDescription: allocData.roleDescription || 'Assigned Engineer'
    };

    this.data.allocations.push(newAlloc);
    this.saveState();
    this.notify('ALLOCATION_CREATED', { allocation: newAlloc });
    return newAlloc;
  }

  submitResourceRequest(reqData) {
    const newReq = {
      id: `req_${Date.now()}`,
      pmId: reqData.pmId,
      pmName: reqData.pmName,
      projectId: reqData.projectId,
      projectName: reqData.projectName,
      roleRequired: reqData.roleRequired,
      hoursPerWeek: Number(reqData.hoursPerWeek) || 20,
      hoursPerDay: Math.round((Number(reqData.hoursPerWeek) || 20) / 5 * 10) / 10,
      durationWeeks: Number(reqData.durationWeeks) || 4,
      startDate: reqData.startDate || '2026-09-01',
      endDate: reqData.endDate || '2026-09-30',
      status: 'pending',
      notes: reqData.notes || '',
      suggestedCandidateId: reqData.suggestedCandidateId || null
    };

    this.data.resourceRequests.unshift(newReq);
    this.saveState();
    this.notify('RESOURCE_REQUEST_SUBMITTED', { request: newReq });
    return newReq;
  }

  approveResourceRequest(requestId, assignedEmployeeId, hoursPerDay) {
    const req = this.data.resourceRequests.find(r => r.id === requestId);
    if (!req) return;

    req.status = 'approved';
    req.assignedEmployeeId = assignedEmployeeId;

    this.createAllocation({
      employeeId: assignedEmployeeId,
      projectId: req.projectId,
      hoursPerDay: hoursPerDay || req.hoursPerDay || 4,
      startDate: req.startDate,
      endDate: req.endDate,
      roleDescription: req.roleRequired
    });

    this.saveState();
    this.notify('RESOURCE_REQUEST_APPROVED', { request: req });
  }

  rejectResourceRequest(requestId, reason) {
    const req = this.data.resourceRequests.find(r => r.id === requestId);
    if (!req) return;

    req.status = 'rejected';
    req.rejectionReason = reason || 'Resource unavailable for requested dates.';

    this.saveState();
    this.notify('RESOURCE_REQUEST_REJECTED', { request: req });
  }

  /* --------------------------------------------------------------------------
     Role-Isolated Notification Filtering & Management
     -------------------------------------------------------------------------- */
  getActiveUserNotifications() {
    const role = this.currentRole;
    const userId = this.activeUserId;

    return this.data.notifications.filter(n => {
      if (role === 'rmg') {
        return n.targetRole === 'rmg' || n.targetId === 'rmg_elena';
      }
      if (role === 'pm') {
        const pm = this.getActivePM();
        const targetPmId = pm ? pm.id : userId;
        return n.targetRole === 'pm' && (!n.targetId || n.targetId === targetPmId);
      }
      if (role === 'employee') {
        const emp = this.getActiveEmployee();
        const targetEmpId = emp ? emp.id : userId;
        return n.targetRole === 'employee' && (!n.targetId || n.targetId === targetEmpId);
      }
      return false;
    });
  }

  getActiveUserUnreadCount() {
    return this.getActiveUserNotifications().filter(n => !n.read).length;
  }

  markActiveUserNotificationsAsRead() {
    const activeNotifs = this.getActiveUserNotifications();
    activeNotifs.forEach(n => {
      n.read = true;
    });
    this.saveState();
    this.notify('NOTIFICATIONS_READ');
  }
}

// Global state instance
const state = new PulseState();

if (typeof window !== 'undefined') {
  window.state = state;
}
if (typeof global !== 'undefined') {
  global.state = state;
}
