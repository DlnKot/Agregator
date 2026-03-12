// ==================== State ====================
let state = {
  connections: [],
  profiles: [],
  settings: {},
  currentView: 'connections',
  currentClientFilter: 'all',
  editingConnectionId: null,
  editingProfileId: null
};

// ==================== DOM Elements ====================
const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.view'),

  // Connections
  connectionsList: document.getElementById('connections-list'),
  addConnectionBtn: document.getElementById('add-connection-btn'),
  clientTabs: document.querySelectorAll('.client-tab'),

  // Profiles
  profilesList: document.getElementById('profiles-list'),
  addProfileBtn: document.getElementById('add-profile-btn'),

  // Settings
  settingsTabs: document.querySelectorAll('.settings-tab'),
  settingsSections: document.querySelectorAll('.settings-section'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),

  // Connection Modal
  connectionModal: document.getElementById('connection-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalClose: document.getElementById('modal-close'),
  modalCancel: document.getElementById('modal-cancel'),
  modalSave: document.getElementById('modal-save'),
  connectionForm: document.getElementById('connection-form'),
  connectionId: document.getElementById('connection-id'),
  connectionType: document.getElementById('connection-type'),
  connectionName: document.getElementById('connection-name'),
  connectionHost: document.getElementById('connection-host'),
  connectionPool: document.getElementById('connection-pool'),
  connectionUsername: document.getElementById('connection-username'),
  connectionDescription: document.getElementById('connection-description'),
  horizonFields: document.querySelector('.horizon-fields'),

  // Profile Modal
  profileModal: document.getElementById('profile-modal'),
  profileModalTitle: document.getElementById('profile-modal-title'),
  profileModalClose: document.getElementById('profile-modal-close'),
  profileModalCancel: document.getElementById('profile-modal-cancel'),
  profileModalSave: document.getElementById('profile-modal-save'),
  profileForm: document.getElementById('profile-form'),
  profileId: document.getElementById('profile-id'),
  profileName: document.getElementById('profile-name'),
  profileConnections: document.getElementById('profile-connections'),

  // Settings inputs
  rdpResolution: document.getElementById('rdp-resolution'),
  rdpColors: document.getElementById('rdp-colors'),
  rdpMultimon: document.getElementById('rdp-multimon'),
  rdpClipboard: document.getElementById('rdp-clipboard'),
  rdpDrives: document.getElementById('rdp-drives'),
  rdpAdminSession: document.getElementById('rdp-admin-session'),
  rdpPromptCredentials: document.getElementById('rdp-prompt-credentials'),
  rdpStartFullscreen: document.getElementById('rdp-start-fullscreen'),
  rdpSpan: document.getElementById('rdp-span'),
  rdpCustom: document.getElementById('rdp-custom'),

  horizonBroker: document.getElementById('horizon-broker'),
  horizonPool: document.getElementById('horizon-pool'),
  horizonUsername: document.getElementById('horizon-username'),
  horizonDomain: document.getElementById('horizon-domain'),
  horizonOnce: document.getElementById('horizon-once'),
  horizonNonInteractive: document.getElementById('horizon-noninteractive'),
  horizonCustom: document.getElementById('horizon-custom'),

  citrixStore: document.getElementById('citrix-store'),
  citrixResource: document.getElementById('citrix-resource'),
  citrixCustom: document.getElementById('citrix-custom'),

  generalTray: document.getElementById('general-tray'),
  generalStart: document.getElementById('general-start')
};

// ==================== Initialization ====================
async function init() {
  console.log('Initializing app...');

  // Load data
  await loadData();

  // Setup event listeners
  setupEventListeners();

  // Render initial view
  renderConnections();
  renderProfiles();
  renderSettings();

  console.log('App initialized');
}

async function loadData() {
  try {
    state.connections = await window.api.getConnections();
    state.profiles = await window.api.getProfiles();
    state.settings = await window.api.getSettings();
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Ошибка загрузки данных', 'error');
  }
}

