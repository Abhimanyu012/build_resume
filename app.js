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

  function resetForm() {
    const emptyState = {
      template: state.template,
      zoom: state.zoom,
      mobileView: state.mobileView,
      personal: {
        fullName: '',
        jobTitle: '',
        email: '',
        phone: '',
        location: '',
        website: '',
        linkedin: '',
        github: '',
        summary: ''
      },
      experience: [],
      education: [],
      projects: [],
      certs: [],
      skills: [],
      languages: '',
      interests: ''
    };
    applyDataToForm(emptyState);
    showToast('Form reset to blank.', 'success');
  }

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

  // Reset Form button listener
  const resetBtn = $('#resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetForm);
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
    if (!wrap) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    wrap.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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

  // ── SMART PARSER & IMPORT SYSTEM ──
  const importModal = $('#importModal');
  const importBtn = $('#importBtn');
  const closeImportModal = $('#closeImportModal');
  const tabBtnUpload = $('#tabBtnUpload');
  const tabBtnPaste = $('#tabBtnPaste');
  const importTabUpload = $('#importTabUpload');
  const importTabPaste = $('#importTabPaste');
  const browseFileBtn = $('#browseFileBtn');
  const resumeFileInput = $('#resumeFileInput');
  const fileDropzone = $('#fileDropzone');
  const processImportBtn = $('#processImportBtn');
  const pasteResumeInput = $('#pasteResumeInput');
  const downloadBackupBtn = $('#downloadBackupBtn');

  let stagedFile = null;

  function openImportModal() {
    const modal = $('#importModal');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }
  }

  function hideImportModal() {
    const modal = $('#importModal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  if (importBtn) importBtn.addEventListener('click', openImportModal);
  if (closeImportModal) closeImportModal.addEventListener('click', hideImportModal);
  if (importModal) {
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) hideImportModal();
    });
  }

  // Modal Tab Switching
  if (tabBtnUpload && tabBtnPaste) {
    tabBtnUpload.addEventListener('click', () => {
      tabBtnUpload.classList.add('active');
      tabBtnPaste.classList.remove('active');
      importTabUpload.classList.add('active');
      importTabPaste.classList.remove('active');
    });
    tabBtnPaste.addEventListener('click', () => {
      tabBtnPaste.classList.add('active');
      tabBtnUpload.classList.remove('active');
      importTabPaste.classList.add('active');
      importTabUpload.classList.remove('active');
    });
  }

  function updateDropzoneUI(file) {
    stagedFile = file;
    if (!fileDropzone) return;
    fileDropzone.innerHTML = `
      <div class="dropzone-icon">📄</div>
      <h4>Selected File: <strong>${file.name}</strong></h4>
      <p style="color:var(--accent); font-weight:600;">${(file.size / 1024).toFixed(1)} KB — Ready to extract</p>
      <button class="btn-secondary-nav" id="browseFileBtn" type="button" style="margin-top:6px;">Choose Different File</button>
    `;
    const newBrowseBtn = $('#browseFileBtn');
    if (newBrowseBtn && resumeFileInput) {
      newBrowseBtn.addEventListener('click', () => resumeFileInput.click());
    }
  }

  // File Upload Handling
  if (browseFileBtn && resumeFileInput) {
    browseFileBtn.addEventListener('click', () => resumeFileInput.click());
    resumeFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        updateDropzoneUI(e.target.files[0]);
      }
    });
  }

  // Drag and Drop
  if (fileDropzone) {
    ['dragenter', 'dragover'].forEach((evt) => {
      fileDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        fileDropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      fileDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        fileDropzone.classList.remove('dragover');
      });
    });
    fileDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        updateDropzoneUI(e.dataTransfer.files[0]);
      }
    });
  }

  function handleFileImport(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          applyDataToForm(parsed);
          hideImportModal();
          showToast('JSON resume backup loaded successfully!', 'success');
        } catch (err) {
          showToast('Invalid JSON file format', 'error');
        }
      } else {
        parseAndPopulateText(content);
      }
    };
    reader.readAsText(file);
  }

  // Process Import button
  if (processImportBtn) {
    processImportBtn.addEventListener('click', () => {
      const activeTab = tabBtnUpload.classList.contains('active') ? 'upload' : 'paste';
      if (activeTab === 'paste') {
        const text = pasteResumeInput.value.trim();
        if (!text) {
          showToast('Please paste resume text first!', 'error');
          return;
        }
        parseAndPopulateText(text);
      } else {
        const fileToUse = stagedFile || (resumeFileInput.files && resumeFileInput.files[0]);
        if (fileToUse) {
          handleFileImport(fileToUse);
        } else {
          showToast('Please select or drag a file to import!', 'error');
        }
      }
    });
  }

  // Export / Backup JSON download button
  if (downloadBackupBtn) {
    downloadBackupBtn.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${(state.personal.fullName || 'resume').toLowerCase().replace(/\s+/g, '_')}_backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('JSON backup exported successfully!', 'success');
    });
  }

  // ── ADVANCED SMART PARSER ENGINE ──
  function parseAndPopulateText(rawText) {
    if (!rawText || typeof rawText !== 'string') return;

    // Check if raw text is JSON string (JSON backup)
    try {
      const parsedJson = JSON.parse(rawText);
      if (parsedJson && (parsedJson.personal || parsedJson.skills || parsedJson.experience)) {
        applyDataToForm(parsedJson);
        hideImportModal();
        showToast('JSON resume backup loaded successfully!', 'success');
        return;
      }
    } catch (e) {
      // Continue to natural text parser
    }

    const importedState = JSON.parse(JSON.stringify(state));
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      showToast('No readable text found in resume', 'error');
      return;
    }

    // 1. Email extraction
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    if (emailMatch) importedState.personal.email = emailMatch[0];

    // 2. Phone extraction
    const phoneMatch = rawText.match(/(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    if (phoneMatch && phoneMatch[0].length >= 7) importedState.personal.phone = phoneMatch[0];

    // 3. URLs & Socials
    const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    if (linkedinMatch) importedState.personal.linkedin = linkedinMatch[0].replace(/^https?:\/\//, '');

    const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
    if (githubMatch) importedState.personal.github = githubMatch[0].replace(/^https?:\/\//, '');

    const webMatch = rawText.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/i);
    if (webMatch && !webMatch[0].includes('linkedin') && !webMatch[0].includes('github')) {
      importedState.personal.website = webMatch[0].replace(/^https?:\/\//, '');
    }

    // 4. Location extraction (City, State / Country patterns)
    const locMatch = rawText.match(/\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,3}|[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)\b/);
    if (locMatch) {
      const candidateLoc = locMatch[0].trim();
      if (candidateLoc.length < 35 && !candidateLoc.toLowerCase().includes('university') && !candidateLoc.toLowerCase().includes('company')) {
        importedState.personal.location = candidateLoc;
      }
    }

    // 5. Name & Job Title
    const nameLineIndex = lines.findIndex(l => 
      l.length > 2 && l.length < 40 && 
      !l.includes('@') && !l.includes('http') && !l.includes('www.') &&
      !/resume|curriculum|vitae|contact|phone|email/i.test(l)
    );

    if (nameLineIndex !== -1) {
      importedState.personal.fullName = lines[nameLineIndex];
      if (lines[nameLineIndex + 1]) {
        const nextLine = lines[nameLineIndex + 1];
        if (nextLine.length < 50 && !nextLine.includes('@') && !nextLine.includes('http') && !/summary|experience|education|skills/i.test(nextLine)) {
          importedState.personal.jobTitle = nextLine;
        }
      }
    }

    // 6. Parse Sections
    const sections = parseSections(lines);

    if (sections.summary && sections.summary.length > 0) {
      importedState.personal.summary = sections.summary.join(' ');
    } else if (lines.length > 3) {
      const summaryCandidate = lines.find(l => l.length > 60 && !l.includes('@') && !l.includes('http'));
      if (summaryCandidate) importedState.personal.summary = summaryCandidate;
    }

    if (sections.experience && sections.experience.length > 0) {
      const parsedExp = parseExperienceSection(sections.experience);
      if (parsedExp.length > 0) importedState.experience = parsedExp;
    }

    if (sections.education && sections.education.length > 0) {
      const parsedEdu = parseEducationSection(sections.education);
      if (parsedEdu.length > 0) importedState.education = parsedEdu;
    }

    if (sections.projects && sections.projects.length > 0) {
      const parsedProj = parseProjectsSection(sections.projects);
      if (parsedProj.length > 0) importedState.projects = parsedProj;
    }

    const parsedSkills = parseSkillsSection(sections.skills || [], rawText);
    if (parsedSkills.length > 0) {
      importedState.skills = parsedSkills;
    }

    applyDataToForm(importedState);
    hideImportModal();
    showToast(`Smart import complete! Parsed contact info, ${importedState.experience.length} jobs, and ${importedState.skills.length} skills.`, 'success');
  }

  // Section Classifier Helper
  function parseSections(lines) {
    const sections = { summary: [], experience: [], education: [], skills: [], projects: [] };
    let currentSec = null;

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (/^(professional\s+)?summary|about\s+me|profile|objective$/i.test(lower)) {
        currentSec = 'summary'; return;
      }
      if (/^(work\s+)?experience|employment|work\ history|career$/i.test(lower)) {
        currentSec = 'experience'; return;
      }
      if (/^education|academic|qualification(s)?$/i.test(lower)) {
        currentSec = 'education'; return;
      }
      if (/^skills|core\ competencies|technical\ skills|expertise$/i.test(lower)) {
        currentSec = 'skills'; return;
      }
      if (/^projects|key\ projects|personal\ projects$/i.test(lower)) {
        currentSec = 'projects'; return;
      }

      if (currentSec && sections[currentSec]) {
        sections[currentSec].push(line);
      }
    });

    return sections;
  }

  // Experience Parser Helper
  function parseExperienceSection(expLines) {
    const items = [];
    let currentItem = null;
    const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{4})\b.*\b(\d{4}|Present|Current)\b/i;

    expLines.forEach((line) => {
      const dateMatch = line.match(dateRegex);
      if (dateMatch || !currentItem) {
        if (currentItem) items.push(currentItem);
        
        let title = line;
        let company = 'Company / Organization';
        let dates = dateMatch ? dateMatch[0] : '2020 - Present';
        
        if (line.includes(' at ')) {
          const parts = line.split(' at ');
          title = parts[0].trim();
          company = parts[1].replace(dateRegex, '').trim();
        } else if (line.includes('|')) {
          const parts = line.split('|');
          title = parts[0].trim();
          company = parts[1].replace(dateRegex, '').trim();
        } else if (line.includes(' - ') && !dateMatch) {
          const parts = line.split(' - ');
          title = parts[0].trim();
          company = parts[1].trim();
        }

        currentItem = {
          id: generateId(),
          title: title.replace(dateRegex, '').trim() || 'Role / Position',
          company: company || 'Company Name',
          dates: dates,
          location: '',
          desc: ''
        };
      } else {
        if (currentItem) {
          if (currentItem.desc) currentItem.desc += '\n' + line;
          else currentItem.desc = line;
        }
      }
    });

    if (currentItem) items.push(currentItem);
    return items;
  }

  // Education Parser Helper
  function parseEducationSection(eduLines) {
    const items = [];
    let currentItem = null;

    eduLines.forEach((line) => {
      if (/degree|bachelor|master|b\.s|m\.s|phd|diploma|associate|university|college|school/i.test(line) || !currentItem) {
        if (currentItem) items.push(currentItem);
        const dateMatch = line.match(/\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b|\b(19|20)\d{2}\b/);
        currentItem = {
          id: generateId(),
          degree: line.replace(/\b(19|20)\d{2}\b/g, '').trim(),
          school: 'University / Institution',
          dates: dateMatch ? dateMatch[0] : '2016 - 2020',
          desc: ''
        };
      } else if (currentItem) {
        if (line.toLowerCase().includes('university') || line.toLowerCase().includes('college') || line.toLowerCase().includes('institute')) {
          currentItem.school = line;
        } else {
          currentItem.desc += (currentItem.desc ? ' ' : '') + line;
        }
      }
    });

    if (currentItem) items.push(currentItem);
    return items;
  }

  // Projects Parser Helper
  function parseProjectsSection(projLines) {
    const items = [];
    let currentItem = null;

    projLines.forEach((line) => {
      if ((line.length < 50 && !line.startsWith('•') && !line.startsWith('-')) || !currentItem) {
        if (currentItem) items.push(currentItem);
        currentItem = {
          id: generateId(),
          name: line.trim(),
          tech: '',
          desc: ''
        };
      } else if (currentItem) {
        currentItem.desc += (currentItem.desc ? '\n' : '') + line;
      }
    });

    if (currentItem) items.push(currentItem);
    return items;
  }

  // Skills Parser Helper
  function parseSkillsSection(skillsLines, fullText) {
    const result = [];
    const addedNames = new Set();

    skillsLines.forEach((line) => {
      const parts = line.split(/[,•|;\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 35);
      parts.forEach((skillName) => {
        const clean = skillName.replace(/^[-*•]\s*/, '');
        if (clean && !addedNames.has(clean.toLowerCase()) && !/skills|expertise|competencies/i.test(clean)) {
          addedNames.add(clean.toLowerCase());
          result.push({ id: generateId(), name: clean, level: 'advanced' });
        }
      });
    });

    const knownSkills = [
      'React', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Node.js', 'Python', 'Figma',
      'UI/UX Design', 'Design Systems', 'Prototyping', 'User Research', 'Tailwind', 'Git',
      'SQL', 'AWS', 'Docker', 'GraphQL', 'Vue', 'Angular', 'Java', 'C++', 'Go', 'Next.js',
      'Redux', 'REST API', 'Express', 'MongoDB', 'PostgreSQL', 'Jest', 'Webpack', 'Vite'
    ];

    knownSkills.forEach((skill) => {
      if (!addedNames.has(skill.toLowerCase())) {
        const regex = new RegExp(`\\b${skill.replace(/\+/g, '\\+')}\\b`, 'i');
        if (regex.test(fullText)) {
          addedNames.add(skill.toLowerCase());
          result.push({ id: generateId(), name: skill, level: 'advanced' });
        }
      }
    });

    return result;
  }

  // ── Init ──
  load();
  if (window.innerWidth <= 860) {
    setMobileView('edit');
  }
  render();
  setTimeout(autoResizeAllTextareas, 50);
})();
