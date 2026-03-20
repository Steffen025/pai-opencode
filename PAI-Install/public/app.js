/**
 * PAI Installer v4.0 — Frontend Application
 * Vanilla JavaScript — no framework dependencies.
 * Handles WebSocket communication, UI rendering, and state management.
 */

// ─── State ───────────────────────────────────────────────────────

let ws = null;
let connected = false;
let voiceEnabled = true;
let currentAudio = null;
let installMode = null; // 'fresh', 'migrate', 'update'
let steps = [];

// ─── WebSocket Connection ────────────────────────────────────────

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    connected = true;
    ws.send(JSON.stringify({ type: 'client_ready' }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  };

  ws.onclose = () => {
    connected = false;
    addMessage('system', 'Connection lost. Reconnecting...', false);
    setTimeout(connect, 2000); // Auto-reconnect
  };

  ws.onerror = () => {
    connected = false;
  };
}

// ─── Message Handler ─────────────────────────────────────────────

function handleServerMessage(msg) {
  const isReplayed = msg.replayed === true;

  switch (msg.type) {
    case 'connected':
      break;

    case 'mode_detected':
      installMode = msg.mode;
      renderModeSelection(msg.mode);
      break;

    case 'mode_selected':
      setStepsForMode(msg.mode);
      renderSteps();
      break;

    case 'step_update':
      updateStep(msg.step, msg.status);
      updateProgress();
      break;

    case 'detection_result':
      renderDetection(msg.data);
      break;

    case 'message':
      addMessage(msg.role || 'assistant', msg.content, isReplayed);
      if (msg.speak && !isReplayed && voiceEnabled) {
        // TTS would go here if we had the ElevenLabs key
      }
      break;

    case 'input_request':
      renderInputForm(msg.id, msg.prompt, msg.inputType, msg.placeholder);
      break;

    case 'choice_request':
      renderChoiceForm(msg.id, msg.prompt, msg.choices);
      break;

    case 'progress':
      renderProgress(msg.step, msg.percent, msg.detail);
      break;

    case 'validation_result':
      renderValidation(msg.checks);
      break;

    case 'install_complete':
      renderSummary(msg.summary);
      break;

    case 'error':
      addMessage('error', `Error: ${msg.message}`, isReplayed);
      break;
  }

  scrollToBottom();
}

// ─── Step Management ─────────────────────────────────────────────

function updateStep(stepId, status) {
  const step = steps.find(s => s.id === stepId);
  if (step) step.status = status;
  renderSteps();
}

function updateProgress() {
  const done = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  const pct = Math.round((done / steps.length) * 100);

  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const sidebarFill = document.getElementById('sidebar-progress-fill');
  const sidebarText = document.getElementById('sidebar-progress-text');

  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `Step ${done}/${steps.length}`;
  if (sidebarFill) sidebarFill.style.width = pct + '%';
  if (sidebarText) sidebarText.textContent = `Progress: ${pct}%`;
}

function renderSteps() {
  const list = document.getElementById('step-list');
  if (!list) return;

  list.innerHTML = '';
  
  for (const s of steps) {
    let icon = '○';
    let cls = s.status;
    if (s.status === 'completed') icon = '✓';
    else if (s.status === 'active') icon = '→';
    else if (s.status === 'skipped') icon = '–';
    else if (s.status === 'failed') icon = '✗';

    const li = document.createElement('li');
    li.className = `step-item ${cls}`;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = `step-icon ${cls}`;
    iconSpan.textContent = icon;
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'step-label';
    labelSpan.textContent = `${s.number}. ${s.name}`;
    
    li.appendChild(iconSpan);
    li.appendChild(labelSpan);
    list.appendChild(li);
  }
}

// ─── Chat Rendering ──────────────────────────────────────────────

function addMessage(role, content, replayed) {
  if (!content || !content.trim()) return;
  const chat = document.getElementById('chat-messages');
  if (!chat) return;

  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = content;
  if (replayed) div.style.animation = 'none';
  chat.appendChild(div);
}