// ==================== Event Listeners ====================
function setupEventListeners() {
  // Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Client tabs (connections)
  elements.clientTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const type = tab.dataset.type;
      state.currentClientFilter = type;
      elements.clientTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderConnections();
    });
  });

  // Add connection button
  elements.addConnectionBtn.addEventListener('click', () => {
    openConnectionModal();
  });

  // Settings tabs
  elements.settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      elements.settingsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      elements.settingsSections.forEach(s => {
        s.classList.toggle('active', s.dataset.section === section);
      });
    });
  });

  // Save settings
  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  // Connection modal
  elements.modalClose.addEventListener('click', closeConnectionModal);
  elements.modalCancel.addEventListener('click', closeConnectionModal);
  elements.modalSave.addEventListener('click', saveConnection);
  elements.connectionModal.querySelector('.modal-overlay').addEventListener('click', closeConnectionModal);

  // Connection type change
  elements.connectionType.addEventListener('change', () => {
    const type = elements.connectionType.value;
    elements.horizonFields.style.display = type === 'horizon' ? 'block' : 'none';
  });



  // Profile modal
  elements.addProfileBtn.addEventListener('click', () => {
    openProfileModal();
  });
  elements.profileModalClose.addEventListener('click', closeProfileModal);
  elements.profileModalCancel.addEventListener('click', closeProfileModal);
  elements.profileModalSave.addEventListener('click', saveProfile);
  elements.profileModal.querySelector('.modal-overlay').addEventListener('click', closeProfileModal);
}

// ==================== View Management ====================
function switchView(viewName) {
  state.currentView = viewName;

  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  elements.views.forEach(view => {
    view.classList.toggle('active', view.id === `${viewName}-view`);
  });
}

// ==================== Connections ====================
function renderConnections() {
  const filtered = state.currentClientFilter === 'all'
    ? state.connections
    : state.connections.filter(c => c.type === state.currentClientFilter);

  if (filtered.length === 0) {
    elements.connectionsList.innerHTML = `
 <div class="empty-state">
 <svg viewBox="002424" fill="none" stroke="currentColor" stroke-width="1.5">
 <rect x="2" y="3" width="20" height="14" rx="2"/>
 <line x1="8" y1="21" x2="16" y2="21"/>
 <line x1="12" y1="17" x2="12" y2="21"/>
 </svg>
 <h3>Нет подключений</h3>
 <p>Добавьте первое подключение для быстрого доступа к удалённым рабочим столам</p>
 <button class="btn btn-primary btn-empty-add" onclick="openConnectionModal()">+ Добавить подключение</button>
 </div>
 `;
    return;
  }

  elements.connectionsList.innerHTML = filtered.map(conn => `
    <div class="connection-card" data-id="${conn.id}">
      <div class="connection-card-header">
        <span class="connection-type ${conn.type}">${getTypeLabel(conn.type)}</span>
        <div class="connection-actions">
          <button class="btn btn-icon" onclick="event.stopPropagation(); launchConnection('${conn.id}')" title="Подключиться">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <button class="btn btn-icon" onclick="event.stopPropagation(); editConnection('${conn.id}')" title="Редактировать">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-icon" onclick="event.stopPropagation(); deleteConnection('${conn.id}')" title="Удалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <h3 class="connection-name">${escapeHtml(conn.name)}</h3>
      <p class="connection-host">${escapeHtml(conn.host)}</p>
      ${conn.description ? `<p class="connection-description">${escapeHtml(conn.description)}</p>` : ''}
      <div class="connection-footer">
        <div class="connection-status">
          <span class="status-dot"></span>
          <span>Готово</span>
        </div>
      </div>
    </div>
  `).join('');
}

function getTypeLabel(type) {
  const labels = {
    rdp: 'RDP',
    horizon: 'Horizon',
    citrix: 'Citrix'
  };
  return labels[type] || type;
}

// ==================== Connection Modal ====================
function openConnectionModal(connectionId = null) {
  elements.editingConnectionId = connectionId;
  elements.modalTitle.textContent = connectionId ? 'Редактировать подключение' : 'Новое подключение';

  if (connectionId) {
    const conn = state.connections.find(c => c.id === connectionId);
    if (conn) {
      elements.connectionId.value = conn.id;
      elements.connectionType.value = conn.type;
      elements.connectionName.value = conn.name;
      elements.connectionHost.value = conn.host;
      elements.connectionPool.value = conn.desktopPool || '';
      elements.connectionUsername.value = conn.username || '';
      elements.connectionDescription.value = conn.description || '';
      elements.horizonFields.style.display = conn.type === 'horizon' ? 'block' : 'none';
    }
  } else {
    elements.connectionForm.reset();
    elements.connectionId.value = '';
    elements.horizonFields.style.display = 'none';
  }

  elements.connectionModal.classList.add('active');
}

function closeConnectionModal() {
  elements.connectionModal.classList.remove('active');
  elements.editingConnectionId = null;
}

