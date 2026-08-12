/* ═══════════════════════════════════════
   RÉSUMÉ FORGE — APPLICATION LOGIC
   ═══════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ──
  const state = {
    personal: {},
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certs: [],
    languages: '',
    interests: '',
    template: 'modern',
    theme: 'dark',
    zoom: 100,
  };

  // ── DOM refs ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const resumePaper = $('#resumePaper');
  const tabBtns = $$('.tab-btn');
  const tabInk = $('#tabInk');
  const tplBtns = $$('.tpl-btn');

  // ── Theme Toggle ──
  $('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    if (state.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    save();
  });

  // ── Tab Navigation ──
  function moveInk(btn) {
    tabInk.style.left = btn.offsetLeft + 'px';
    tabInk.style.width = btn.offsetWidth + 'px';
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-content').forEach((c) => c.classList.remove('active'));
      $(`#tab-content-${btn.dataset.tab}`).classList.add('active');
      moveInk(btn);
    });
  });

  // Init ink position
  setTimeout(() => moveInk($('.tab-btn.active')), 50);
  window.addEventListener('resize', () => moveInk($('.tab-btn.active')));

  // ── Template Switcher ──
  tplBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tplBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.template = btn.dataset.template;
      render();
      save();
    });
  });

  // ── Zoom ──
  $('#zoomIn').addEventListener('click', () => { state.zoom = Math.min(150, state.zoom + 10); applyZoom(); });
  $('#zoomOut').addEventListener('click', () => { state.zoom = Math.max(50, state.zoom - 10); applyZoom(); });
  function applyZoom() {
    resumePaper.style.transform = `scale(${state.zoom / 100})`;
    $('#zoomVal').textContent = state.zoom + '%';
  }

  // ── Panel Resize ──
  const divider = $('#panelDivider');
  const editorPanel = $('#editorPanel');
  let dragging = false;

  divider.addEventListener('mousedown', (e) => {
    dragging = true;
    divider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = Math.max(360, Math.min(600, e.clientX));
    editorPanel.style.width = w + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      divider.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // ── Collapsible Sections ──
  $$('.collapsible-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const body = $(`#${btn.dataset.target}`);
      body.classList.toggle('open');
      btn.querySelector('.chevron').style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
    });
  });

  // ── Personal Fields ──
  const personalFields = ['fullName', 'jobTitle', 'email', 'phone', 'location', 'website', 'linkedin', 'github', 'summary'];
  personalFields.forEach((id) => {
    const el = $(`#${id}`);
    if (el) {
      el.addEventListener('input', () => {
        state.personal[id] = el.value;
        render();
        debouncedSave();
      });
    }
  });

  // Languages & Interests
  $('#languages').addEventListener('input', (e) => { state.languages = e.target.value; render(); debouncedSave(); });
  $('#interests').addEventListener('input', (e) => { state.interests = e.target.value; render(); debouncedSave(); });

  // ── Dynamic Entry Helpers ──
  let entryIdCounter = Date.now();
  function uid() { return ++entryIdCounter; }

  function createEntryCard(fields, data, onUpdate, onRemove) {
    const card = document.createElement('div');
    card.className = 'entry-card';
    let headerHTML = `<div class="card-header"><span class="card-title">${fields[0]?.label || 'Entry'}</span><button class="card-remove" title="Remove">✕</button></div>`;
    let bodyHTML = '<div class="form-grid">';
    fields.forEach((f) => {
      const spanClass = f.full ? ' full' : '';
      const val = data[f.key] || '';
      if (f.type === 'textarea') {
        bodyHTML += `<div class="form-group${spanClass}"><label class="form-label">${f.label}</label><textarea class="form-input form-textarea" data-key="${f.key}" rows="3" placeholder="${f.placeholder || ''}">${val}</textarea></div>`;
      } else {
        bodyHTML += `<div class="form-group${spanClass}"><label class="form-label">${f.key === 'current' ? '' : f.label}</label>${f.key === 'current' ? `<label style="display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--text-2);cursor:pointer"><input type="checkbox" data-key="current" ${val ? 'checked' : ''}/> Currently here</label>` : `<input class="form-input" data-key="${f.key}" type="text" value="${val}" placeholder="${f.placeholder || ''}" />`}</div>`;
      }
    });
    bodyHTML += '</div>';
    card.innerHTML = headerHTML + bodyHTML;

    // Events
    card.querySelector('.card-remove').addEventListener('click', onRemove);
    card.querySelectorAll('[data-key]').forEach((inp) => {
      const ev = inp.type === 'checkbox' ? 'change' : 'input';
      inp.addEventListener(ev, () => {
        data[inp.dataset.key] = inp.type === 'checkbox' ? inp.checked : inp.value;
        // Update card title
        if (fields[0]?.key && data[fields[0].key]) {
          card.querySelector('.card-title').textContent = data[fields[0].key];
        }
        onUpdate();
      });
    });

    // Set initial title
    if (data[fields[0]?.key]) card.querySelector('.card-title').textContent = data[fields[0].key];
    return card;
  }

  // ── Experience ──
  const expFields = [
    { key: 'company', label: 'Company', placeholder: 'e.g. Google' },
    { key: 'role', label: 'Role', placeholder: 'e.g. Software Engineer' },
    { key: 'startDate', label: 'Start Date', placeholder: 'Jan 2022' },
    { key: 'endDate', label: 'End Date', placeholder: 'Present' },
    { key: 'location', label: 'Location', placeholder: 'City, Country' },
    { key: 'current', label: 'Current' },
    { key: 'description', label: 'Description', type: 'textarea', full: true, placeholder: 'Key achievements and responsibilities...' },
  ];

  function renderExperience() {
    const list = $('#experienceList');
    list.innerHTML = '';
    state.experience.forEach((entry, i) => {
      const card = createEntryCard(expFields, entry, () => { render(); debouncedSave(); }, () => {
        state.experience.splice(i, 1);
        renderExperience();
        render();
        save();
      });
      list.appendChild(card);
    });
  }

  $('#addExperience').addEventListener('click', () => {
    state.experience.push({ id: uid(), company: '', role: '', startDate: '', endDate: '', location: '', current: false, description: '' });
    renderExperience();
    render();
  });

  // ── Education ──
  const eduFields = [
    { key: 'school', label: 'School', placeholder: 'e.g. MIT' },
    { key: 'degree', label: 'Degree', placeholder: 'e.g. B.S. Computer Science' },
    { key: 'startDate', label: 'Start Date', placeholder: '2018' },
    { key: 'endDate', label: 'End Date', placeholder: '2022' },
    { key: 'gpa', label: 'GPA', placeholder: '3.8/4.0' },
    { key: 'current', label: 'Current' },
    { key: 'description', label: 'Details', type: 'textarea', full: true, placeholder: 'Relevant coursework, honors...' },
  ];

  function renderEducation() {
    const list = $('#educationList');
    list.innerHTML = '';
    state.education.forEach((entry, i) => {
      const card = createEntryCard(eduFields, entry, () => { render(); debouncedSave(); }, () => {
        state.education.splice(i, 1);
        renderEducation();
        render();
        save();
      });
      list.appendChild(card);
    });
  }

  $('#addEducation').addEventListener('click', () => {
    state.education.push({ id: uid(), school: '', degree: '', startDate: '', endDate: '', gpa: '', current: false, description: '' });
    renderEducation();
    render();
  });

  // ── Projects ──
  const projFields = [
    { key: 'name', label: 'Project Name', placeholder: 'e.g. OpenAI Chatbot' },
    { key: 'tech', label: 'Technologies', placeholder: 'React, Node.js, GPT-4' },
    { key: 'link', label: 'Link', placeholder: 'https://...' },
    { key: 'description', label: 'Description', type: 'textarea', full: true, placeholder: 'What you built and its impact...' },
  ];

  function renderProjects() {
    const list = $('#projectsList');
    list.innerHTML = '';
    state.projects.forEach((entry, i) => {
      const card = createEntryCard(projFields, entry, () => { render(); debouncedSave(); }, () => {
        state.projects.splice(i, 1);
        renderProjects();
        render();
        save();
      });
      list.appendChild(card);
    });
  }

  $('#addProject').addEventListener('click', () => {
    state.projects.push({ id: uid(), name: '', tech: '', link: '', description: '' });
    renderProjects();
    render();
  });

  // ── Certifications ──
  const certFields = [
    { key: 'name', label: 'Certification', placeholder: 'e.g. AWS Solutions Architect' },
    { key: 'issuer', label: 'Issuer', placeholder: 'e.g. Amazon Web Services' },
    { key: 'date', label: 'Date', placeholder: '2023' },
  ];

  function renderCerts() {
    const list = $('#certList');
    list.innerHTML = '';
    state.certs.forEach((entry, i) => {
      const card = createEntryCard(certFields, entry, () => { render(); debouncedSave(); }, () => {
        state.certs.splice(i, 1);
        renderCerts();
        render();
        save();
      });
      list.appendChild(card);
    });
  }

  $('#addCert').addEventListener('click', () => {
    state.certs.push({ id: uid(), name: '', issuer: '', date: '' });
    renderCerts();
    render();
  });

  // ── Skills ──
  const skillInput = $('#skillInput');
  const skillLevel = $('#skillLevel');
  const skillTags = $('#skillTags');
  const addSkillBtn = $('#addSkillBtn');
  const skillCountBadge = $('#skillCountBadge');

  function addSkillFromInput() {
    const val = skillInput ? skillInput.value.trim() : '';
    if (!val) return;
    state.skills.push({ name: val, level: skillLevel ? skillLevel.value : 'intermediate' });
    if (skillInput) skillInput.value = '';
    renderSkillTags();
    render();
    save();
  }

  if (skillInput) {
    skillInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillFromInput();
      }
    });
  }

  if (addSkillBtn) {
    addSkillBtn.addEventListener('click', addSkillFromInput);
  }

  function renderSkillTags() {
    if (!skillTags) return;
    skillTags.innerHTML = '';
    if (skillCountBadge) {
      skillCountBadge.textContent = `${state.skills.length} ${state.skills.length === 1 ? 'skill' : 'skills'}`;
    }

    state.skills.forEach((sk, i) => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag';
      const lvl = (sk.level || 'intermediate').toLowerCase();
      tag.innerHTML = `${esc(sk.name)} <span class="tag-level lvl-${lvl}">${esc(lvl)}</span> <span class="tag-remove" title="Remove skill">✕</span>`;
      tag.querySelector('.tag-remove').addEventListener('click', () => {
        state.skills.splice(i, 1);
        renderSkillTags();
        render();
        save();
      });
      skillTags.appendChild(tag);
    });
  }

  // ── Escape HTML ──
  function esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Render Resume ──
  function render() {
    const p = state.personal;
    const hasContent = p.fullName || p.jobTitle || state.experience.length || state.education.length || state.skills.length;

    resumePaper.setAttribute('data-template', state.template);

    if (!hasContent) {
      resumePaper.innerHTML = `<div class="resume-empty"><div class="empty-icon">⬡</div><h3>Start Building</h3><p>Fill in your details on the left panel and watch your resume come to life in real-time.</p></div>`;
      return;
    }

    let html = '';
    const tpl = state.template;
    const isTwoCol = (tpl === 'modern' || tpl === 'compact');

    // Contact items
    const contacts = [];
    if (p.email) contacts.push(`<span>&#9993; ${esc(p.email)}</span>`);
    if (p.phone) contacts.push(`<span>&#9742; ${esc(p.phone)}</span>`);
    if (p.location) contacts.push(`<span>&#9673; ${esc(p.location)}</span>`);
    if (p.website) contacts.push(`<span>&#9741; ${esc(p.website)}</span>`);
    if (p.linkedin) contacts.push(`<span>in ${esc(p.linkedin)}</span>`);
    if (p.github) contacts.push(`<span>&#9000; ${esc(p.github)}</span>`);

    // Header
    html += `<div class="resume-header">
      <div class="header-main">
        <div class="header-name">${esc(p.fullName) || 'Your Name'}</div>
        ${p.jobTitle ? `<div class="header-title">${esc(p.jobTitle)}</div>` : ''}
      </div>
      <div class="header-contact">${contacts.join('')}</div>
    </div>`;

    // ── Build section HTML blocks ──
    let summaryHTML = '';
    if (p.summary) {
      summaryHTML = `<div class="r-section"><div class="r-section-title">Professional Summary</div><p class="r-summary">${esc(p.summary)}</p></div>`;
    }

    let expHTML = '';
    if (state.experience.length) {
      expHTML = `<div class="r-section"><div class="r-section-title">Experience</div>`;
      state.experience.forEach((e) => {
        const end = e.current ? 'Present' : esc(e.endDate);
        expHTML += `<div class="r-entry">
          <div class="r-entry-header"><span class="r-entry-title">${esc(e.role) || 'Role'}</span><span class="r-entry-date">${esc(e.startDate)}${end ? ' &mdash; ' + end : ''}</span></div>
          <div class="r-entry-sub">${esc(e.company)}${e.location ? ' &middot; ' + esc(e.location) : ''}</div>
          ${e.description ? `<div class="r-entry-desc">${esc(e.description).replace(/\n/g, '<br>')}</div>` : ''}
        </div>`;
      });
      expHTML += `</div>`;
    }

    let projHTML = '';
    if (state.projects.length) {
      projHTML = `<div class="r-section"><div class="r-section-title">Projects</div>`;
      state.projects.forEach((pr) => {
        projHTML += `<div class="r-entry">
          <div class="r-entry-header"><span class="r-entry-title">${esc(pr.name) || 'Project'}</span>${pr.tech ? `<span class="r-entry-date">${esc(pr.tech)}</span>` : ''}</div>
          ${pr.link ? `<div class="r-entry-sub">${esc(pr.link)}</div>` : ''}
          ${pr.description ? `<div class="r-entry-desc">${esc(pr.description).replace(/\n/g, '<br>')}</div>` : ''}
        </div>`;
      });
      projHTML += `</div>`;
    }

    let skillsHTML = '';
    if (state.skills.length) {
      skillsHTML = `<div class="r-section"><div class="r-section-title">Skills & Expertise</div><div class="r-skills-grid">`;
      state.skills.forEach((sk) => {
        const lvl = (sk.level || 'intermediate').toLowerCase();
        skillsHTML += `<span class="r-skill-chip lvl-${lvl}">${esc(sk.name)}</span>`;
      });
      skillsHTML += `</div></div>`;
    }

    let eduHTML = '';
    if (state.education.length) {
      eduHTML = `<div class="r-section"><div class="r-section-title">Education</div>`;
      state.education.forEach((e) => {
        const end = e.current ? 'Present' : esc(e.endDate);
        eduHTML += `<div class="r-entry">
          <div class="r-entry-header"><span class="r-entry-title">${esc(e.degree) || 'Degree'}</span><span class="r-entry-date">${esc(e.startDate)}${end ? ' &mdash; ' + end : ''}</span></div>
          <div class="r-entry-sub">${esc(e.school)}</div>
          ${e.gpa ? `<div class="r-entry-desc">GPA: ${esc(e.gpa)}</div>` : ''}
          ${e.description ? `<div class="r-entry-desc">${esc(e.description)}</div>` : ''}
        </div>`;
      });
      eduHTML += `</div>`;
    }

    let langHTML = '';
    if (state.languages) {
      langHTML = `<div class="r-section"><div class="r-section-title">Languages</div>`;
      state.languages.split(',').forEach((l) => {
        if (l.trim()) langHTML += `<div class="r-lang-item">${esc(l.trim())}</div>`;
      });
      langHTML += `</div>`;
    }

    let certHTML = '';
    if (state.certs.length) {
      certHTML = `<div class="r-section"><div class="r-section-title">Certifications</div>`;
      state.certs.forEach((c) => {
        certHTML += `<div class="r-entry"><div class="r-entry-title" style="font-size:10px">${esc(c.name)}</div><div class="r-entry-sub">${esc(c.issuer)} ${c.date ? '&middot; ' + esc(c.date) : ''}</div></div>`;
      });
      certHTML += `</div>`;
    }

    let interestHTML = '';
    if (state.interests) {
      interestHTML = `<div class="r-section"><div class="r-section-title">Interests</div><p class="r-interest">${esc(state.interests)}</p></div>`;
    }

    // ── Assemble body based on template ──
    if (isTwoCol) {
      // Modern & Compact: two-column layout
      html += `<div class="resume-body"><div class="main-col">`;
      html += summaryHTML + expHTML + projHTML;
      html += `</div><div class="side-col">`;
      html += skillsHTML + eduHTML + langHTML + certHTML + interestHTML;
      html += `</div></div>`;
    } else {
      // Classic & Minimal: single-column layout
      html += `<div class="resume-body">`;
      html += summaryHTML + expHTML + eduHTML + skillsHTML + projHTML + langHTML + certHTML + interestHTML;
      html += `</div>`;
    }

    resumePaper.innerHTML = html;
  }

  // ── Demo Data ──
  const DEMO_DATA = {
    personal: {
      fullName: 'Alexandra Chen',
      jobTitle: 'Senior Product Designer & UI Architect',
      email: 'alexandra.chen@example.com',
      phone: '+1 (555) 234-5678',
      location: 'San Francisco, CA',
      website: 'alexandrachen.design',
      linkedin: 'linkedin.com/in/alexandrachen',
      github: 'github.com/alexandrachen',
      summary: 'Senior Product Designer with 7+ years of experience leading design systems, cross-platform UI/UX architecture, and product strategy for enterprise SaaS platforms. Proven track record of transforming complex engineering workflows into elegant, intuitive human experiences that boost engagement and retention.'
    },
    experience: [
      {
        id: 1,
        company: 'Apex Design Labs',
        role: 'Lead Product Designer',
        startDate: 'Jan 2022',
        endDate: 'Present',
        current: true,
        location: 'San Francisco, CA',
        description: '• Architected and launched unified design system adopted by 4 core product lines, reducing feature delivery time by 35%.\n• Spearheaded end-to-end redesign of enterprise analytics dashboard, increasing daily active user retention by 28% within 90 days.\n• Led cross-functional team of 6 UX designers and 12 front-end engineers in agile design sprints.'
      },
      {
        id: 2,
        company: 'Vanguard Systems',
        role: 'Senior UI/UX Specialist',
        startDate: 'Mar 2019',
        endDate: 'Dec 2021',
        current: false,
        location: 'Palo Alto, CA',
        description: '• Redesigned high-conversion SaaS checkout flows resulting in $4.2M additional ARR in Year 1.\n• Conducted over 60+ user interviews and usability tests to optimize product onboarding funnel.\n• Standardized accessibility (WCAG 2.1 AA) guidelines across all web and mobile platforms.'
      },
      {
        id: 3,
        company: 'Lumina Digital Agency',
        role: 'UI Designer & Web Developer',
        startDate: 'Jun 2017',
        endDate: 'Feb 2019',
        current: false,
        location: 'San Jose, CA',
        description: '• Created high-fidelity prototypes and responsive web applications for Fortune 500 client brands.\n• Developed modular component libraries in JS and CSS for rapid client turnarounds.'
      }
    ],
    education: [
      {
        id: 101,
        school: 'Stanford University',
        degree: 'B.S. in Computer Science (HCI Focus)',
        startDate: '2013',
        endDate: '2017',
        gpa: '3.92 / 4.0',
        current: false,
        description: 'Graduated with Distinction. President of HCI & Interaction Design Society. Dean\'s List all semesters.'
      }
    ],
    projects: [
      {
        id: 201,
        name: 'Nexus UI Design System',
        tech: 'Figma, React, TypeScript, CSS Variables',
        link: 'github.com/alexandrachen/nexus-ui',
        description: 'Open-source design system with 50+ accessible components, automated dark mode engine, and design token sync.'
      },
      {
        id: 202,
        name: 'Flow State — Focus App',
        tech: 'Electron, Web Audio API, Vanilla JS',
        link: 'flowstate.design',
        description: 'Minimalist desktop focus app featuring ambient soundscapes and pomodoro timer with offline localStorage sync.'
      }
    ],
    certs: [
      {
        id: 301,
        name: 'NN/g UX Master Certification',
        issuer: 'Nielsen Norman Group',
        date: '2022'
      },
      {
        id: 302,
        name: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        date: '2021'
      }
    ],
    skills: [
      { name: 'UI/UX Design', level: 'expert' },
      { name: 'Design Systems', level: 'expert' },
      { name: 'Figma', level: 'expert' },
      { name: 'Prototyping', level: 'advanced' },
      { name: 'React & JS', level: 'advanced' },
      { name: 'HTML5 & CSS3', level: 'expert' },
      { name: 'User Research', level: 'advanced' },
      { name: 'Design Tokens', level: 'intermediate' }
    ],
    languages: 'English (Native), Spanish (Professional), Mandarin (Conversational)',
    interests: 'Generative Art, Mechanical Keyboards, Ergonomic Workspace Architecture, Trail Running, Specialty Coffee'
  };

  // ── Auto Resizing Textareas ──
  function autoResizeTextarea(el) {
    if (!el || el.tagName.toLowerCase() !== 'textarea') return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 64) + 'px';
  }

  function autoResizeAllTextareas() {
    document.querySelectorAll('textarea').forEach(autoResizeTextarea);
  }

  document.addEventListener('input', (e) => {
    if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
      autoResizeTextarea(e.target);
    }
  });

  function applyDataToForm(data) {
    Object.assign(state, JSON.parse(JSON.stringify(data)));

    // Restore personal inputs
    personalFields.forEach((id) => {
      const el = $(`#${id}`);
      if (el) el.value = state.personal[id] || '';
    });

    // Restore text inputs
    if ($('#languages')) $('#languages').value = state.languages || '';
    if ($('#interests')) $('#interests').value = state.interests || '';

    // Render dynamic sections
    renderExperience();
    renderEducation();
    renderProjects();
    renderCerts();
    renderSkillTags();
    render();
    save();
    setTimeout(autoResizeAllTextareas, 50);
  }

  // Load Demo Data button listener
  const demoBtn = $('#demoBtn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      applyDataToForm(DEMO_DATA);
      showToast('Demo data loaded into all fields!', 'success');
    });
  }

  // ── Export PDF ──
  $('#exportBtn').addEventListener('click', () => {
    const prevZoom = state.zoom;
    const previewPanel = $('.preview-panel');
    const previewViewport = $('#previewViewport');

    // Reset scroll positions so Chrome doesn't crop print view based on scroll offset
    if (previewPanel) previewPanel.scrollTop = 0;
    if (previewViewport) previewViewport.scrollTop = 0;
    window.scrollTo(0, 0);

    // Clear zoom transform for exact 1:1 print rendering
    resumePaper.style.transform = 'none';

    setTimeout(() => {
      window.print();
      // Restore previous zoom view
      setTimeout(() => {
        state.zoom = prevZoom;
        applyZoom();
      }, 300);
    }, 50);

    showToast('PDF export opened! Use your browser print dialog.', 'success');
  });

  // ── Toast ──
  function showToast(msg, type = 'success') {
    const wrap = $('#toastWrap');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    wrap.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ── Persistence ──
  const STORAGE_KEY = 'resumeforge_data';

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  let saveTimer;
  function debouncedSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // If empty, load DEMO_DATA by default!
        applyDataToForm(DEMO_DATA);
        return;
      }
      const data = JSON.parse(raw);
      
      // If saved data is missing personal info, populate with demo data
      if (!data.personal || !data.personal.fullName) {
        applyDataToForm(DEMO_DATA);
        return;
      }

      Object.assign(state, data);

      // Restore personal fields
      personalFields.forEach((id) => {
        const el = $(`#${id}`);
        if (el && state.personal[id]) el.value = state.personal[id];
      });

      // Restore other fields
      if (state.languages) $('#languages').value = state.languages;
      if (state.interests) $('#interests').value = state.interests;

      // Restore theme
      if (state.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');

      // Restore template
      tplBtns.forEach((b) => {
        b.classList.toggle('active', b.dataset.template === state.template);
      });

      // Render dynamic sections
      renderExperience();
      renderEducation();
      renderProjects();
      renderCerts();
      renderSkillTags();
      applyZoom();
    } catch (e) {
      applyDataToForm(DEMO_DATA);
    }
  }

  // ── Mobile View Switcher ──
  const btnEdit = $('#mobileBtnEdit');
  const btnPreview = $('#mobileBtnPreview');

  function autoScaleMobile() {
    if (window.innerWidth <= 860) {
      const viewport = $('#previewViewport');
      if (!viewport) return;
      const availableW = viewport.clientWidth - 24;
      const paperW = 794; // 210mm in px at 96dpi
      const calculatedScale = Math.min(Math.max(availableW / paperW, 0.35), 0.95);
      state.zoom = Math.round(calculatedScale * 100);
      applyZoom();
    }
  }

  function setMobileView(view) {
    state.mobileView = view;
    document.body.classList.toggle('mobile-view-edit', view === 'edit');
    document.body.classList.toggle('mobile-view-preview', view === 'preview');
    if (btnEdit) btnEdit.classList.toggle('active', view === 'edit');
    if (btnPreview) btnPreview.classList.toggle('active', view === 'preview');

    if (view === 'preview') {
      setTimeout(autoScaleMobile, 50);
    }
  }

  if (btnEdit) btnEdit.addEventListener('click', () => setMobileView('edit'));
  if (btnPreview) btnPreview.addEventListener('click', () => setMobileView('preview'));

  window.addEventListener('resize', () => {
    if (window.innerWidth <= 860) {
      if (!document.body.classList.contains('mobile-view-edit') && !document.body.classList.contains('mobile-view-preview')) {
        setMobileView('edit');
      }
      if (document.body.classList.contains('mobile-view-preview')) {
        autoScaleMobile();
      }
    } else {
      document.body.classList.remove('mobile-view-edit', 'mobile-view-preview');
    }
  });

  // ── Init ──
  load();
  if (window.innerWidth <= 860) {
    setMobileView('edit');
  }
  render();
  setTimeout(autoResizeAllTextareas, 50);
})();