function renderDetection(data) {
  const chat = document.getElementById('chat-messages');
  if (!chat) return;

  const items = [
    { icon: 'check', label: 'OS', value: data.os?.name + ' (' + data.os?.arch + ')' },
    { icon: 'check', label: 'Shell', value: data.shell?.name },
    { icon: data.tools?.bun?.installed ? 'check' : 'cross', label: 'Bun', value: data.tools?.bun?.installed ? 'v' + data.tools.bun.version : 'Not found' },
    { icon: data.tools?.git?.installed ? 'check' : 'cross', label: 'Git', value: data.tools?.git?.installed ? 'v' + data.tools.git.version : 'Not found' },
    { icon: data.tools?.claude?.installed ? 'check' : 'info', label: 'OpenCode', value: data.tools?.claude?.installed ? 'v' + data.tools.claude.version : 'Will install' },
    { icon: 'info', label: 'Timezone', value: data.timezone },
    { icon: data.existing?.paiInstalled ? 'info' : 'check', label: 'Existing PAI', value: data.existing?.paiInstalled ? 'v' + (data.existing.paiVersion || '?') : 'Fresh install' },
    { icon: data.existing?.hasApiKeys ? 'check' : 'info', label: 'ElevenLabs Key', value: data.existing?.elevenLabsKeyFound ? 'Found' : 'Not found' },
  ];

  const grid = document.createElement('div');
  grid.className = 'detection-grid';
  
  items.forEach(i => {
    const item = document.createElement('div');
    item.className = 'detection-item';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = i.icon;
    iconSpan.textContent = i.icon === 'check' ? '✓' : i.icon === 'cross' ? '✗' : 'ℹ';
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = `${i.label}: ${i.value}`;
    
    item.appendChild(iconSpan);
    item.appendChild(labelSpan);
    grid.appendChild(item);
  });
  
  chat.appendChild(grid);
}

function renderInputForm(requestId, prompt, inputType, placeholder) {
  const chat = document.getElementById('chat-messages');
  if (!chat) return;

  // Show prompt as message
  addMessage('assistant', prompt);

  const form = document.createElement('div');
  form.className = 'inline-form';
  
  const label = document.createElement('label');
  label.textContent = inputType === 'key' ? 'API Key' : 'Input';
  
  const formRow = document.createElement('div');
  formRow.className = 'form-row';
  
  const input = document.createElement('input');
  input.className = 'inline-input';
  input.type = inputType === 'key' || inputType === 'password' ? 'password' : 'text';
  input.placeholder = placeholder || '';
  input.id = `input-${requestId}`;
  input.autocomplete = 'off';
  
  const button = document.createElement('button');
  button.className = 'inline-btn';
  button.textContent = 'Submit';
  button.onclick = () => submitInput(requestId);
  
  formRow.appendChild(input);
  formRow.appendChild(button);
  form.appendChild(label);
  form.appendChild(formRow);
  chat.appendChild(form);

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('input-' + requestId);
    if (input) {
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitInput(requestId);
      });
    }
  }, 100);

  scrollToBottom();
}

function submitInput(requestId) {
  const input = document.getElementById('input-' + requestId);
  if (!input) return;

  const value = input.value.trim();
  if (!value && input.getAttribute('type') === 'password') {
    // Allow empty for optional fields
  }

  // Check WebSocket state before sending
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage('system', 'Connection lost. Please wait for reconnect...', false);
    return;
  }

  // Mask key display - for passwords or API keys
  let display;
  if (input.getAttribute('type') === 'password') {
    display = '•••••';
  } else if (value.startsWith('sk-') || value.startsWith('xi-')) {
    display = value.substring(0, 8) + '...';
  } else {
    display = value;
  }
  addMessage('user', display || '(empty)');

  // Disable form
  input.disabled = true;
  input.closest('.inline-form').querySelector('.inline-btn').disabled = true;

  ws.send(JSON.stringify({ type: 'user_input', requestId, value }));
  scrollToBottom();
}