async function saveConnection() {
  const connection = {
    id: elements.connectionId.value || Date.now().toString(),
    type: elements.connectionType.value,
    name: elements.connectionName.value.trim(),
    host: elements.connectionHost.value.trim(),
    desktopPool: elements.connectionPool.value.trim(),
    username: elements.connectionUsername.value.trim(),
    description: elements.connectionDescription.value.trim()
  };

  if (!connection.name || !connection.host) {
    showToast('Заполните обязательные поля', 'error');
    return;
  }

  try {
    await window.api.saveConnection(connection);
    state.connections = await window.api.getConnections();
    renderConnections();
    closeConnectionModal();
    showToast('Подключение сохранено', 'success');
  } catch (error) {
    console.error('Error saving connection:', error);
    showToast('Ошибка сохранения', 'error');
  }
}

async function editConnection(id) {
  openConnectionModal(id);
}

async function deleteConnection(id) {
  if (!confirm('Вы уверены, что хотите удалить это подключение?')) {
    return;
  }

  try {
    await window.api.deleteConnection(id);
    state.connections = await window.api.getConnections();
    renderConnections();
    showToast('Подключение удалено', 'success');
  } catch (error) {
    console.error('Error deleting connection:', error);
    showToast('Ошибка удаления', 'error');
  }
}

async function launchConnection(id) {
  const conn = state.connections.find(c => c.id === id);
  if (!conn) return;

  try {
    let result;
    switch (conn.type) {
      case 'rdp':
        result = await window.api.launchRdp(conn, state.settings);
        break;
      case 'horizon':
        result = await window.api.launchHorizon(conn, state.settings);
        break;
      case 'citrix':
        result = await window.api.launchCitrix(conn, state.settings);
        break;
    }

    if (result && result.success) {
      showToast('Клиент запущен', 'success');
    } else {
      showToast(result?.error || 'Ошибка запуска', 'error');
    }
  } catch (error) {
    console.error('Launch error:', error);
    showToast('Ошибка запуска клиента', 'error');
  }
}

