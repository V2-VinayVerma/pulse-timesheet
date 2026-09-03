/* ==========================================================================
   Pulse Mock Data Store — 7 Enterprise Projects with Human-Readable Work Items
   ========================================================================== */

const INITIAL_MOCK_DATA = {
  // 6 Employee Personas
  employees: [
    {
      id: 'emp_alex',
      name: 'Alex Chen',
      role: 'Senior Frontend Engineer',
      department: 'Core Engineering',
      avatar: 'AC',
      email: 'alex.chen@pulse.internal',
      skills: ['React', 'TypeScript', 'CSS/Design System', 'GraphQL'],
      nudged: false
    },
    {
      id: 'emp_priya',
      name: 'Priya Sharma',
      role: 'Full Stack Engineer',
      department: 'Engineering Platforms',
      avatar: 'PS',
      email: 'priya.sharma@pulse.internal',
      skills: ['Node.js', 'PostgreSQL', 'Stripe API', 'React'],
      nudged: false
    },
    {
      id: 'emp_marcus',
      name: 'Marcus Vance',
      role: 'Mobile & Cloud Specialist',
      department: 'Mobile Tech Group',
      avatar: 'MV',
      email: 'marcus.vance@pulse.internal',
      skills: ['iOS / Swift', 'Android / Kotlin', 'AWS', 'Flutter'],
      nudged: false
    },
    {
      id: 'emp_maya',
      name: 'Maya Patel',
      role: 'Staff Product Designer',
      department: 'Product Design',
      avatar: 'MP',
      email: 'maya.patel@pulse.internal',
      skills: ['Figma', 'UX Research', 'Design Systems', 'Prototyping'],
      nudged: false
    },
    {
      id: 'emp_liam',
      name: 'Liam O\'Connor',
      role: 'DevOps & Site Reliability Lead',
      department: 'Infrastructure',
      avatar: 'LO',
      email: 'liam.oconnor@pulse.internal',
      skills: ['Kubernetes', 'Terraform', 'AWS', 'Prometheus/Grafana'],
      nudged: false
    },
    {
      id: 'emp_elena',
      name: 'Elena Rostova',
      role: 'Principal Solutions Architect',
      department: 'Architecture & RMG',
      avatar: 'ER',
      email: 'elena.rostova@pulse.internal',
      skills: ['System Architecture', 'Security', 'Capacity Planning'],
      nudged: false
    }
  ],

  // 7 Enterprise Projects for Diverse Use Cases
  projects: [
    {
      id: 'proj_apex',
      code: 'APX-2026',
      name: 'Project Apex (FinTech Portal)',
      client: 'Horizon Financial Ltd.',
      pmId: 'pm_sarah',
      budgetHours: 1400,
      loggedHours: 680,
      status: 'active',
      color: '#4f46e5',
      tasks: [
        'Feature Development',
        'Security & OAuth2 Integration',
        'UI & Frontend Refinements',
        'Bug Triage & Patches',
        'Sprint Planning & Backlog Sync'
      ],
      workItems: [
        'Stripe Checkout Integration',
        'OAuth2 Token Security',
        'Transaction Engine Refactor',
        'Payment Webhook Handlers',
        'Multi-Currency Fee Calculation'
      ]
    },
    {
      id: 'proj_nova',
      code: 'NOV-881',
      name: 'Project Nova (Cloud Migration)',
      client: 'OmniGlobal Enterprise',
      pmId: 'pm_david',
      budgetHours: 950,
      loggedHours: 420,
      status: 'active',
      color: '#0ea5e9',
      tasks: [
        'Cloud Database Architecture',
        'Terraform Infrastructure',
        'Kubernetes Ingress Automation',
        'Load Testing & Latency Tuning',
        'Disaster Recovery Drill'
      ],
      workItems: [
        'Aurora PostgreSQL Sharding',
        'AWS Terraform Automation',
        'Kubernetes Ingress Controller',
        'Latency Benchmarking & Patch',
        'Staging Failover Testing'
      ]
    },
    {
      id: 'proj_pulse',
      code: 'PLS-100',
      name: 'Project Pulse (Internal Platform)',
      client: 'Core Operations',
      pmId: 'pm_sarah',
      budgetHours: 600,
      loggedHours: 310,
      status: 'active',
      color: '#10b981',
      tasks: [
        'UX Research & Timesheet Redesign',
        'Smart Quick-Fill Actions',
        'Approval Workflow Engine',
        'Org-wide Utilization Analytics'
      ],
      workItems: [
        'Timesheet Grid Redesign',
        'Smart Bulk-Fill Workflows',
        'Multi-Tier Approval Pipeline',
        'Resource Utilization Matrix'
      ]
    },
    {
      id: 'proj_helios',
      code: 'HEL-500',
      name: 'Project Helios (AI Workflow Engine)',
      client: 'NextGen Media Corp',
      pmId: 'pm_david',
      budgetHours: 1100,
      loggedHours: 240,
      status: 'active',
      color: '#8b5cf6',
      tasks: [
        'Prompt Pipeline & Caching',
        'Multimodal Streaming Service',
        'Vector DB Semantic Indexing',
        'API Integration & Demo'
      ],
      workItems: [
        'LLM Prompt Caching Layer',
        'Multimodal Streaming Service',
        'Vector Semantic Search Index',
        'Client SDK Integration'
      ]
    },
    {
      id: 'proj_quantum',
      code: 'QTM-770',
      name: 'Project Quantum (HealthTech Analytics)',
      client: 'BioVance Health Systems',
      pmId: 'pm_david',
      budgetHours: 1500,
      loggedHours: 510,
      status: 'active',
      color: '#059669',
      tasks: [
        'HIPAA Patient Telemetry',
        'Clinical Trial Data Pipeline',
        'Predictive Vitals ML Model',
        'HL7/FHIR Protocol Integrator'
      ],
      workItems: [
        'Telemetry Stream Ingestion',
        'Clinical Trial ML Models',
        'Predictive Alert Engine',
        'FHIR Data Mapping Service'
      ]
    },
    {
      id: 'proj_cybershield',
      code: 'CYB-990',
      name: 'Project CyberShield (SecOps Platform)',
      client: 'Vanguard Defense Group',
      pmId: 'pm_sarah',
      budgetHours: 850,
      loggedHours: 390,
      status: 'active',
      color: '#dc2626',
      tasks: [
        'Zero Trust Identity Gateway',
        'Threat Hunting & Anomaly Alerts',
        'SIEM Log Ingestion Pipeline',
        'Automated Incident Response'
      ],
      workItems: [
        'Zero Trust Proxy Config',
        'Threat Hunting ML Rules',
        'SIEM Log Normalization',
        'Automated Remediation Playbooks'
      ]
    },
    {
      id: 'proj_aurora',
      code: 'AUR-320',
      name: 'Project Aurora (NextGen Mobile POS)',
      client: 'Retail Ventures Worldwide',
      pmId: 'pm_david',
      budgetHours: 900,
      loggedHours: 180,
      status: 'active',
      color: '#d97706',
      tasks: [
        'NFC Contactless Payment Engine',
        'Offline SQLite Queue',
        'Inventory Barcode Scanner SDK',
        'Receipt Printer BLE Driver'
      ],
      workItems: [
        'NFC Apple/Google Pay Integration',
        'Offline Transaction Queue',
        'Barcode Scanner Camera SDK',
        'Bluetooth Printer Driver'
      ]
    }
  ],

  // 2 Project Managers
  projectManagers: [
    {
      id: 'pm_sarah',
      name: 'Sarah Jenkins',
      title: 'Lead Technical PM',
      avatar: 'SJ',
      email: 'sarah.jenkins@pulse.internal',
      projectIds: ['proj_apex', 'proj_pulse', 'proj_cybershield']
    },
    {
      id: 'pm_david',
      name: 'David Kim',
      title: 'Senior Engineering PM',
      avatar: 'DK',
      email: 'david.kim@pulse.internal',
      projectIds: ['proj_nova', 'proj_helios', 'proj_quantum', 'proj_aurora']
    }
  ],

  // 1 Resource Manager
  resourceManagers: [
    {
      id: 'rmg_elena',
      name: 'Elena Rostova',
      title: 'Head of Resource Management (RMG)',
      avatar: 'ER',
      email: 'elena.rostova@pulse.internal'
    }
  ],

  // Active Allocations (linking employees to projects with target hours/day)
  allocations: [
    // Alex Chen: 8h/day on Apex
    {
      id: 'alloc_1',
      employeeId: 'emp_alex',
      projectId: 'proj_apex',
      hoursPerDay: 8,
      startDate: '2026-07-01',
      endDate: '2026-10-31',
      roleDescription: 'Senior Frontend Dev'
    },
    // Priya Sharma: Split 4h Apex + 4h Nova (8h/day total)
    {
      id: 'alloc_2',
      employeeId: 'emp_priya',
      projectId: 'proj_apex',
      hoursPerDay: 4,
      startDate: '2026-06-15',
      endDate: '2026-09-30',
      roleDescription: 'Full Stack Integration'
    },
    {
      id: 'alloc_3',
      employeeId: 'emp_priya',
      projectId: 'proj_nova',
      hoursPerDay: 4,
      startDate: '2026-07-01',
      endDate: '2026-10-15',
      roleDescription: 'API Services Engineer'
    },
    // Marcus Vance: 0% utilization (ON BENCH)
    // No active allocation initially

    // Maya Patel: 6h/day on Pulse (75% utilization)
    {
      id: 'alloc_4',
      employeeId: 'emp_maya',
      projectId: 'proj_pulse',
      hoursPerDay: 6,
      startDate: '2026-08-01',
      endDate: '2026-11-30',
      roleDescription: 'Lead Product Designer'
    },
    // Liam O'Connor: 8h/day on Nova (100% utilization)
    {
      id: 'alloc_5',
      employeeId: 'emp_liam',
      projectId: 'proj_nova',
      hoursPerDay: 8,
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      roleDescription: 'Platform & Cloud SRE'
    },
    // Elena Rostova: 2h/day on Helios (25% utilization)
    {
      id: 'alloc_6',
      employeeId: 'emp_elena',
      projectId: 'proj_helios',
      hoursPerDay: 2,
      startDate: '2026-08-01',
      endDate: '2026-10-31',
      roleDescription: 'Architecture Advisor'
    }
  ],

  // Multi-Week Timesheets with per-day descriptions ('dayNotes')
  timesheets: [
    // Alex Chen - Current Week (Draft)
    {
      id: 'ts_alex_w35',
      employeeId: 'emp_alex',
      weekId: '2026-W35',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      status: 'draft',
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      rows: [
        {
          id: 'row_alex_1',
          projectId: 'proj_apex',
          task: 'Feature Development',
          workItem: 'Stripe Checkout Integration',
          description: 'Multi-currency checkout validation and fee calculation engine',
          hours: [8, 8, 0, 0, 0, 0, 0],
          dayNotes: [
            'Implemented Stripe currency conversion helper and unit tests',
            'Added payment intent status polling and error banner fallback',
            '',
            '',
            '',
            '',
            ''
          ]
        }
      ]
    },
    // Alex Chen - Last Week (Approved)
    {
      id: 'ts_alex_w34',
      employeeId: 'emp_alex',
      weekId: '2026-W34',
      weekStart: '2026-08-17',
      weekEnd: '2026-08-23',
      status: 'approved',
      submittedAt: '2026-08-21T17:45:00Z',
      approvedAt: '2026-08-22T10:15:00Z',
      approvedBy: 'pm_sarah',
      rejectedAt: null,
      rejectionReason: null,
      rows: [
        {
          id: 'row_alex_w34_1',
          projectId: 'proj_apex',
          task: 'Security & OAuth2 Integration',
          workItem: 'OAuth2 Token Security',
          description: 'Refactored token refresh interceptor and unit tests',
          hours: [8, 8, 8, 8, 8, 0, 0],
          dayNotes: [
            'OAuth2 refresh token rotation flow',
            'Token expiry countdown toast and silent renew',
            'CSRF token validation filter middleware',
            'End-to-end security audit fixes',
            'Deployment build and PR review verification',
            '',
            ''
          ]
        }
      ]
    },

    // Priya Sharma - Current Week (SUBMITTED)
    // Works on 2 projects in the same day (4h/4h each) with individual dayNotes!
    {
      id: 'ts_priya_w35',
      employeeId: 'emp_priya',
      weekId: '2026-W35',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      status: 'submitted',
      submittedAt: '2026-08-26T16:30:00Z',
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      rows: [
        {
          id: 'row_priya_1',
          projectId: 'proj_apex',
          task: 'Feature Development',
          workItem: 'Payment Webhook Handlers',
          description: 'Stripe webhook receiver and idempotency key caching',
          hours: [4, 4, 4, 4, 4, 0, 0],
          dayNotes: [
            'Webhook secret verification and HMAC signature check',
            'Redis idempotency lock with TTL expiration',
            'Dead-letter queue consumer for failed events',
            'Stress testing with 500 concurrent events',
            'Documentation update and swagger contract sync',
            '',
            ''
          ]
        },
        {
          id: 'row_priya_2',
          projectId: 'proj_nova',
          task: 'Cloud Database Architecture',
          workItem: 'Aurora PostgreSQL Sharding',
          description: 'Aurora PostgreSQL partitioned schema migrations',
          hours: [4, 4, 4, 4, 4, 0, 0],
          dayNotes: [
            'Partition key definition on customer_transactions table',
            'Zero-downtime migration script with foreign key checks',
            'Read-replica connection pooling with PgBouncer',
            'Query explain plan analysis and composite indexes',
            'Staging failover testing and recovery script',
            '',
            ''
          ]
        }
      ]
    },

    // Maya Patel - Current Week (REJECTED)
    {
      id: 'ts_maya_w35',
      employeeId: 'emp_maya',
      weekId: '2026-W35',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      status: 'rejected',
      submittedAt: '2026-08-25T11:00:00Z',
      approvedAt: null,
      rejectedAt: '2026-08-25T14:30:00Z',
      rejectedBy: 'pm_sarah',
      rejectionReason: 'Please clarify Wednesday\'s 6h entry: break down between UX Research and Design System tokens so we can properly allocate client billable hours.',
      rows: [
        {
          id: 'row_maya_1',
          projectId: 'proj_pulse',
          task: 'UX Research & Timesheet Redesign',
          workItem: 'Timesheet Grid Redesign',
          description: 'User interviews with engineering leads regarding timesheet friction points',
          hours: [6, 6, 6, 6, 6, 0, 0],
          dayNotes: [
            'Conducted 3 interviews with Frontend team',
            'Analyzed feedback on Zoho grid pain points',
            'Synthesized sprint requirements and flow diagrams',
            'Created high-fidelity Figma components',
            'Design review presentation with PM Sarah',
            '',
            ''
          ]
        }
      ]
    },

    // Marcus Vance - Current Week (PM APPROVED -> Pending RMG Sign-off)
    {
      id: 'ts_marcus_w35',
      employeeId: 'emp_marcus',
      weekId: '2026-W35',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      status: 'pm_approved',
      submittedAt: '2026-08-26T12:00:00Z',
      pmApprovedBy: 'pm_david',
      pmApprovedByName: 'David Kim',
      pmApprovedAt: '2026-08-26T15:30:00Z',
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      rows: [
        {
          id: 'row_marcus_1',
          projectId: 'proj_helios',
          task: 'Swift UI Core Architecture',
          workItem: 'iOS Biometric Authentication',
          description: 'FaceID and TouchID keychain encryption wrappers with biometric fallback',
          hours: [4, 4, 4, 4, 4, 0, 0],
          dayNotes: [
            'Keychain wrapper implementation with Secure Enclave',
            'Biometric prompt error handling & unit tests',
            'Fallback passcode challenge UI layout',
            'Memory leak check with Xcode Instruments',
            'PR submitted for PM review',
            '',
            ''
          ]
        },
        {
          id: 'row_marcus_2',
          projectId: 'proj_aurora',
          task: 'Offline Sync & Payment Gateway',
          workItem: 'NFC Contactless Payment Engine',
          description: 'CoreNFC framework integration and EMV contactless card reading',
          hours: [4, 4, 4, 4, 4, 0, 0],
          dayNotes: [
            'CoreNFC session setup and tag discovery listener',
            'APDU command-response parser implementation',
            'Offline transaction cache in encrypted SQLite',
            'Card tap timeout and retry vibration feedback',
            'Hardware testing on iPhone 15 Pro test device',
            '',
            ''
          ]
        }
      ]
    },

    // Liam O'Connor - Current Week (APPROVED by PM & RMG)
    {
      id: 'ts_liam_w35',
      employeeId: 'emp_liam',
      weekId: '2026-W35',
      weekStart: '2026-08-24',
      weekEnd: '2026-08-30',
      status: 'approved',
      submittedAt: '2026-08-26T09:15:00Z',
      pmApprovedBy: 'pm_david',
      pmApprovedByName: 'David Kim',
      pmApprovedAt: '2026-08-26T11:00:00Z',
      rmgApprovedBy: 'rmg_elena',
      rmgApprovedByName: 'Elena Rostova',
      approvedAt: '2026-08-26T14:20:00Z',
      rows: [
        {
          id: 'row_liam_1',
          projectId: 'proj_nova',
          task: 'Kubernetes Ingress Automation',
          workItem: 'Kubernetes Ingress Controller',
          description: 'Istio service mesh sidecar injection and mTLS certificate rotation',
          hours: [8, 8, 8, 8, 8, 0, 0],
          dayNotes: [
            'Configured cert-manager with Let\'s Encrypt cluster issuer',
            'Automated mTLS STRICT enforcement across namespaces',
            'Deployed ingress rate limiter filter plugin',
            'Benchmarked SSL handshake latency under high RPS',
            'Prepared Grafana dashboard and alert rules',
            '',
            ''
          ]
        }
      ]
    }
  ],

  // Resource Requests Queue (PM -> RMG)
  resourceRequests: [
    {
      id: 'req_1',
      pmId: 'pm_sarah',
      pmName: 'Sarah Jenkins',
      projectId: 'proj_apex',
      projectName: 'Project Apex (FinTech Portal)',
      roleRequired: 'Senior Mobile Engineer (iOS/Android)',
      hoursPerWeek: 20,
      hoursPerDay: 4,
      durationWeeks: 4,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      status: 'pending',
      notes: 'Need expert mobile engineer to integrate biometric authentication & Apple Pay SDK for the Q3 release sprint.',
      suggestedCandidateId: 'emp_marcus'
    },
    {
      id: 'req_2',
      pmId: 'pm_david',
      pmName: 'David Kim',
      projectId: 'proj_nova',
      projectName: 'Project Nova (Cloud Migration)',
      roleRequired: 'Senior DevOps / SRE',
      hoursPerWeek: 40,
      hoursPerDay: 8,
      durationWeeks: 8,
      startDate: '2026-06-01',
      endDate: '2026-07-31',
      status: 'approved',
      notes: 'Fulfilled via Liam O\'Connor allocation.',
      assignedEmployeeId: 'emp_liam'
    }
  ],

  // Overtime & Extra Hours Requests Pipeline (Employee -> PM -> RMG)
  overtimeRequests: [
    {
      id: 'ot_req_1',
      employeeId: 'emp_alex',
      employeeName: 'Alex Chen',
      projectId: 'proj_apex',
      projectName: 'Project Apex (FinTech Portal)',
      pmId: 'pm_sarah',
      pmName: 'Sarah Jenkins',
      weekId: '2026-W35',
      dateRequested: '2026-08-26', // Wednesday
      dayIndex: 2,
      extraHours: 2,
      status: 'pending_pm',
      justification: 'Emergency fix required for Stripe webhook idempotency race condition causing duplicate charges in staging.',
      pmNotes: null,
      rmgNotes: null,
      requestedAt: '2026-08-26T10:00:00Z',
      forwardedAt: null,
      approvedAt: null
    },
    {
      id: 'ot_req_2',
      employeeId: 'emp_maya',
      employeeName: 'Maya Patel',
      projectId: 'proj_pulse',
      projectName: 'Project Pulse (Internal Platform)',
      pmId: 'pm_sarah',
      pmName: 'Sarah Jenkins',
      weekId: '2026-W35',
      dateRequested: '2026-08-27', // Thursday
      dayIndex: 3,
      extraHours: 2,
      status: 'forwarded_to_rmg',
      justification: 'Preparing comprehensive clickable interactive prototype for executive leadership demo.',
      pmNotes: 'Fully endorsed. Executive demo on Friday requires polished mobile responsive layouts.',
      rmgNotes: null,
      requestedAt: '2026-08-26T11:30:00Z',
      forwardedAt: '2026-08-26T14:00:00Z',
      approvedAt: null
    }
  ],

  // Live Notifications
  notifications: [
    {
      id: 'notif_1',
      targetRole: 'employee',
      targetId: 'emp_maya',
      type: 'rejection',
      title: 'Timesheet Returned by Sarah Jenkins',
      message: 'Week 35 was returned for clarification on Wednesday design tasks.',
      timestamp: '2026-08-25T14:30:00Z',
      read: false
    },
    {
      id: 'notif_2',
      targetRole: 'pm',
      targetId: 'pm_sarah',
      type: 'overtime',
      title: 'New Extra Hours Request from Alex Chen',
      message: 'Alex requested +2.0h on Project Apex for urgent Stripe webhook fix.',
      timestamp: '2026-08-26T10:00:00Z',
      read: false
    },
    {
      id: 'notif_3',
      targetRole: 'rmg',
      targetId: 'rmg_elena',
      type: 'overtime',
      title: 'PM Endorsed Overtime Request',
      message: 'Sarah Jenkins forwarded Maya Patel\'s +2.0h request on Project Pulse for final approval.',
      timestamp: '2026-08-26T14:00:00Z',
      read: false
    }
  ],

  // Statutory Holidays & Company Rest Days
  holidays: [
    {
      date: '2026-08-28',
      weekId: '2026-W35',
      dayIndex: 4, // Friday
      name: 'Summer Org Wellness Holiday',
      type: 'public_holiday'
    },
    {
      date: '2026-09-07',
      weekId: '2026-W37',
      dayIndex: 0, // Monday
      name: 'Labor Day',
      type: 'public_holiday'
    }
  ],

  // Approved Employee Leaves
  leaves: [
    {
      id: 'leave_1',
      employeeId: 'emp_priya',
      weekId: '2026-W35',
      dayIndex: 3, // Thursday (Aug 27)
      date: '2026-08-27',
      type: 'vacation',
      name: 'Annual Vacation Leave',
      approvedBy: 'rmg_elena'
    },
    {
      id: 'leave_2',
      employeeId: 'emp_marcus',
      weekId: '2026-W35',
      dayIndex: 1, // Tuesday (Aug 25)
      date: '2026-08-25',
      type: 'medical',
      name: 'Approved Sick / Medical Leave',
      approvedBy: 'rmg_elena'
    }
  ]
};

if (typeof window !== 'undefined') {
  window.INITIAL_MOCK_DATA = INITIAL_MOCK_DATA;
}
if (typeof global !== 'undefined') {
  global.INITIAL_MOCK_DATA = INITIAL_MOCK_DATA;
}