function renderChoiceForm(requestId, prompt, choices) {
  const chat = document.getElementById('chat-messages');
  if (!chat) return;

  addMessage('assistant', prompt);

  // Voice preview audio map — show previews for both initial and retry voice selection
  const voicePreviews = { female: '/assets/voice-female.mp3', male: '/assets/voice-male.mp3' };
  const isVoiceTypeRequest = requestId === 'voice-type' || requestId === 'voice-type-retry';

  const group = document.createElement('div');
  group.className = 'choice-group';

  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.requestId = requestId;
    btn.dataset.value = c.value;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'choice-label';
    labelSpan.textContent = c.label;
    btn.appendChild(labelSpan);

    if (c.description) {
      const descSpan = document.createElement('span');
      descSpan.className = 'choice-desc';
      descSpan.textContent = c.description;
      btn.appendChild(descSpan);
    }

    btn.addEventListener('click', () => submitChoice(requestId, c.value, btn));
    group.appendChild(btn);

    // Add preview button as sibling (not nested) for voice selection
    if (voicePreviews[c.value] && isVoiceTypeRequest) {
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'preview-btn';
      preview.innerHTML = '&#9654; Preview';
      preview.addEventListener('click', (e) => {
        e.stopPropagation();
        playPreview(voicePreviews[c.value], preview);
      });
      group.appendChild(preview);
    }
  });

  chat.appendChild(group);
  scrollToBottom();
}

function playPreview(src, btn) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  currentAudio = new Audio(src);
  currentAudio.volume = 0.8;
  currentAudio.play().catch(() => {});
  btn.textContent = '⏹ Playing';
  currentAudio.onended = () => { btn.textContent = '▶ Preview'; currentAudio = null; };
}

function submitChoice(requestId, value, btn) {
  // Check WebSocket state before sending
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage('system', 'Connection lost. Please wait for reconnect...', false);
    return;
  }

  // Highlight selected, disable all
  const group = btn.closest('.choice-group');
  group.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    b.style.opacity = b === btn ? '1' : '0.4';
  });
  btn.style.borderColor = 'var(--accent-primary)';

  // Extract only the label text, not description or preview button text
  const labelEl = btn.querySelector('.choice-label');
  const displayText = labelEl ? labelEl.textContent.trim() : btn.textContent.trim().split('\n')[0];
  addMessage('user', displayText);
  ws.send(JSON.stringify({ type: 'user_choice', requestId, value }));
  scrollToBottom();
}

function renderProgress(step, percent, detail) {
  // Update or create progress indicator
  let existing = document.getElementById('progress-' + step);
  const chat = document.getElementById('chat-messages');

  if (existing) {
    existing.querySelector('.mini-fill').style.width = percent + '%';
    existing.querySelector('.prog-detail').textContent = detail;
  } else {
    const div = document.createElement('div');
    div.className = 'progress-msg';
    div.id = 'progress-' + step;
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    const miniBar = document.createElement('div');
    miniBar.className = 'mini-bar';
    
    const miniFill = document.createElement('div');
    miniFill.className = 'mini-fill';
    miniFill.style.width = percent + '%';
    
    const progDetail = document.createElement('span');
    progDetail.className = 'prog-detail';
    progDetail.textContent = detail;
    
    miniBar.appendChild(miniFill);
    div.appendChild(spinner);
    div.appendChild(miniBar);
    div.appendChild(progDetail);
    chat.appendChild(div);
  }
  scrollToBottom();
}

function renderValidation(checks) {
  const chat = document.getElementById('chat-messages');
  if (!chat) return;

  addMessage('system', 'Running validation checks...');

  const list = document.createElement('div');
  list.className = 'validation-list';
  
  checks.forEach(c => {
    const item = document.createElement('div');
    item.className = 'validation-item';
    
    const icon = document.createElement('span');
    icon.className = 'v-icon';
    icon.textContent = c.passed ? '✓' : c.critical ? '✗' : '⚠';
    
    const name = document.createElement('span');
    name.className = 'v-name';
    name.textContent = c.name;
    
    const detail = document.createElement('span');
    detail.className = 'v-detail';
    detail.textContent = c.detail;
    
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(detail);
    list.appendChild(item);
  });
  
  chat.appendChild(list);
  scrollToBottom();
}

