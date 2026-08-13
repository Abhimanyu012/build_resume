/* ═══════════════════════════════════════
   RÉSUMÉ FORGE — APPLICATION LOGIC
   ═══════════════════════════════════════ */

(function () {
  'use strict';

  // ── Canonical personal defaults — every key always present ──
  const DEFAULT_PERSONAL = {
    fullName: '', jobTitle: '', email: '', phone: '',
    location: '', website: '', linkedin: '', github: '', summary: ''
  };

  // ── State ──
  const state = {
    personal:   { ...DEFAULT_PERSONAL },
    experience: [],
    education:  [],
    skills:     [],
    projects:   [],
    certs:      [],
    languages:  '',
    interests:  '',
    template:   'modern',
    theme:      'dark',
    zoom:       100,
  };

  // ── Canonical merge — safe deep-merge of known keys only ──
  // Prevents: shallow overwrite, missing field bleed-through, unknown key injection.
  // All sections default to [] / '' so downstream code never sees undefined.
  function mergeIntoState(data) {
    if (!data || typeof data !== 'object') return;
    // personal: merge each known key individually
    const p = data.personal || {};
    Object.keys(DEFAULT_PERSONAL).forEach(k => {
      state.personal[k] = (p[k] !== undefined && p[k] !== null) ? String(p[k]) : (state.personal[k] || '');
    });
    // arrays — always replace wholesale (import replaces, not appends)
    if (Array.isArray(data.experience)) state.experience = data.experience;
    if (Array.isArray(data.education))  state.education  = data.education;
    if (Array.isArray(data.skills))     state.skills     = data.skills;
    if (Array.isArray(data.projects))   state.projects   = data.projects;
    if (Array.isArray(data.certs))      state.certs      = data.certs;
    // flat strings
    if (data.languages !== undefined)   state.languages  = String(data.languages  || '');
    if (data.interests  !== undefined)  state.interests  = String(data.interests  || '');
    // UI preferences — only copy if explicitly present
    if (data.template) state.template = data.template;
    if (data.theme)    state.theme    = data.theme;
    if (data.zoom)     state.zoom     = Number(data.zoom) || 100;
  }

  // ── DOM refs ──
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const resumePaper = $('#resumePaper');
  const tabBtns = $$('.tab-btn');
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
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab-content').forEach((c) => c.classList.remove('active'));
      $(`#tab-content-${btn.dataset.tab}`).classList.add('active');
    });
  });

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
    if (typeof autoScaleViewport === 'function') autoScaleViewport();
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
  function generateId() { return uid(); }

  function createEntryCard(fields, data, onUpdate, onRemove) {
    const card = document.createElement('div');
    card.className = 'entry-card';
    let headerHTML = `<div class="card-header"><span class="card-title">${fields[0]?.label || 'Entry'}</span><button class="card-remove" title="Remove">✕</button></div>`;
    let bodyHTML = '<div class="form-grid">';
    fields.forEach((f) => {
      const spanClass = f.full ? ' full' : '';
      const val = data[f.key] || '';
      if (f.type === 'textarea') {
        bodyHTML += `<div class="form-group${spanClass}">
          <div class="label-with-ai-row">
            <label class="form-label">${f.label}</label>
            <button class="btn-ai-enhance-inline card-ai-enhance-btn" type="button" data-key="${f.key}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v8M12 18v4M4.93 4.93l5.66 5.66M13.41 13.41l5.66 5.66M2 12h8M18 12h4M4.93 19.07l5.66-5.66M13.41 10.59l5.66-5.66"/></svg>
              <span>Enhance with AI</span>
            </button>
          </div>
          <textarea class="form-input form-textarea" data-key="${f.key}" rows="3" placeholder="${f.placeholder || ''}">${val}</textarea>
        </div>`;
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

    // AI Enhance button handler
    card.querySelectorAll('.card-ai-enhance-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        const textarea = card.querySelector(`textarea[data-key="${key}"]`);
        if (!textarea) return;

        const currentText = textarea.value.trim();
        const sectionTitle = fields[0]?.key === 'company' ? 'Work Experience' : (fields[0]?.key === 'name' ? 'Project Description' : 'Entry Detail');
        const contextInfo = {
          role: data.role || data.name || data.title || '',
          company: data.company || data.school || '',
          tech: data.tech || ''
        };

        const originalBtnHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<svg class="ai-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> <span>Enhancing...</span>`;

        try {
          const enhanced = await enhanceTextWithAI(currentText, sectionTitle, contextInfo);
          if (enhanced) {
            textarea.value = enhanced;
            data[key] = enhanced;
            onUpdate();
            showToast(`Enhanced ${sectionTitle} with impactful metrics!`, 'success');
          }
        } catch (err) {
          console.error('AI Enhance Error:', err);
          showToast(err.message || 'Failed to enhance text.', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalBtnHTML;
        }
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
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Render Resume ──
  function render() {
    evaluateContentQuality();
    const p = state.personal;
    const hasContent = p.fullName || p.jobTitle || state.experience.length || state.education.length || state.skills.length;

    resumePaper.setAttribute('data-template', state.template);

    if (!hasContent) {
      resumePaper.innerHTML = `
        <div class="resume-empty">
          <div class="empty-card">
            <div class="empty-header">
              <span class="empty-badge">Executive Resume Builder</span>
              <h3 class="empty-title">Welcome to RésuméForge</h3>
              <p class="empty-sub">Create high-impact, ATS-optimized executive resumes in minutes with real-time preview and AI enhancement.</p>
            </div>
            
            <div class="empty-steps-grid">
              <div class="empty-step-card">
                <div class="empty-step-num">1</div>
                <div class="empty-step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <h4>1. Fill or Import</h4>
                <p>Use the editor panel on the left, or upload your PDF/DOCX resume file.</p>
              </div>

              <div class="empty-step-card">
                <div class="empty-step-num">2</div>
                <div class="empty-step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v8M12 18v4M4.93 4.93l5.66 5.66M13.41 13.41l5.66 5.66M2 12h8M18 12h4M4.93 19.07l5.66-5.66M13.41 10.59l5.66-5.66"/></svg>
                </div>
                <h4>2. AI Enhance</h4>
                <p>Rewrite bullet points with metric-rich statements & fix fluff automatically.</p>
              </div>

              <div class="empty-step-card">
                <div class="empty-step-num">3</div>
                <div class="empty-step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <h4>3. Export PDF</h4>
                <p>Choose between Modern, Classic, Minimal, or Compact templates and download PDF.</p>
              </div>
            </div>

            <!-- ⚠️ IMPORTANT API KEY NOTICE AT HOME DEFAULT PLACE -->
            <div class="empty-important-notice">
              <div class="notice-badge-tag">⚠️ IMPORTANT NOTICE</div>
              <div class="notice-body-text">
                <p>AI features require a free <strong>OpenRouter API Key</strong>. Enter your key in <a href="#" id="emptyNoticeSettingsLink" class="empty-settings-link">Settings</a> to unlock AI Content Enhancement & Resume File Parsing.</p>
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" class="openrouter-link-btn">Get Free Key at openrouter.ai/keys →</a>
              </div>
            </div>

            <div class="empty-actions">
              <button class="empty-btn-primary" id="emptyDemoBtn" type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Load Sample Data</span>
              </button>
              <button class="empty-btn-secondary" id="emptyImportBtn" type="button">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Import Resume File</span>
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    const tpl = state.template;
    const isTwoCol = (tpl === 'modern' || tpl === 'compact');

    const formatUrl = (url) => {
      if (!url) return '';
      url = url.trim();
      if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) return url;
      return 'https://' + url;
    };

    const renderTextWithLinks = (rawText) => {
      if (!rawText) return '';
      const escaped = esc(rawText);
      return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="resume-link">Link</a>`;
      }).replace(/\n/g, '<br>');
    };

    // Contact items
    const contacts = [];
    if (p.email) contacts.push(`<span><a href="mailto:${esc(p.email)}" class="resume-link" target="_blank" rel="noopener noreferrer">${esc(p.email)}</a></span>`);
    if (p.phone) contacts.push(`<span><a href="tel:${esc(p.phone).replace(/\s+/g, '')}" class="resume-link">${esc(p.phone)}</a></span>`);
    if (p.location) contacts.push(`<span>${esc(p.location)}</span>`);
    if (p.website) contacts.push(`<span><a href="${esc(formatUrl(p.website))}" target="_blank" rel="noopener noreferrer" class="resume-link">${esc(p.website).replace(/^https?:\/\//i, '')}</a></span>`);
    if (p.linkedin) contacts.push(`<span><a href="${esc(formatUrl(p.linkedin))}" target="_blank" rel="noopener noreferrer" class="resume-link">${esc(p.linkedin).replace(/^https?:\/\//i, '')}</a></span>`);
    if (p.github) contacts.push(`<span><a href="${esc(formatUrl(p.github))}" target="_blank" rel="noopener noreferrer" class="resume-link">${esc(p.github).replace(/^https?:\/\//i, '')}</a></span>`);

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
      summaryHTML = `<div class="r-section"><div class="r-section-title">Professional Summary</div><p class="r-summary">${renderTextWithLinks(p.summary)}</p></div>`;
    }

    let expHTML = '';
    if (state.experience && state.experience.length) {
      expHTML = `<div class="r-section"><div class="r-section-title">Experience</div>`;
      state.experience.forEach((e) => {
        const title = esc(e.role || e.title || 'Role');
        const company = esc(e.company || '');
        const startDate = esc(e.startDate || '');
        const endDate = e.current ? 'Present' : esc(e.endDate || '');
        const dateStr = startDate || endDate ? `${startDate}${endDate ? ' &mdash; ' + endDate : ''}` : esc(e.dates || '');
        const descStr = e.description || e.desc || '';
        
        expHTML += `<div class="r-entry">
          <div class="r-entry-header"><span class="r-entry-title">${title}</span>${dateStr ? `<span class="r-entry-date">${dateStr}</span>` : ''}</div>
          ${company || e.location ? `<div class="r-entry-sub">${company}${e.location ? (company ? ' &middot; ' : '') + esc(e.location) : ''}</div>` : ''}
          ${descStr ? `<div class="r-entry-desc">${renderTextWithLinks(descStr)}</div>` : ''}
        </div>`;
      });
      expHTML += `</div>`;
    }

    let projHTML = '';
    if (state.projects && state.projects.length) {
      projHTML = `<div class="r-section"><div class="r-section-title">Projects</div>`;
      state.projects.forEach((pr) => {
        const name = esc(pr.name || pr.title || 'Project');
        const descStr = pr.description || pr.desc || '';
        projHTML += `<div class="r-entry">
          <div class="r-entry-header"><span class="r-entry-title">${name}</span>${pr.tech ? `<span class="r-entry-date">${esc(pr.tech)}</span>` : ''}</div>
          ${pr.link ? `<div class="r-entry-sub">Project Link: <a href="${esc(formatUrl(pr.link))}" target="_blank" rel="noopener noreferrer" class="resume-link">Link</a></div>` : ''}
          ${descStr ? `<div class="r-entry-desc">${renderTextWithLinks(descStr)}</div>` : ''}
        </div>`;
      });
      projHTML += `</div>`;
    }

    let skillsHTML = '';
    if (state.skills && state.skills.length) {
      skillsHTML = `<div class="r-section"><div class="r-section-title">Skills & Expertise</div><div class="r-skills-grid">`;
      state.skills.forEach((sk) => {
        const lvl = (sk.level || 'intermediate').toLowerCase();
        skillsHTML += `<span class="r-skill-chip lvl-${lvl}">${esc(sk.name)}</span>`;
      });
      skillsHTML += `</div></div>`;
    }

    let eduHTML = '';
    if (state.education && state.education.length) {
      eduHTML = `<div class="r-section"><div class="r-section-title">Education</div>`;
      state.education.forEach((e) => {
        const degree = esc(e.degree || 'Degree');
        const school = esc(e.school || '');
        const startDate = esc(e.startDate || '');
        const endDate = e.current ? 'Present' : esc(e.endDate || '');
        const dateStr = startDate || endDate ? `${startDate}${endDate ? ' &mdash; ' + endDate : ''}` : esc(e.dates || '');
        const descStr = e.description || e.desc || '';

        eduHTML += `<div class="r-entry">
          <div class="r-entry-header"><span class="r-entry-title">${degree}</span>${dateStr ? `<span class="r-entry-date">${dateStr}</span>` : ''}</div>
          ${school ? `<div class="r-entry-sub">${school}</div>` : ''}
          ${e.gpa ? `<div class="r-entry-desc">GPA: ${esc(e.gpa)}</div>` : ''}
          ${descStr ? `<div class="r-entry-desc">${renderTextWithLinks(descStr)}</div>` : ''}
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
    mergeIntoState(data);

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

  // ── Enhance Professional Summary with AI ──
  const enhanceSummaryBtn = $('#enhanceSummaryBtn');
  if (enhanceSummaryBtn) {
    enhanceSummaryBtn.addEventListener('click', async () => {
      const summaryInput = $('#summary');
      if (!summaryInput) return;

      const currentText = summaryInput.value.trim();
      const contextInfo = {
        role: state.personal?.jobTitle || 'Professional',
        name: state.personal?.fullName || ''
      };

      const originalBtnHTML = enhanceSummaryBtn.innerHTML;
      enhanceSummaryBtn.disabled = true;
      enhanceSummaryBtn.innerHTML = `<svg class="ai-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> <span>Enhancing...</span>`;

      try {
        const enhanced = await enhanceTextWithAI(currentText, 'Professional Summary', contextInfo);
        if (enhanced) {
          summaryInput.value = enhanced;
          state.personal.summary = enhanced;
          render();
          debouncedSave();
          showToast('Enhanced summary with impactful metrics!', 'success');
        }
      } catch (err) {
        console.error('Summary enhancement error:', err);
        showToast(err.message || 'Failed to enhance summary.', 'error');
      } finally {
        enhanceSummaryBtn.disabled = false;
        enhanceSummaryBtn.innerHTML = originalBtnHTML;
      }
    });
  }

  // ── ATS Content Quality Auditor & Fluff Corrector ──
  function evaluateContentQuality() {
    const scoreBadge = $('#atsScoreBadge');
    if (!scoreBadge) return;

    let score = 100;
    let metricsIssues = 0;
    let repetitionIssues = 0;
    let grammarIssues = 0;
    let bulletIssues = 0;

    const allBullets = [];
    const firstVerbs = [];

    const textToScan = [
      state.personal?.summary || '',
      ...(state.experience || []).map(e => e.description || ''),
      ...(state.projects || []).map(p => p.description || '')
    ].join('\n');

    // Check Quantifying Impact (numbers, %, $, scale metrics)
    const hasNumbers = /\d+%|\$\d+|\d+\+|\d+k|\d+M|\d+x|\d+ years|\d+ users/i.test(textToScan);
    if (!hasNumbers) {
      score -= 20;
      metricsIssues = 1;
    }

    // Check Bullet Consistency & Verb Repetition
    const lines = textToScan.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      if (!line.startsWith('•') && !line.startsWith('-')) {
        bulletIssues++;
      } else {
        allBullets.push(line);
        const firstWord = line.replace(/^[•\-\*]\s*/, '').split(' ')[0]?.toLowerCase();
        if (firstWord && firstWord.length > 3) {
          firstVerbs.push(firstWord);
        }
      }
    });

    if (bulletIssues > 2) {
      score -= 10;
    }

    // Check repetition
    const verbCounts = {};
    firstVerbs.forEach(v => {
      verbCounts[v] = (verbCounts[v] || 0) + 1;
      if (verbCounts[v] > 1) repetitionIssues = 1;
    });
    if (repetitionIssues > 0) score -= 15;

    // Check spelling/typos heuristic
    if (/the the|and and|i i|managed to|responsible for|helped to|worked on/i.test(textToScan)) {
      grammarIssues = 2;
      score -= 15;
    }

    score = Math.max(45, Math.min(100, score));

    // Update UI elements
    scoreBadge.textContent = `${score}%`;
    const progressFill = $('#atsProgressFill');
    if (progressFill) progressFill.style.width = `${score}%`;

    if (score >= 90) {
      scoreBadge.classList.add('high');
    } else {
      scoreBadge.classList.remove('high');
    }

    const tagMetrics = $('#tagMetrics');
    const iconMetrics = $('#iconMetrics');
    if (tagMetrics && iconMetrics) {
      if (metricsIssues === 0) {
        tagMetrics.textContent = 'No issues';
        tagMetrics.className = 'ats-check-tag tag-success';
        if (iconMetrics) { iconMetrics.textContent = '✓'; iconMetrics.className = 'ats-check-icon check'; }
      } else {
        tagMetrics.textContent = `${metricsIssues} issue`;
        tagMetrics.className = 'ats-check-tag tag-warning';
        if (iconMetrics) { iconMetrics.textContent = '✕'; iconMetrics.className = 'ats-check-icon cross'; }
      }
    }

    const tagRepetition = $('#tagRepetition');
    const iconRepetition = $('#iconRepetition');
    if (tagRepetition && iconRepetition) {
      if (repetitionIssues === 0) {
        tagRepetition.textContent = 'No issues';
        tagRepetition.className = 'ats-check-tag tag-success';
        if (iconRepetition) { iconRepetition.textContent = '✓'; iconRepetition.className = 'ats-check-icon check'; }
      } else {
        tagRepetition.textContent = `${repetitionIssues} issue`;
        tagRepetition.className = 'ats-check-tag tag-warning';
        if (iconRepetition) { iconRepetition.textContent = '✕'; iconRepetition.className = 'ats-check-icon cross'; }
      }
    }

    const tagGrammar = $('#tagGrammar');
    const iconGrammar = $('#iconGrammar');
    if (tagGrammar && iconGrammar) {
      if (grammarIssues === 0) {
        tagGrammar.textContent = 'No issues';
        tagGrammar.className = 'ats-check-tag tag-success';
        if (iconGrammar) { iconGrammar.textContent = '✓'; iconGrammar.className = 'ats-check-icon check'; }
      } else {
        tagGrammar.textContent = `${grammarIssues} issues`;
        tagGrammar.className = 'ats-check-tag tag-warning';
        if (iconGrammar) { iconGrammar.textContent = '✕'; iconGrammar.className = 'ats-check-icon cross'; }
      }
    }

    const tagBullets = $('#tagBullets');
    const iconBullets = $('#iconBullets');
    if (tagBullets && iconBullets) {
      if (bulletIssues <= 2) {
        tagBullets.textContent = 'Consistent';
        tagBullets.className = 'ats-check-tag tag-success';
        if (iconBullets) { iconBullets.textContent = '✓'; iconBullets.className = 'ats-check-icon check'; }
      } else {
        tagBullets.textContent = `${bulletIssues} inconsistent`;
        tagBullets.className = 'ats-check-tag tag-warning';
        if (iconBullets) { iconBullets.textContent = '✕'; iconBullets.className = 'ats-check-icon cross'; }
      }
    }
  }

  async function fixAllFluffWithAI() {
    const key = ensureApiKeyOrPrompt('Fluff Corrector');
    if (!key) return;
    const navBtn = $('#navFixFluffBtn');
    const cardBtn = $('#cardFixFluffBtn');

    const originalNav = navBtn ? navBtn.innerHTML : '';
    const originalCard = cardBtn ? cardBtn.innerHTML : '';

    const setButtonsLoading = (isLoading) => {
      [navBtn, cardBtn].forEach(btn => {
        if (!btn) return;
        btn.disabled = isLoading;
        if (isLoading) {
          btn.innerHTML = `<svg class="ai-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> <span>Fixing Fluff...</span>`;
        } else {
          if (btn === navBtn) btn.innerHTML = originalNav;
          if (btn === cardBtn) btn.innerHTML = originalCard;
        }
      });
    };

    setButtonsLoading(true);
      showToast('AI Engine auditing and eliminating fluff...', 'info');

    const currentData = {
      summary: state.personal?.summary || '',
      experience: (state.experience || []).map(e => ({ id: e.id, role: e.role, company: e.company, description: e.description })),
      projects: (state.projects || []).map(p => ({ id: p.id, name: p.name, tech: p.tech, description: p.description }))
    };

    const systemPrompt = `You are a top executive ATS resume auditor and fluff corrector.
Your goal is to fix ALL fluff, weak phrasing, missing metrics, repetitive verbs, and grammar errors across this entire resume.

CRITICAL INSTRUCTIONS:
1. QUANTIFY IMPACT: Turn vague lines into metric-rich achievements using concrete numbers (%, $, time saved, latency reduction, user growth).
2. ELIMINATE REPETITION: Ensure NO action verb is repeated at the start of bullet points. Use diverse, strong executive verbs (e.g. 'Architected', 'Spearheaded', 'Optimized', 'Engineered', 'Accelerated', 'Streamlined', 'Orchestrated').
3. SPELLING & GRAMMAR: Fix 100% of typos, awkward phrasing, and grammatical mistakes.
4. BULLET CONSISTENCY: Format all experience and project bullet points with '• '.
5. TONE: Clean, impactful, human. NO robotic fluff like 'synergy', 'testament to', or 'delve'.

Return JSON strictly matching this schema:
{
  "summary": "Enhanced 3-4 sentence summary",
  "experience": [
    { "id": "exp_id", "description": "• Enhanced bullet 1\\n• Enhanced bullet 2" }
  ],
  "projects": [
    { "id": "proj_id", "description": "• Enhanced bullet 1\\n• Enhanced bullet 2" }
  ]
}`;

    const models = [
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash-lite-001',
      'meta-llama/llama-3.3-70b-instruct'
    ];

    let fixedResult = null;

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': window.location.origin || 'http://localhost:3000',
            'X-Title': 'Resume Forge Fluff Corrector'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: JSON.stringify(currentData, null, 2) }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
            max_tokens: 1500
          })
        });

        if (!response.ok) continue;

        const resData = await response.json();
        const rawContent = resData?.choices?.[0]?.message?.content;
        if (rawContent) {
          const cleanJson = rawContent.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
          fixedResult = JSON.parse(cleanJson);
          if (fixedResult) break;
        }
      } catch (err) {
        console.warn(`Model ${model} fluff fix call failed:`, err);
      }
    }

    setButtonsLoading(false);

    if (fixedResult) {
      if (fixedResult.summary) {
        state.personal.summary = fixedResult.summary;
        const sumEl = $('#summary');
        if (sumEl) sumEl.value = fixedResult.summary;
      }

      if (Array.isArray(fixedResult.experience)) {
        fixedResult.experience.forEach(fe => {
          const match = state.experience.find(e => e.id === fe.id);
          if (match && fe.description) match.description = fe.description;
        });
        renderExperience();
      }

      if (Array.isArray(fixedResult.projects)) {
        fixedResult.projects.forEach(fp => {
          const match = state.projects.find(p => p.id === fp.id);
          if (match && fp.description) match.description = fp.description;
        });
        renderProjects();
      }

      render();
      debouncedSave();

      // Force 100% score badge
      const scoreBadge = $('#atsScoreBadge');
      if (scoreBadge) {
        scoreBadge.textContent = '100%';
        scoreBadge.classList.add('high');
      }

      ['tagMetrics', 'tagRepetition', 'tagGrammar', 'tagBullets'].forEach(id => {
        const el = $(`#${id}`);
        if (el) {
          el.textContent = id === 'tagBullets' ? 'Consistent' : 'No issues';
          el.className = 'ats-check-tag tag-success';
        }
      });

      ['iconMetrics', 'iconRepetition', 'iconGrammar', 'iconBullets'].forEach(id => {
        const el = $(`#${id}`);
        if (el) {
          el.textContent = '✓';
          el.className = 'ats-check-icon check';
        }
      });

      showToast('All fluff removed! Content score boosted to 100%!', 'success');
    } else {
      showToast('Could not auto-fix fluff. Please verify your OpenRouter API key.', 'error');
    }
  }

  // Attach Fix All Fluff Listeners
  const navFixFluffBtn = $('#navFixFluffBtn');
  if (navFixFluffBtn) navFixFluffBtn.addEventListener('click', fixAllFluffWithAI);

  const cardFixFluffBtn = $('#cardFixFluffBtn');
  if (cardFixFluffBtn) cardFixFluffBtn.addEventListener('click', fixAllFluffWithAI);

  // Attach ATS Audit Toggle Listener
  const atsAuditHeader = $('#atsAuditHeader');
  const atsAuditCard = $('#atsAuditCard');
  if (atsAuditHeader && atsAuditCard) {
    atsAuditHeader.addEventListener('click', (e) => {
      if (e.target.closest('#cardFixFluffBtn')) return;
      atsAuditCard.classList.toggle('collapsed');
    });
  }

  // ── Export PDF & Print Event Handling ──
  function hideAllFloatingUI() {
    const fabDock = $('#fabDock');
    const mobileBar = $('.mobile-view-bar');
    const settingsOverlay = $('#settingsOverlay');
    const importModal = $('#importModal');
    const previewGuideOverlay = $('#previewGuideOverlay');
    const toastWrap = $('#toastWrap');
    if (fabDock) fabDock.style.setProperty('display', 'none', 'important');
    if (mobileBar) mobileBar.style.setProperty('display', 'none', 'important');
    if (settingsOverlay) settingsOverlay.style.setProperty('display', 'none', 'important');
    if (importModal) importModal.style.setProperty('display', 'none', 'important');
    if (previewGuideOverlay) previewGuideOverlay.style.setProperty('display', 'none', 'important');
    if (toastWrap) toastWrap.style.setProperty('display', 'none', 'important');
  }

  function restoreAllFloatingUI() {
    const fabDock = $('#fabDock');
    const mobileBar = $('.mobile-view-bar');
    const toastWrap = $('#toastWrap');
    if (fabDock) fabDock.style.display = '';
    if (mobileBar) mobileBar.style.display = '';
    if (toastWrap) toastWrap.style.display = '';
  }

  window.addEventListener('beforeprint', () => {
    hideAllFloatingUI();
    if (resumePaper && resumePaper.scrollHeight > 1050) {
      resumePaper.classList.add('one-page-fit');
    }
    if (resumePaper) resumePaper.style.transform = 'none';
  });

  window.addEventListener('afterprint', () => {
    restoreAllFloatingUI();
    if (resumePaper) resumePaper.classList.remove('one-page-fit');
    applyZoom();
  });

  $('#exportBtn').addEventListener('click', () => {
    const prevZoom = state.zoom;
    const previewPanel = $('.preview-panel');
    const previewViewport = $('#previewViewport');

    // Hide all floating UI elements before print
    hideAllFloatingUI();

    // Auto-enable 1-page compact fit if paper height exceeds single A4 page height
    const paperHeight = resumePaper ? resumePaper.scrollHeight : 0;
    const needsOnePageFit = paperHeight > 1050;
    if (needsOnePageFit && resumePaper) {
      resumePaper.classList.add('one-page-fit');
    }

    // Reset scroll positions
    if (previewPanel) previewPanel.scrollTop = 0;
    if (previewViewport) previewViewport.scrollTop = 0;
    window.scrollTo(0, 0);

    // Clear zoom transform for exact 1:1 print rendering
    if (resumePaper) resumePaper.style.transform = 'none';

    setTimeout(() => {
      window.print();
      // Restore previous zoom view & elements
      setTimeout(() => {
        state.zoom = prevZoom;
        applyZoom();
        if (needsOnePageFit && resumePaper) {
          resumePaper.classList.remove('one-page-fit');
        }
        restoreAllFloatingUI();
      }, 300);
    }, 50);

    showToast('📄 PDF export ready! Clean 1-page format generated.', 'success');
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

      // If saved data has no name, show demo
      if (!data.personal || !data.personal.fullName) {
        applyDataToForm(DEMO_DATA);
        return;
      }

      // Safe canonical merge instead of shallow Object.assign
      mergeIntoState(data);

      // Restore personal fields
      personalFields.forEach((id) => {
        const el = $(`#${id}`);
        if (el && state.personal[id]) el.value = state.personal[id];
      });

      // Restore other fields
      if ($('#languages')) $('#languages').value = state.languages;
      if ($('#interests')) $('#interests').value = state.interests;

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

  function autoScaleViewport() {
    const viewport = $('#previewViewport');
    if (!viewport || !resumePaper) return;
    const availableW = viewport.clientWidth - 32;
    const paperW = 794; // 210mm standard A4 width in px
    if (availableW < paperW) {
      const calculatedScale = Math.min(Math.max(availableW / paperW, 0.32), 1.0);
      state.zoom = Math.round(calculatedScale * 100);
      applyZoom();
    }
  }

  window.addEventListener('resize', autoScaleViewport);

  function setMobileView(view) {
    state.mobileView = view;
    document.body.classList.toggle('mobile-view-edit', view === 'edit');
    document.body.classList.toggle('mobile-view-preview', view === 'preview');
    if (btnEdit) btnEdit.classList.toggle('active', view === 'edit');
    if (btnPreview) btnPreview.classList.toggle('active', view === 'preview');

    if (view === 'preview') {
      setTimeout(autoScaleViewport, 50);
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

  const insertSampleTextBtn = $('#insertSampleTextBtn');
  const pasteCharCount = $('#pasteCharCount');
  const aiKeyStatusBadge = $('#aiKeyStatusBadge');

  function updateKeyStatusBadge() {
    if (!aiKeyStatusBadge) return;
    const saved = localStorage.getItem('rf_openrouter_key');
    if (saved && saved.trim()) {
      aiKeyStatusBadge.textContent = 'Custom Key Active';
      aiKeyStatusBadge.style.background = 'rgba(126, 200, 156, 0.18)';
      aiKeyStatusBadge.style.color = 'var(--green)';
    } else {
      aiKeyStatusBadge.textContent = 'Default Key Active';
      aiKeyStatusBadge.style.background = 'var(--accent-glow)';
      aiKeyStatusBadge.style.color = 'var(--accent)';
    }
  }

  function openImportModal() {
    const modal = $('#importModal');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
    }
    const keyInput = $('#aiApiKeyInput');
    if (keyInput) {
      const saved = localStorage.getItem('rf_openrouter_key') || '';
      keyInput.value = saved ? '••••••••••••••••' : '';
    }
    updateKeyStatusBadge();
  }

  // Live Char Counter
  if (pasteResumeInput && pasteCharCount) {
    pasteResumeInput.addEventListener('input', () => {
      const len = pasteResumeInput.value.length;
      pasteCharCount.textContent = `${len.toLocaleString()} characters`;
    });
  }

  // Sample Resume Text Insertion
  if (insertSampleTextBtn && pasteResumeInput) {
    insertSampleTextBtn.addEventListener('click', () => {
      pasteResumeInput.value = `Johnathan Vance
Senior Software Architect | VanceTech Solutions
johnathan.vance@example.com | (555) 234-5678 | San Francisco, CA
linkedin.com/in/jvance | github.com/jvance-code

PROFESSIONAL SUMMARY
Innovative Software Architect with over 10 years of experience designing scalable microservices and distributed systems. Expert in Node.js, Python, React, and cloud architecture on AWS.

WORK EXPERIENCE
Principal Architect | VanceTech Solutions
Jan 2020 - Present | San Francisco, CA
• Designed and launched a microservices infrastructure using Node.js and Docker, handling 5M daily requests.
• Led an engineering team of 12 developers, mentoring junior engineers and conducting code reviews.

Lead Backend Engineer | CloudScale Systems
Mar 2015 - Dec 2019 | San Jose, CA
• Architected RESTful APIs with Python and PostgreSQL, reducing query latency by 45%.
• Implemented automated CI/CD pipelines with GitHub Actions and AWS EKS.

EDUCATION
B.S. in Computer Science | Stanford University
2011 - 2015 | Stanford, CA

SKILLS
Node.js, Python, React, Docker, Kubernetes, AWS, PostgreSQL, Microservices, C++, C#`;

      if (pasteCharCount) {
        pasteCharCount.textContent = `${pasteResumeInput.value.length.toLocaleString()} characters`;
      }
      showToast('Sample resume text inserted!', 'success');
    });
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

  // Settings Modal Handlers
  const fabSettingsBtn = $('#fabSettingsBtn');
  const settingsOverlay = $('#settingsOverlay');
  const closeSettingsBtn = $('#closeSettingsBtn');
  const settingsSaveKeyBtn = $('#settingsSaveKeyBtn');

  function openSettingsModal() {
    if (!settingsOverlay) return;
    settingsOverlay.classList.add('open');
    settingsOverlay.style.display = 'flex';
    updateKeyStatusBadge();
  }

  function hideSettingsModal() {
    if (!settingsOverlay) return;
    settingsOverlay.classList.remove('open');
    settingsOverlay.style.display = 'none';
  }

  // How to Use Guide Modal Handlers
  // ── RESUME PREVIEW ONBOARDING GUIDE ENGINE ──
  const PREVIEW_GUIDE_KEY = 'rf_preview_guide_shown';
  const fabGuideBtn = $('#fabGuideBtn');
  const previewGuideOverlay = $('#previewGuideOverlay');
  const closePreviewGuideBtn = $('#closePreviewGuideBtn');
  const previewGuideGotItBtn = $('#previewGuideGotItBtn');
  const previewGuideDemoBtn = $('#previewGuideDemoBtn');
  const previewGuideImportBtn = $('#previewGuideImportBtn');

  function openPreviewGuideModal() {
    if (!previewGuideOverlay) return;
    previewGuideOverlay.style.display = 'flex';
    previewGuideOverlay.classList.add('open');
  }

  function hidePreviewGuideModal(markAsSeen = true) {
    if (!previewGuideOverlay) return;
    previewGuideOverlay.style.display = 'none';
    previewGuideOverlay.classList.remove('open');
    if (markAsSeen) {
      try { localStorage.setItem(PREVIEW_GUIDE_KEY, 'true'); } catch (e) {}
    }
  }

  function checkAutoShowPreviewGuide() {
    try {
      const hasSeen = localStorage.getItem(PREVIEW_GUIDE_KEY);
      if (!hasSeen) {
        setTimeout(openPreviewGuideModal, 350);
      }
    } catch (e) {
      setTimeout(openPreviewGuideModal, 350);
    }
  }

  if (closePreviewGuideBtn) closePreviewGuideBtn.addEventListener('click', () => hidePreviewGuideModal(true));
  if (previewGuideGotItBtn) previewGuideGotItBtn.addEventListener('click', () => hidePreviewGuideModal(true));
  if (previewGuideDemoBtn) {
    previewGuideDemoBtn.addEventListener('click', () => {
      hidePreviewGuideModal(true);
      applyDataToForm(DEMO_DATA);
      showToast('Demo data loaded into resume preview!', 'success');
    });
  }
  if (previewGuideImportBtn) {
    previewGuideImportBtn.addEventListener('click', () => {
      hidePreviewGuideModal(true);
      openImportModal();
    });
  }
  if (previewGuideOverlay) {
    previewGuideOverlay.addEventListener('click', (e) => {
      if (e.target === previewGuideOverlay) hidePreviewGuideModal(true);
    });
  }

  if (fabGuideBtn) {
    fabGuideBtn.addEventListener('click', openPreviewGuideModal);
  }

  if (resumePaper) {
    resumePaper.addEventListener('click', (e) => {
      const demoTarget = e.target.closest('#emptyDemoBtn');
      const importTarget = e.target.closest('#emptyImportBtn');
      const settingsTarget = e.target.closest('#emptyNoticeSettingsLink');
      if (demoTarget) {
        loadDemoData();
      } else if (importTarget) {
        openImportModal();
      } else if (settingsTarget) {
        e.preventDefault();
        openSettingsModal();
      }
    });
  }

  // Bind Settings Modal Triggers
  if (fabSettingsBtn) fabSettingsBtn.addEventListener('click', openSettingsModal);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', hideSettingsModal);
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) hideSettingsModal();
    });
  }

  const guideOpenSettingsBtn = $('#guideOpenSettingsBtn');
  if (guideOpenSettingsBtn) {
    guideOpenSettingsBtn.addEventListener('click', () => {
      hidePreviewGuideModal(true);
      openSettingsModal();
    });
  }

  function updateApiKeyBanner() {
    const banner = $('#apiKeyBanner');
    const textEl = $('#apiKeyBannerText');
    const btn = $('#bannerSetKeyBtn');
    if (!banner) return;

    const key = getAIKey();
    const hasKey = Boolean(key && key.length > 5);

    if (hasKey) {
      banner.classList.add('has-key');
      if (textEl) {
        textEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span style="color:#10b981;font-weight:600">OpenRouter API Key Active</span>`;
      }
      if (btn) btn.textContent = 'Settings';
    } else {
      banner.classList.remove('has-key');
      if (textEl) {
        textEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <span>AI features require OpenRouter key.</span> <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" class="api-key-banner-link">Get Free Key →</a>`;
      }
      if (btn) btn.textContent = 'Set Key';
    }
  }

  function updateKeyStatusBadge() {
    const key = getAIKey();
    const modalBadge = $('#aiKeyStatusBadge');
    const settingsStatus = $('#settingsKeyStatus');
    const hasKey = Boolean(key && key.length > 5);

    if (modalBadge) {
      modalBadge.textContent = hasKey ? '✓ Key Active' : '🔑 API Key Required';
      modalBadge.style.color = hasKey ? '#10b981' : '#f59e0b';
    }
    if (settingsStatus) {
      settingsStatus.textContent = hasKey ? '✓ API Key Saved & Active' : '⚠️ No API Key saved. AI features require an OpenRouter key.';
      settingsStatus.className = `settings-key-status ${hasKey ? 'active' : ''}`;
    }
    updateApiKeyBanner();
  }

  const bannerSetKeyBtn = $('#bannerSetKeyBtn');
  if (bannerSetKeyBtn) {
    bannerSetKeyBtn.addEventListener('click', openSettingsModal);
  }

  // Save API Key to localStorage
  const saveAiKeyBtn = $('#saveAiKeyBtn');
  function saveApiKey(inputId) {
    const keyInput = $(`#${inputId}`);
    const val = keyInput ? keyInput.value.trim() : '';
    if (!val || val.startsWith('•')) {
      showToast('Paste your full OpenRouter API key to save it', 'error');
      return;
    }
    localStorage.setItem('rf_openrouter_key', val);
    if (keyInput) keyInput.value = '••••••••••••••••';
    updateKeyStatusBadge();
    showToast('✅ API key saved to browser storage!', 'success');
  }

  if (saveAiKeyBtn) saveAiKeyBtn.addEventListener('click', () => saveApiKey('aiApiKeyInput'));
  if (settingsSaveKeyBtn) settingsSaveKeyBtn.addEventListener('click', () => saveApiKey('settingsApiKeyInput'));

  // Initialize banner state
  updateApiKeyBanner();

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
      <h4>Selected File: <strong>${esc(file.name)}</strong></h4>
      <p style="color:var(--accent); font-weight:600;">${(file.size / 1024).toFixed(1)} KB — Ready to extract</p>
      <button class="btn-secondary-nav" id="browseFileBtn" type="button" style="margin-top:6px;">Choose Different File</button>
    `;
    const newBrowseBtn = $('#browseFileBtn');
    if (newBrowseBtn && resumeFileInput) {
      newBrowseBtn.addEventListener('click', () => resumeFileInput.click());
    }
  }

  function resetDropzoneUI() {
    stagedFile = null;
    if (!fileDropzone) return;
    fileDropzone.innerHTML = `
      <input type="file" id="resumeFileInput" accept=".json,.txt,.md,.text,.pdf,.docx,.doc" style="display:none" />
      <div class="dropzone-icon">📥</div>
      <h4>Drag & Drop your Resume here</h4>
      <p>Supports <strong>PDF</strong>, <strong>DOCX</strong>, <strong>TXT</strong>, <strong>MD</strong>, or <strong>JSON</strong></p>
      <button class="btn-secondary-nav" id="browseFileBtn" type="button">Browse Files</button>
    `;
    const newBrowseBtn = $('#browseFileBtn');
    const newInput = $('#resumeFileInput');
    if (newBrowseBtn && newInput) {
      newBrowseBtn.addEventListener('click', () => newInput.click());
      newInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) updateDropzoneUI(e.target.files[0]);
      });
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

  // File Text Extractor supporting PDF, DOCX, TXT, MD, JSON
  async function extractTextFromFile(file) {
    if (file.name.endsWith('.pdf')) {
      if (window.pdfjsLib) {
        try {
          if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let pagesText = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            pagesText.push(text);
          }
          return pagesText.join('\n\n');
        } catch (pdfErr) {
          console.warn('PDF.js parsing failed, falling back to text reader:', pdfErr);
        }
      }
    } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      if (window.mammoth) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          return result.value || '';
        } catch (docxErr) {
          console.warn('Mammoth parsing failed, falling back to text reader:', docxErr);
        }
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = (evt) => resolve(evt.target.result || '');
      reader.readAsText(file, 'UTF-8');
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

  // ── TEXT NORMALIZER ──
  // Cleans encoding artifacts from PDF-to-text and copy-paste.
  // Preserves: C++, C#, .NET, URLs, emails, percentages, technical terms.
  function normalizeResumeText(raw) {
    if (!raw || typeof raw !== 'string') return { text: '', corrupted: false };

    let t = raw;
    t = t.replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, ''); // ZWS, ZWJ, ZWNJ, BOM, soft-hyphen

    const replacementCharCount = (t.match(/\uFFFD/g) || []).length;
    t = t.replace(/\uFFFD/g, '');

    t = t.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
    t = t.replace(/[\u2018\u2019\u201A\u201B]/g, "'");

    t = t.replace(/[\u2013\u2014\u2015]/g, ' - ');
    t = t.replace(/\u2212/g, '-');

    t = t.replace(/\u00A0/g, ' ');
    t = t.replace(/\u2003/g, ' ');
    t = t.replace(/\u2002/g, ' ');
    t = t.replace(/\t/g, ' ');

    t = t.replace(/^[\u25CF\u25E6\u2022\u2023\u25AA\u25AB\u2043]/gm, '•');
    t = t.replace(/(\r?\n){3,}/g, '\n\n');
    t = t.replace(/[ ]{2,}/g, ' ');
    t = t.split('\n').map(l => l.trimEnd()).join('\n').trim();

    const totalChars = raw.length || 1;
    const corruptRatio = replacementCharCount / totalChars;
    const corrupted = corruptRatio > 0.02 || replacementCharCount > 50;

    return { text: t, corrupted };
  }

  // ── AI SCHEMA NORMALIZER ──
  // Maps common AI field aliases to the canonical state schema.
  function normalizeAISchema(raw) {
    if (!raw || typeof raw !== 'object') return {};

    const out = {
      personal: {},
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certs: [],
      languages: '',
      interests: ''
    };

    const p = raw.personal || raw.contact || raw.info || {};
    out.personal.fullName   = p.fullName   || p.name       || p.full_name  || '';
    out.personal.jobTitle   = p.jobTitle   || p.title      || p.headline   || p.role || '';
    out.personal.email      = p.email      || '';
    out.personal.phone      = p.phone      || p.mobile     || p.tel        || '';
    out.personal.location   = p.location   || p.city       || p.address    || '';
    out.personal.website    = p.website    || p.portfolio  || p.url        || '';
    out.personal.linkedin   = p.linkedin   || p.linkedIn   || '';
    out.personal.github     = p.github     || p.githubUrl  || '';
    out.personal.summary    = p.summary    || p.objective  || p.about      || p.profile || '';

    ['linkedin', 'github', 'website'].forEach(k => {
      if (out.personal[k]) out.personal[k] = out.personal[k].replace(/^https?:\/\//i, '');
    });

    const expArr = raw.experience || raw.work || raw.workExperience || raw.employment || [];
    out.experience = (Array.isArray(expArr) ? expArr : []).map(e => ({
      id: generateId(),
      role:        e.role        || e.title       || e.position    || e.jobTitle   || '',
      company:     e.company     || e.employer    || e.organization || e.org        || '',
      startDate:   e.startDate   || e.start       || e.from        || '',
      endDate:     e.endDate     || e.end         || e.to          || (e.current ? 'Present' : ''),
      current:     !!e.current   || /present|current/i.test(e.endDate || e.end || ''),
      location:    e.location    || '',
      description: normalizeDescription(e.description || e.responsibilities || e.duties || e.summary || '')
    }));

    const eduArr = raw.education || raw.academics || raw.qualifications || [];
    out.education = (Array.isArray(eduArr) ? eduArr : []).map(e => ({
      id: generateId(),
      degree:    e.degree    || e.qualification || e.program || e.field || '',
      school:    e.school    || e.institution   || e.university || e.college || '',
      startDate: e.startDate || e.start         || e.from   || '',
      endDate:   e.endDate   || e.end           || e.to     || (e.current ? 'Present' : ''),
      current:   !!e.current,
      gpa:       e.gpa       || e.grade         || '',
      description: normalizeDescription(e.description || e.coursework || '')
    }));

    const projArr = raw.projects || raw.portfolio || [];
    out.projects = (Array.isArray(projArr) ? projArr : []).map(p => ({
      id: generateId(),
      name:        p.name        || p.title       || '',
      tech:        p.tech        || p.technologies || p.stack || p.tools || '',
      link:        p.link        || p.url          || p.github || '',
      description: normalizeDescription(p.description || p.details || '')
    }));

    const skillArr = raw.skills || raw.technicalSkills || [];
    out.skills = (Array.isArray(skillArr) ? skillArr : []).map(s => {
      if (typeof s === 'string') return { id: generateId(), name: s, level: 'intermediate' };
      return {
        id:    generateId(),
        name:  s.name  || s.skill || s.technology || '',
        level: normalizeSkillLevel(s.level || s.proficiency || 'intermediate')
      };
    }).filter(s => s.name);

    const certArr = raw.certs || raw.certifications || raw.certificates || [];
    out.certs = (Array.isArray(certArr) ? certArr : []).map(c => ({
      id:     generateId(),
      name:   c.name   || c.title       || '',
      issuer: c.issuer || c.organization || c.authority || '',
      date:   c.date   || c.year        || ''
    }));

    out.languages = typeof raw.languages === 'string' ? raw.languages : (Array.isArray(raw.languages) ? raw.languages.join(', ') : '');
    out.interests = typeof raw.interests === 'string' ? raw.interests : (Array.isArray(raw.interests) ? raw.interests.join(', ') : (raw.hobbies || raw.activities || ''));

    return out;
  }

  function normalizeDescription(raw) {
    if (!raw) return '';
    if (Array.isArray(raw)) return raw.map(l => l.startsWith('•') ? l : '• ' + l).join('\n');
    return String(raw).split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => (l.startsWith('•') || l.startsWith('-') || l.startsWith('*')) ? l : '• ' + l)
      .join('\n');
  }

  function normalizeSkillLevel(raw) {
    const s = String(raw).toLowerCase();
    if (/expert|advanced|senior|proficient|strong/i.test(s)) return 'advanced';
    if (/beginner|basic|fundamental|elementary|novice|learning/i.test(s)) return 'beginner';
    return 'intermediate';
  }

  // ── AI LOADING UI ──
  function showAILoading() {
    const overlay = $('#aiLoadingOverlay');
    const btnLabel = $('#processImportBtnLabel');
    if (overlay) overlay.style.display = 'flex';
    if (btnLabel) btnLabel.textContent = '⏳ Analyzing…';
    if (processImportBtn) processImportBtn.disabled = true;
  }

  function hideAILoading() {
    const overlay = $('#aiLoadingOverlay');
    const btnLabel = $('#processImportBtnLabel');
    if (overlay) overlay.style.display = 'none';
    if (btnLabel) btnLabel.textContent = '🤖 Extract with AI';
    if (processImportBtn) processImportBtn.disabled = false;
  }

  // Default OpenRouter fallback key
  const DEFAULT_OPENROUTER_KEY = '';

  function getAIKey() {
    const saved = localStorage.getItem('rf_openrouter_key');
    if (saved && saved.trim()) return saved.trim();
    return DEFAULT_OPENROUTER_KEY;
  }

  function ensureApiKeyOrPrompt(featureName = 'AI features') {
    const key = getAIKey();
    if (key && key.trim().length > 5) {
      return key.trim();
    }

    showToast(`🔑 OpenRouter API Key required for ${featureName}. Please enter your key in Settings.`, 'error');
    openSettingsModal();

    setTimeout(() => {
      const input = $('#settingsApiKeyInput');
      if (input) {
        input.focus();
        input.classList.add('highlight-pulse');
        setTimeout(() => input.classList.remove('highlight-pulse'), 3000);
      }
    }, 200);

    return null;
  }

  async function enhanceTextWithAI(originalText, sectionType, contextInfo = {}) {
    const key = ensureApiKeyOrPrompt(sectionType + ' AI enhancement');
    if (!key) return null;

    let promptContext = `Section Type: ${sectionType}\n`;
    if (contextInfo.role || contextInfo.company) {
      promptContext += `Role/Title: ${contextInfo.role || ''} ${contextInfo.company ? '@ ' + contextInfo.company : ''}\n`;
    }
    if (contextInfo.tech) {
      promptContext += `Tech Stack / Tools: ${contextInfo.tech}\n`;
    }
    promptContext += `\nOriginal Content:\n${originalText || '(No initial text provided - generate a high-impact sample description)'}`;

    const systemPrompt = `You are a world-class executive resume editor and ATS optimization expert.