// ==================== Profiles ====================
function renderProfiles() {
  if (state.profiles.length === 0) {
    elements.profilesList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <h3>Нет профилей</h3>
        <p>Создайте профиль для группировки подключений</p>
      </div>
    `;
    return;
  }

  elements.profilesList.innerHTML = state.profiles.map(profile => {
    const connectionCount = profile.connections ? profile.connections.length : 0;
    return `
      <div class="profile-card">
        <div class="profile-info">
          <h4>${escapeHtml(profile.name)}</h4>
          <p>${connectionCount} подключений</p>
        </div>
        <div class="profile-actions">
          <button class="btn btn-sm btn-secondary" onclick="launchProfile('${profile.id}')">Запустить все</button>
          <button class="btn btn-sm btn-icon" onclick="editProfile('${profile.id}')" title="Редактировать">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-icon" onclick="deleteProfile('${profile.id}')" title="Удалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Profile Modal
function openProfileModal(profileId = null) {
  elements.editingProfileId = profileId;
  elements.profileModalTitle.textContent = profileId ? 'Редактировать профиль' : 'Новый профиль';

  // Populate connections select
  elements.profileConnections.innerHTML = state.connections.map(conn =>
    `<option value="${conn.id}">${escapeHtml(conn.name)} (${getTypeLabel(conn.type)})</option>`
  ).join('');

  if (profileId) {
    const profile = state.profiles.find(p => p.id === profileId);
    if (profile) {
      elements.profileId.value = profile.id;
      elements.profileName.value = profile.name;
      const selectedConnections = profile.connections || [];
      Array.from(elements.profileConnections.options).forEach(option => {
        option.selected = selectedConnections.includes(option.value);
      });
    }
  } else {
    elements.profileForm.reset();
    elements.profileId.value = '';
  }

  elements.profileModal.classList.add('active');
}

function closeProfileModal() {
  elements.profileModal.classList.remove('active');
  elements.editingProfileId = null;
}

async function saveProfile() {
  const selectedConnections = Array.from(elements.profileConnections.selectedOptions).map(o => o.value);

  const profile = {
    id: elements.profileId.value || Date.now().toString(),
    name: elements.profileName.value.trim(),
    connections: selectedConnections
  };

  if (!profile.name) {
    showToast('Введите название профиля', 'error');
    return;
  }

  try {
    await window.api.saveProfile(profile);
    state.profiles = await window.api.getProfiles();
    renderProfiles();
    closeProfileModal();
    showToast('Профиль сохранён', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showToast('Ошибка сохранения', 'error');
  }
}

async function editProfile(id) {
  openProfileModal(id);
}

async function deleteProfile(id) {
  if (!confirm('Вы уверены, что хотите удалить этот профиль?')) {
    return;
  }

  try {
    await window.api.deleteProfile(id);
    state.profiles = await window.api.getProfiles();
    renderProfiles();
    showToast('Профиль удалён', 'success');
  } catch (error) {
    showToast('Ошибка удаления', 'error');
  }
}

async function launchProfile(id) {
  const profile = state.profiles.find(p => p.id === id);
  if (!profile || !profile.connections) return;

  for (const connId of profile.connections) {
    await launchConnection(connId);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// ==================== Settings ====================
function renderSettings() {
  const s = state.settings;

 // RDP
 if (s.rdp) {
 elements.rdpResolution.value = s.rdp.resolution || '1920x1080';
 elements.rdpColors.value = s.rdp.colorDepth || '32';
 elements.rdpMultimon.checked = !!s.rdp.multimon;
 elements.rdpClipboard.checked = s.rdp.clipboard !== false;
 elements.rdpDrives.checked = !!s.rdp.driveMapping;
 elements.rdpAdminSession.checked = !!s.rdp.useAdminSession;
 elements.rdpPromptCredentials.checked = s.rdp.promptCredentials !== false;
 elements.rdpStartFullscreen.checked = !!s.rdp.startFullScreen;
 elements.rdpSpan.checked = !!s.rdp.span;
 elements.rdpCustom.value = s.rdp.customFlags || '';
 }

  // Horizon
  if (s.horizon) {
    elements.horizonBroker.value = s.horizon.brokerUrl || '';
    elements.horizonPool.value = s.horizon.desktopPool || '';
    elements.horizonUsername.value = s.horizon.userName || '';
    elements.horizonDomain.value = s.horizon.domainName || '';
    elements.horizonOnce.checked = s.horizon.once !== false;
    elements.horizonNonInteractive.checked = !!s.horizon.nonInteractive;
    elements.horizonCustom.value = s.horizon.customFlags || '';
  }

  // Citrix
  if (s.citrix) {
    elements.citrixStore.value = s.citrix.storeUrl || '';
    elements.citrixResource.value = s.citrix.resourceName || '';
    elements.citrixCustom.value = s.citrix.customFlags || '';
  }

  // General
  if (s.general) {
    elements.generalTray.checked = s.general.minimizeToTray || false;
    elements.generalStart.checked = s.general.startMinimized || false;
  }
}

async function saveSettings() {
  const settings = {
 rdp: {
 resolution: elements.rdpResolution.value,
 colorDepth: elements.rdpColors.value,
 multimon: elements.rdpMultimon.checked,
 clipboard: elements.rdpClipboard.checked,
 driveMapping: elements.rdpDrives.checked,
 useAdminSession: elements.rdpAdminSession.checked,
 promptCredentials: elements.rdpPromptCredentials.checked,
 startFullScreen: elements.rdpStartFullscreen.checked,
 span: elements.rdpSpan.checked,
 customFlags: elements.rdpCustom.value
 },
 horizon: {
 brokerUrl: elements.horizonBroker.value,
 desktopPool: elements.horizonPool.value,
 userName: elements.horizonUsername.value,
 domainName: elements.horizonDomain.value,
 once: elements.horizonOnce.checked,
 nonInteractive: elements.horizonNonInteractive.checked,
 customFlags: elements.horizonCustom.value
 },
 citrix: {
 storeUrl: elements.citrixStore.value,
 resourceName: elements.citrixResource.value,
 customFlags: elements.citrixCustom.value
 },
    general: {
      minimizeToTray: elements.generalTray.checked,
      startMinimized: elements.generalStart.checked
    }
  };

  try {
    await window.api.saveSettings(settings);
    state.settings = settings;
    showToast('Настройки сохранены', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast('Ошибка сохранения настроек', 'error');
  }
}

// ==================== Utilities ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Make functions global for inline handlers
window.openConnectionModal = openConnectionModal;
window.editConnection = editConnection;
window.deleteConnection = deleteConnection;
window.launchConnection = launchConnection;
window.editProfile = editProfile;
window.deleteProfile = deleteProfile;
window.launchProfile = launchProfile;

// Initialize app
init();