function renderSummary(summary) {
  const chat = document.getElementById('chat-messages');
  if (!chat) return;

  const card = document.createElement('div');
  card.className = 'summary-card';
  
  const h3 = document.createElement('h3');
  h3.textContent = 'Installation Complete';
  card.appendChild(h3);
  
  function addRow(label, value) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    const labelSpan = document.createElement('span');
    labelSpan.className = 's-label';
    labelSpan.textContent = label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 's-value';
    valueSpan.textContent = value;
    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    card.appendChild(row);
  }
  
  addRow('PAI Version', `v${summary.paiVersion}`);
  addRow('Principal', summary.principalName);
  addRow('AI Name', summary.aiName);
  addRow('Timezone', summary.timezone);
  addRow('Voice', summary.voiceEnabled ? summary.voiceMode : 'Disabled');
  addRow('Install Type', summary.mode || summary.installType);
  
  const actionDiv = document.createElement('div');
  actionDiv.className = 'summary-action';
  const p1 = document.createElement('p');
  p1.textContent = 'To activate PAI, open a terminal and run:';
  const code = document.createElement('code');
  // Use activation command from backend, or derive from detected shell/platform
  let activationCommand;
  if (summary.activationCommand) {
    activationCommand = summary.activationCommand;
  } else if (summary.userShell?.includes('bash')) {
    activationCommand = 'source ~/.bashrc && pai';
  } else if (summary.userShell?.includes('fish')) {
    activationCommand = 'source ~/.config/fish/config.fish && pai';
  } else if (navigator.platform?.includes('Win') || navigator.userAgent?.includes('Windows')) {
    // Windows platform detected
    activationCommand = 'Restart your terminal and type: pai';
  } else {
    // Default Unix/zsh
    activationCommand = 'source ~/.zshrc && pai';
  }
  code.textContent = activationCommand;
  const p2 = document.createElement('p');
  p2.className = 'summary-hint';
  p2.textContent = 'This reloads your shell config and launches PAI for the first time.';
  actionDiv.appendChild(p1);
  actionDiv.appendChild(code);
  actionDiv.appendChild(p2);
  card.appendChild(actionDiv);
  
  chat.appendChild(card);
  scrollToBottom();
}

// ─── Welcome Screen ──────────────────────────────────────────────

function startInstall() {
  // This is now handled by selectMode
  console.log('Start install clicked - should use selectMode instead');
}

// Legacy - keep for compatibility but mode selection handles this now
function legacyStartInstall() {
  const overlay = document.getElementById('welcome-overlay');
  if (overlay) overlay.classList.add('hidden');

  // Start installation only when WebSocket is ready
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'start_install' }));
  } else {
    // Queue for when connection opens with retry limit
    let attempts = 0;
    const maxRetries = 50; // 5 seconds total (50 * 100ms)
    
    const checkAndSend = () => {
      attempts++;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'start_install' }));
      } else if (attempts < maxRetries) {
        setTimeout(checkAndSend, 100);
      } else {
        console.error('Failed to start installation: WebSocket not ready after 5 seconds');
        addMessage('system', 'Error: Could not connect to installer. Please refresh and try again.');
      }
    };
    checkAndSend();
  }
}

// ─── Utilities ───────────────────────────────────────────────────

function setStepsForMode(mode) {
  if (mode === 'fresh') {
    steps = [
      { id: 'system-detect', name: 'System Detection', number: 1, status: 'pending' },
      { id: 'prerequisites', name: 'Prerequisites', number: 2, status: 'pending' },
      { id: 'api-keys', name: 'API Keys', number: 3, status: 'pending' },
      { id: 'identity', name: 'Identity', number: 4, status: 'pending' },
      { id: 'repository', name: 'PAI Repository', number: 5, status: 'pending' },
      { id: 'configuration', name: 'Configuration', number: 6, status: 'pending' },
      { id: 'voice', name: 'DA Voice', number: 7, status: 'pending' },
      { id: 'validation', name: 'Validation', number: 8, status: 'pending' },
    ];
  } else if (mode === 'migrate') {
    steps = [
      { id: 'backup', name: 'Backup v2 Config', number: 1, status: 'pending' },
      { id: 'detect', name: 'Detect Current Install', number: 2, status: 'pending' },
      { id: 'migrate-config', name: 'Migrate Configuration', number: 3, status: 'pending' },
      { id: 'build', name: 'Build OpenCode', number: 4, status: 'pending' },
      { id: 'verify', name: 'Verify Migration', number: 5, status: 'pending' },
    ];
  } else if (mode === 'update') {
    steps = [
      { id: 'backup', name: 'Backup Current Config', number: 1, status: 'pending' },
      { id: 'pull', name: 'Pull Latest Changes', number: 2, status: 'pending' },
      { id: 'rebuild', name: 'Rebuild & Verify', number: 3, status: 'pending' },
    ];
  }
}