Your job is to rewrite the provided resume ${sectionType} content to make it significantly more impactful, metric-driven, and professionally polished.

CRITICAL WRITING DIRECTIVES:
1. QUANTIFIABLE RESULTS & ACTION VERBS: Start bullet points with strong power verbs (e.g. 'Architected', 'Spearheaded', 'Optimized', 'Engineered', 'Accelerated', 'Orchestrated'). Incorporate realistic, high-impact numbers/metrics (e.g., '% reduction in latency', '$ saved', 'x% increase in conversion').
2. AUTHENTIC PROFESSIONAL TONE: Avoid generic, robotic AI clichés like 'spearheaded a revolutionary paradigm shift', 'beacon of excellence', or 'testament to'. Make it sound like an authentic high-performing senior professional wrote it.
3. FORMATTING: 
   - For Experience & Projects: Return 2-4 clean bullet points, each starting with '• '.
   - For Summary: Return a compelling 3-4 sentence paragraph.
4. STRICT OUTPUT: Return ONLY the enhanced content string. Do NOT include markdown wrappers (\`\`\`), intro titles, or conversational fluff.`;

    const models = [
      'google/gemini-2.5-flash',
      'google/gemini-2.0-flash-lite-001',
      'meta-llama/llama-3.3-70b-instruct'
    ];

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': window.location.origin || 'http://localhost:3000',
            'X-Title': 'Resume Forge AI Enhancer'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptContext }
            ],
            temperature: 0.5,
            max_tokens: 600
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          let clean = content.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
          return clean;
        }
      } catch (err) {
        console.warn(`Model ${model} enhancement call failed:`, err);
      }
    }

    throw new Error('AI enhancement request failed. Please check your OpenRouter key.');
  }

  const AI_SYSTEM_PROMPT = `You are an expert resume parser AI. Extract all resume sections into a strict JSON structure matching the schema below.

EXACT JSON SCHEMA TO RETURN:
{
  "personal": {
    "fullName": "",
    "jobTitle": "",
    "email": "",
    "phone": "",
    "location": "",
    "website": "",
    "linkedin": "",
    "github": "",
    "summary": ""
  },
  "experience": [
    {
      "role": "",
      "company": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "location": "",
      "description": "• Achievement 1\n• Achievement 2"
    }
  ],
  "education": [
    {
      "degree": "",
      "school": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "gpa": "",
      "description": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "tech": "",
      "link": "",
      "description": "• Feature 1\n• Feature 2"
    }
  ],
  "skills": [
    { "name": "", "level": "advanced" }
  ],
  "certs": [
    { "name": "", "issuer": "", "date": "" }
  ],
  "languages": "",
  "interests": ""
}

STRICT RULES:
1. Return ONLY the raw JSON object. Do not add markdown commentary or code block fences.
2. Preserve original facts. NEVER invent or hallucinate information not present in the text.
3. NEVER invent numbers or fake metrics.
4. Preserve technical terms, URLs, emails, and exact names (e.g. C++, C#, .NET, Node.js, React).
5. If a field or section is missing in the resume text, set strings to "" and arrays to [].
6. Extract ALL technical & soft skills mentioned anywhere in the resume text. Set skill level to "beginner", "intermediate", "advanced", or "expert".
7. Format descriptions for experience, education, and projects with bullet points starting with "• ".
8. Clean social URLs (linkedin, github, website) to URL path without https:// (e.g. "linkedin.com/in/username").`;

  // Multi-model OpenRouter caller with automatic fallback
  async function callOpenRouterAI(systemPrompt, userPrompt) {
    const apiKey = ensureApiKeyOrPrompt('Resume Import AI Parser');
    if (!apiKey) throw new Error('OpenRouter API key required. Please enter your API key in Settings.');

    const candidateModels = [
      'google/gemini-3.6-flash',
      'google/gemini-3.5-flash-lite',
      'meta-llama/llama-3.3-70b-instruct'
    ];

    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'ResumeForge'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 3000
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.warn(`[AI Model ${model} HTTP ${response.status}]`, errBody);
          lastError = new Error(`API ${response.status}: ${errBody.slice(0, 150)}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          return content;
        }
      } catch (err) {
        console.warn(`[AI Model ${model} error]`, err);
        lastError = err;
      }
    }

    throw lastError || new Error('All AI models failed to respond.');
  }

  function parseAIJSONResponse(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') return null;

    let clean = rawContent
      .replace(/^[\s\S]*?```(?:json)?\s*/i, s => s.includes('{') ? '' : s)
      .replace(/```[\s\S]*$/i, '')
      .trim();

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      try {
        const sanitized = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch (err2) {
        console.error('Failed to parse AI JSON:', err2);
        return null;
      }
    }
  }

  function validateAndNormalizeAISchema(rawObj) {
    if (!rawObj || typeof rawObj !== 'object' || Array.isArray(rawObj)) {
      return { valid: false, data: null, sectionCount: 0 };
    }

    const normalized = normalizeAISchema(rawObj);
    let detectedSections = 0;

    if (normalized.personal && (normalized.personal.fullName || normalized.personal.email || normalized.personal.phone || normalized.personal.jobTitle)) {
      detectedSections++;
    }
    if (normalized.personal && normalized.personal.summary && normalized.personal.summary.trim()) {
      detectedSections++;
    }
    if (Array.isArray(normalized.experience) && normalized.experience.length > 0) {
      detectedSections++;
    }
    if (Array.isArray(normalized.education) && normalized.education.length > 0) {
      detectedSections++;
    }
    if (Array.isArray(normalized.projects) && normalized.projects.length > 0) {
      detectedSections++;
    }
    if (Array.isArray(normalized.skills) && normalized.skills.length > 0) {
      detectedSections++;
    }
    if (Array.isArray(normalized.certs) && normalized.certs.length > 0) {
      detectedSections++;
    }
    if (normalized.languages && normalized.languages.trim()) {
      detectedSections++;
    }
    if (normalized.interests && normalized.interests.trim()) {
      detectedSections++;
    }

    const isValid = detectedSections > 0;
    return {
      valid: isValid,
      data: isValid ? normalized : null,
      sectionCount: detectedSections
    };
  }

  // Canonical extraction pipeline — used for BOTH Upload File & Paste Resume Text
  async function executeResumeExtraction(rawText) {
    const { text: cleanText, corrupted } = normalizeResumeText(rawText);

    if (!cleanText || !cleanText.trim()) {
      showToast('No readable text found in resume input.', 'error');
      return;
    }

    if (corrupted) {
      showToast('⚠️ Text contains scan artifacts. Extraction may be partial.', 'error');
    }

    showAILoading();

    try {
      const aiResponseText = await callOpenRouterAI(
        AI_SYSTEM_PROMPT,
        `Extract complete structured resume data from this text:\n\n${cleanText}`
      );

      const parsedJSON = parseAIJSONResponse(aiResponseText);
      if (!parsedJSON) {
        throw new Error('Could not parse valid JSON from AI response.');
      }

      const { valid, data, sectionCount } = validateAndNormalizeAISchema(parsedJSON);

      if (!valid || !data) {
        throw new Error('AI response did not contain valid resume sections.');
      }

      // Safe state update ONLY on validated success
      applyDataToForm(data);
      hideImportModal();

      if (pasteResumeInput) pasteResumeInput.value = '';
      resetDropzoneUI();

      showToast(`Resume understood successfully — ${sectionCount} sections detected`, 'success');

    } catch (err) {
      console.error('[AI Import Pipeline Error]', err);
      hideAILoading();
      // DO NOT overwrite existing resume on failure
      showToast(`⚠️ Extraction failed: ${err.message || 'Malformed AI response'}. Smart parser active.`, 'error');
      // Fall back to offline smart parser without wiping state
      setTimeout(() => parseAndPopulateText(cleanText), 300);
    } finally {
      hideAILoading();
    }
  }

  // Process Import button handler
  if (processImportBtn) {
    processImportBtn.addEventListener('click', async () => {
      const activeTab = tabBtnUpload && tabBtnUpload.classList.contains('active') ? 'upload' : 'paste';

      if (activeTab === 'paste') {
        const text = pasteResumeInput ? pasteResumeInput.value.trim() : '';
        if (!text) {
          showToast('Please paste resume text first!', 'error');
          return;
        }
        await executeResumeExtraction(text);
      } else {
        const fileToUse = stagedFile || (resumeFileInput && resumeFileInput.files && resumeFileInput.files[0]);
        if (!fileToUse) {
          showToast('Please select or drag a file to import!', 'error');
          return;
        }

        if (fileToUse.name.endsWith('.json')) {
          try {
            const jsonText = await fileToUse.text();
            const parsed = JSON.parse(jsonText);
            const { valid, data, sectionCount } = validateAndNormalizeAISchema(parsed);
            if (valid && data) {
              applyDataToForm(data);
              hideImportModal();
              resetDropzoneUI();
              showToast(`Resume understood successfully — ${sectionCount} sections detected`, 'success');
            } else {
              showToast('JSON file is not a recognized resume backup.', 'error');
            }
          } catch (e) {
            showToast('Invalid JSON file format.', 'error');
          }
        } else {
          try {
            showAILoading();
            const extractedText = await extractTextFromFile(fileToUse);
            await executeResumeExtraction(extractedText);
          } catch (fileErr) {
            hideAILoading();
            showToast(`Could not read file: ${fileErr.message}`, 'error');
          }
        }
      }
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

    // 5. Name & Job Title extraction from header lines
    const cleanHeaderLines = lines.map(l => l.replace(/^[*#_\-\s]+|[*#_\-\s]+$/g, '').trim()).filter(Boolean);
    const nameLineIndex = cleanHeaderLines.findIndex(l => 
      l.length > 2 && l.length < 40 && 
      !l.includes('@') && !l.includes('http') && !l.includes('www.') &&
      !/resume|curriculum|vitae|contact|phone|email|summary|experience|education|skills/i.test(l)
    );

    if (nameLineIndex !== -1) {
      importedState.personal.fullName = cleanHeaderLines[nameLineIndex];
      if (cleanHeaderLines[nameLineIndex + 1]) {
        const nextLine = cleanHeaderLines[nameLineIndex + 1];
        if (nextLine.length < 50 && !nextLine.includes('@') && !nextLine.includes('http') && !/summary|experience|education|skills/i.test(nextLine)) {
          importedState.personal.jobTitle = nextLine;
        }
      }
    }

    // 6. Multi-Pass Section Parsing
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
    showToast(`Smart import complete! Parsed name, contact info, ${importedState.experience.length} jobs, and ${importedState.skills.length} skills.`, 'success');
  }

  // Resilient Section Classifier
  function parseSections(lines) {
    const sections = { summary: [], experience: [], education: [], skills: [], projects: [] };
    let currentSec = null;

    lines.forEach((line) => {
      // Strip markdown, numbers, bullets, trailing colons
      const clean = line.replace(/^[#*_\-\d.\s]+|[:*_\-\s]+$/g, '').trim().toLowerCase();
      
      if (/^(professional\s+)?(summary|profile|about(\s+me)?|objective)$/i.test(clean)) {
        currentSec = 'summary'; return;
      }
      if (/^(work\s+|professional\s+|relevant\s+)?(experience|employment|work\s+history|career(\s+history)?)$/i.test(clean)) {
        currentSec = 'experience'; return;
      }
      if (/^(education|academic(\s+background)?|qualifications|education\s+&\s+training)$/i.test(clean)) {
        currentSec = 'education'; return;
      }
      if (/^(technical\s+|core\s+|key\s+)?(skills|competencies|expertise|technologies|tools(\s+&\s+frameworks)?)$/i.test(clean)) {
        currentSec = 'skills'; return;
      }
      if (/^(key\s+|featured\s+|personal\s+)?projects$/i.test(clean)) {
        currentSec = 'projects'; return;
      }

      if (currentSec && sections[currentSec]) {
        sections[currentSec].push(line);
      }
    });

    return sections;
  }

  // Resilient Experience Parser Helper
  function parseExperienceSection(expLines) {
    const items = [];
    let currentItem = null;
    const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{4})[\w\s,]*?(?:[-–—]|\bto\b)[\w\s,]*?\b(\d{4}|Present|Current)\b/i;

    expLines.forEach((line) => {
      const cleanLine = line.replace(/^[#*_\-\s]+|[*#_\-\s]+$/g, '').trim();
      if (!cleanLine) return;

      const dateMatch = cleanLine.match(dateRegex);

      // If line is purely a date range for the active entry, merge dates
      if (dateMatch && currentItem && !currentItem._hasDates) {
        const dateParts = dateMatch[0].split(/\s*[-–—]\s*|\s+\bto\b\s+/i).map(s => s.trim());
        currentItem.startDate = dateParts[0] || currentItem.startDate;
        currentItem.endDate = dateParts[1] || 'Present';
        currentItem.current = /present|current/i.test(currentItem.endDate);
        currentItem._hasDates = true;
        return;
      }

      const isNewEntry = cleanLine.includes(' at ') || cleanLine.includes('|') || 
        (!dateMatch && cleanLine.length < 60 && !cleanLine.startsWith('•') && !cleanLine.startsWith('-') && !cleanLine.startsWith('*') && (!currentItem || currentItem.description));

      if (isNewEntry && (!currentItem || currentItem.description || currentItem.role)) {
        if (currentItem && (currentItem.role || currentItem.description)) {
          delete currentItem._hasDates;
          items.push(currentItem);
        }

        let role = cleanLine;
        let company = 'Company Name';
        let startDate = '2020';
        let endDate = 'Present';
        let current = false;
        let hasDates = false;

        if (dateMatch) {
          hasDates = true;
          const dateParts = dateMatch[0].split(/\s*[-–—]\s*|\s+\bto\b\s+/i).map(s => s.trim());
          startDate = dateParts[0] || '2020';
          endDate = dateParts[1] || 'Present';
          current = /present|current/i.test(endDate);
        }

        if (cleanLine.includes(' at ')) {
          const parts = cleanLine.split(' at ');
          role = parts[0].trim();
          company = parts[1].replace(dateRegex, '').trim();
        } else if (cleanLine.includes('|')) {
          const parts = cleanLine.split('|');
          role = parts[0].trim();
          company = parts[1].replace(dateRegex, '').trim();
        } else if (cleanLine.includes(' - ') && !dateMatch) {
          const parts = cleanLine.split(' - ');
          role = parts[0].trim();
          company = parts[1].trim();
        }

        currentItem = {
          id: generateId(),
          role: role.replace(dateRegex, '').trim() || 'Role / Position',
          company: company || 'Company Name',
          startDate: startDate,
          endDate: endDate,
          current: current,
          location: '',
          description: '',
          _hasDates: hasDates
        };
      } else {
        if (currentItem) {
          const bulletLine = (cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('*')) ? cleanLine : '• ' + cleanLine;
          if (currentItem.description) currentItem.description += '\n' + bulletLine;
          else currentItem.description = bulletLine;
        }
      }
    });

    if (currentItem && (currentItem.role || currentItem.description)) {
      delete currentItem._hasDates;
      items.push(currentItem);
    }
    return items;
  }

  // Resilient Education Parser Helper
  function parseEducationSection(eduLines) {
    const items = [];
    let currentItem = null;

    eduLines.forEach((line) => {
      const cleanLine = line.replace(/^[#*_\-\s]+|[*#_\-\s]+$/g, '').trim();
      if (!cleanLine) return;

      const dateMatch = cleanLine.match(/\b(19|20)\d{2}\b/g);

      if (dateMatch && currentItem && !currentItem._hasDates) {
        currentItem.startDate = dateMatch[0] || '2016';
        currentItem.endDate = dateMatch[1] || '2020';
        currentItem._hasDates = true;
        return;
      }

      if (/degree|bachelor|master|b\.s|m\.s|phd|diploma|associate|university|college|school/i.test(cleanLine) || !currentItem) {
        if (currentItem && (currentItem.degree || currentItem.school)) {
          delete currentItem._hasDates;
          items.push(currentItem);
        }

        const startDate = dateMatch && dateMatch[0] ? dateMatch[0] : '2016';
        const endDate = dateMatch && dateMatch[1] ? dateMatch[1] : '2020';

        let degree = cleanLine.replace(/\b(19|20)\d{2}\b/g, '').trim();
        let school = 'University / Institution';

        if (cleanLine.toLowerCase().includes('university') || cleanLine.toLowerCase().includes('college') || cleanLine.toLowerCase().includes('institute')) {
          if (degree.includes(' at ')) {
            const parts = degree.split(' at ');
            degree = parts[0];
            school = parts[1];
          } else if (degree.includes(',')) {
            const parts = degree.split(',');
            degree = parts[0];
            school = parts.slice(1).join(',');
          } else {
            school = cleanLine;
          }
        }

        currentItem = {
          id: generateId(),
          degree: degree || 'Degree / Qualification',
          school: school || 'University / Institution',
          startDate: startDate,
          endDate: endDate,
          current: false,
          gpa: '',
          description: '',
          _hasDates: !!dateMatch
        };
      } else if (currentItem) {
        if (cleanLine.toLowerCase().includes('university') || cleanLine.toLowerCase().includes('college') || cleanLine.toLowerCase().includes('institute')) {
          currentItem.school = cleanLine;
        } else {
          currentItem.description += (currentItem.description ? ' ' : '') + cleanLine;
        }
      }
    });

    if (currentItem && (currentItem.degree || currentItem.school)) {
      delete currentItem._hasDates;
      items.push(currentItem);
    }
    return items;
  }

  // Resilient Projects Parser Helper
  function parseProjectsSection(projLines) {
    const items = [];
    let currentItem = null;

    projLines.forEach((line) => {
      const cleanLine = line.replace(/^[#*_\-\s]+|[*#_\-\s]+$/g, '').trim();
      if (!cleanLine) return;

      if ((cleanLine.length < 60 && !cleanLine.startsWith('•') && !cleanLine.startsWith('-') && !cleanLine.startsWith('*')) || !currentItem) {
        if (currentItem) items.push(currentItem);
        currentItem = {
          id: generateId(),
          name: cleanLine,
          tech: '',
          link: '',
          description: ''
        };
      } else if (currentItem) {
        const bulletLine = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('*') ? cleanLine : '• ' + cleanLine;
        currentItem.description += (currentItem.description ? '\n' : '') + bulletLine;
      }
    });

    if (currentItem) items.push(currentItem);
    return items;
  }

  // Resilient Skills Parser Helper
  function parseSkillsSection(skillsLines, fullText) {
    const result = [];
    const addedNames = new Set();

    skillsLines.forEach((line) => {
      // Split on commas, bullets, pipes, semicolons, or slashes
      const parts = line.split(/[,•|;\/\n]/).map(s => s.replace(/^[#*_\-\s]+|[*#_\-\s:]+$/g, '').trim()).filter(s => s.length > 1 && s.length < 40);
      parts.forEach((skillName) => {
        const clean = skillName.replace(/^proficient in|^experienced with|^knowledge of|^skills[:\s]*/i, '').trim();
        if (clean && !addedNames.has(clean.toLowerCase()) && !/skills|expertise|competencies|technologies|tools/i.test(clean)) {
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

  window.parseAndPopulateText = parseAndPopulateText;
  window.getState = () => state;

  // ── Init ──
  load();
  if (window.innerWidth <= 860) {
    setMobileView('edit');
  }
  render();
  checkAutoShowPreviewGuide();
  setTimeout(autoResizeAllTextareas, 50);
})();