function renderModeSelection(detectedMode) {
  const overlay = document.getElementById('welcome-overlay');
  if (!overlay) return;

  // Clear the default content
  overlay.innerHTML = '';

  const logo = document.createElement('img');
  logo.src = '/assets/pai-logo.png';
  logo.alt = 'PAI';
  logo.className = 'welcome-logo';
  overlay.appendChild(logo);

  const title = document.createElement('div');
  title.className = 'welcome-title';
  title.textContent = 'PAI Installer';
  overlay.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'welcome-subtitle';
  subtitle.textContent = 'Personal AI Infrastructure v4.0';
  overlay.appendChild(subtitle);

  // Mode selection
  const modeLabel = document.createElement('div');
  modeLabel.style.cssText = 'margin: 20px 0 10px; color: var(--text-secondary); font-size: 14px;';
  modeLabel.textContent = detectedMode === 'fresh' 
    ? 'No existing installation found' 
    : detectedMode === 'migrate' 
    ? 'Existing v2 installation detected'
    : 'Existing v3 installation detected';
  overlay.appendChild(modeLabel);

  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';

  if (detectedMode === 'fresh') {
    // Only fresh install option
    const freshBtn = createModeButton('Fresh Install', 'New installation with full setup', 'fresh', true);
    buttonGroup.appendChild(freshBtn);
  } else if (detectedMode === 'migrate') {
    // v2 -> v3 migration options
    const migrateBtn = createModeButton('Migrate from v2', 'Migrate your existing v2 configuration to v3', 'migrate', true);
    const freshBtn = createModeButton('Fresh Install', 'Start fresh (discards v2 config)', 'fresh', false);
    buttonGroup.appendChild(migrateBtn);
    buttonGroup.appendChild(freshBtn);
  } else if (detectedMode === 'update') {
    // v3 update options
    const updateBtn = createModeButton('Update', 'Update to latest v3.x version', 'update', true);
    const freshBtn = createModeButton('Reinstall Fresh', 'Remove and reinstall fresh', 'fresh', false);
    buttonGroup.appendChild(updateBtn);
    buttonGroup.appendChild(freshBtn);
  }

  overlay.appendChild(buttonGroup);
}

function createModeButton(label, description, mode, isPrimary) {
  const btn = document.createElement('button');
  btn.className = isPrimary ? 'welcome-start' : 'welcome-start secondary';
  btn.style.cssText = isPrimary ? '' : 'background: transparent; border: 1px solid var(--accent-primary); color: var(--accent-primary);';
  btn.innerHTML = `<div style="font-weight: 600;">${label}</div><div style="font-size: 12px; opacity: 0.8; font-weight: 400;">${description}</div>`;
  btn.onclick = () => selectMode(mode);
  return btn;
}

function selectMode(mode) {
  installMode = mode;
  setStepsForMode(mode);

  const overlay = document.getElementById('welcome-overlay');
  if (overlay) overlay.classList.add('hidden');

  // Send mode selection to server
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'select_mode', mode: mode }));
  }
}

function scrollToBottom() {
  const chat = document.getElementById('chat-messages');
  if (chat) {
    // Double-RAF ensures DOM has fully rendered before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chat.scrollTop = chat.scrollHeight;
      });
    });
  }
}

// ─── Initialize ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderSteps();
  connect();

  // Welcome audio is played via <audio autoplay> in index.html
});
