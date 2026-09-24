document.addEventListener('DOMContentLoaded', () => {
  const lockScreen = document.getElementById('lockScreen');
  const chatScreen = document.getElementById('chatScreen');
  const loginForm = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const loginError = document.getElementById('loginError');
  const adminSidebar = document.getElementById('adminSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const uploadsLink = document.getElementById('uploadsLink');
  const logoutButton = document.getElementById('logoutButton');
  const adminViews = document.querySelectorAll('.admin-view');
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-view]');
  const uploadForm = document.getElementById('uploadForm');
  const documentFile = document.getElementById('documentFile');
  const uploadStatus = document.getElementById('uploadStatus');
  const documentList = document.getElementById('documentList');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatSendButton = chatForm.querySelector('.send-btn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  const updateDialog = document.getElementById('updateDialog');
  const updateMessage = document.getElementById('updateMessage');
  const updateNow = document.getElementById('updateNow');
  const updateLater = document.getElementById('updateLater');
  const deleteDocDialog = document.getElementById('deleteDocDialog');
  const deleteDocMessage = document.getElementById('deleteDocMessage');
  const deleteDocCancel = document.getElementById('deleteDocCancel');
  const deleteDocConfirm = document.getElementById('deleteDocConfirm');
  const appVersion = window.EDVO_APP_VERSION || '1.1.0';
  const appVersionLabel = document.getElementById('appVersion');
  appVersionLabel.textContent = `Version ${appVersion}`;
  const releasesApi = 'https://api.github.com/repos/gieson-edvo/edvo-bot/releases/latest';
  const apiBase = 'https://bot.edvo-x.com/api';

  let currentSession = null;

  const compareVersions = (first, second) => {
    const firstParts = first.replace(/^v/i, '').split('.').map((part) => Number(part) || 0);
    const secondParts = second.replace(/^v/i, '').split('.').map((part) => Number(part) || 0);
    const length = Math.max(firstParts.length, secondParts.length);
    for (let index = 0; index < length; index += 1) {
      if ((firstParts[index] || 0) !== (secondParts[index] || 0)) {
        return (firstParts[index] || 0) > (secondParts[index] || 0) ? 1 : -1;
      }
    }
    return 0;
  };

  const signInButton = loginForm.querySelector('.unlock-btn');

  // Live updates: web-only releases are applied in place (no APK reinstall) when the
  // installed native shell is new enough. Without this call the plugin rolls back the bundle.
  const liveUpdater = window.Capacitor?.Plugins?.CapacitorUpdater;
  liveUpdater?.notifyAppReady().catch(() => {});

  // CI publishes the web bundle as edvo-bot-web-min-native-<version>.zip, where <version>
  // (from native-version.txt) is the oldest APK that can run it.
  const applyLiveUpdate = async (release) => {
    if (!liveUpdater) return false;
    const bundleAsset = (release.assets || []).find((asset) => /^edvo-bot-web-min-native-.+\.zip$/.test(asset.name));
    // The plugin refuses bundles without a SHA-256; GitHub reports it as "sha256:<hex>".
    const checksum = (bundleAsset?.digest || '').replace(/^sha256:/, '');
    if (!bundleAsset || !checksum) return false;
    const minNative = bundleAsset.name.match(/^edvo-bot-web-min-native-(.+)\.zip$/)[1];
    try {
      const { native } = await liveUpdater.current();
      if (compareVersions(native, minNative) < 0) return false;
      showLoading('Updating EDVO Bot…');
      const bundle = await liveUpdater.download({ url: bundleAsset.browser_download_url, version: release.tag_name.replace(/^v/i, ''), checksum });
      await liveUpdater.set({ id: bundle.id });
      return true;
    } catch {
      hideLoading();
      return false;
    }
  };

  const checkForAppUpdate = async () => {
    signInButton.disabled = true;
    signInButton.textContent = 'Checking for updates…';
    try {
      const response = await fetch(releasesApi, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const release = await response.json();
      if (compareVersions(release.tag_name || '', appVersion) <= 0) return;
      if (await applyLiveUpdate(release)) return;
      const apk = (release.assets || []).find((asset) => asset.name === 'edvo-bot.apk');
      if (!apk || !apk.browser_download_url) return;
      updateMessage.textContent = `Version ${release.tag_name.replace(/^v/i, '')} is available. Update to get the latest improvements.`;
      updateNow.href = apk.browser_download_url;
      updateDialog.classList.remove('hidden');
    } catch {
      // Updates are optional; a network failure must not block the app.
    } finally {
      signInButton.disabled = false;
      signInButton.textContent = 'Sign in →';
    }
  };

  checkForAppUpdate();

  updateLater.addEventListener('click', () => updateDialog.classList.add('hidden'));

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const renderDocuments = async () => {
    documentList.innerHTML = '<p class="empty-state">Loading…</p>';
    try {
      const response = await fetch(`${apiBase}/documents`, {
        headers: { Authorization: `Bearer ${currentSession.token}` },
      });
      if (!response.ok) throw new Error('Failed to load documents');
      const documents = await response.json();
      documentList.innerHTML = documents.length
        ? documents.map((document) => `<div class="document-row"><span class="document-name" title="${escapeHtml(document.name)}">${escapeHtml(document.name)}</span><div class="document-meta"><small>${document.size_kb} KB · Added to EDVO Bot's knowledge</small><button class="doc-delete-btn" type="button" data-id="${document.id}" data-name="${escapeHtml(document.name)}" aria-label="Delete ${escapeHtml(document.name)}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></div></div>`).join('')
        : '<p class="empty-state">No documents uploaded yet.</p>';
    } catch {
      documentList.innerHTML = '<p class="empty-state">Could not load documents. Check your connection and try again.</p>';
    }
  };

  const showAdminView = (viewId) => {
    adminViews.forEach((view) => view.classList.toggle('hidden', view.id !== viewId));
    sidebarLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === viewId));
  };

  let currentUserName = 'there';
  const scrollChatToLatest = () => {
    window.requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  };

  const formatMessageTimestamp = (date) => new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  const appendChatMessage = (role, message) => {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'assistant' ? 'assistant-row' : 'user-row'}`;
    if (role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'bot-avatar-small';
      row.appendChild(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'assistant' ? 'assistant-bubble' : 'user-bubble'}`;
    bubble.textContent = message;
    const messageContent = document.createElement('div');
    messageContent.className = `message-content ${role === 'assistant' ? 'assistant-content' : 'user-content'}`;
    const timestamp = document.createElement('time');
    timestamp.className = 'message-timestamp';
    const sentAt = new Date();
    timestamp.dateTime = sentAt.toISOString();
    timestamp.textContent = formatMessageTimestamp(sentAt);
    messageContent.append(bubble, timestamp);
    row.appendChild(messageContent);
    chatMessages.appendChild(row);
    scrollChatToLatest();
    return { row, bubble };
  };

  const showTypingIndicator = () => {
    const row = document.createElement('div');
    row.className = 'message-row assistant-row typing-message';
    const avatar = document.createElement('div');
    avatar.className = 'bot-avatar-small';
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.setAttribute('aria-label', 'EDVO.BOT is typing');
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      indicator.appendChild(dot);
    }
    row.append(avatar, indicator);
    chatMessages.appendChild(row);
    scrollChatToLatest();
    return row;
  };

  const typeBotReply = (message, onComplete) => {
    const { row, bubble } = appendChatMessage('assistant', '');
    bubble.classList.add('is-typing-reply');
    let characterIndex = 0;
    const typingInterval = window.setInterval(() => {
      characterIndex += 1;
      bubble.textContent = message.slice(0, characterIndex);
      scrollChatToLatest();
      if (characterIndex >= message.length) {
        window.clearInterval(typingInterval);
        bubble.classList.remove('is-typing-reply');
        onComplete();
      }
    }, 14);
  };

  const getDisplayName = (name, emailValue) => {
    if (name && !/^EDVO (Administrator|Employee)$/i.test(name)) return name.split(' ')[0];
    const firstName = emailValue.split('@')[0].split(/[._-]/)[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  let chatHistory = [];

  const quickActions = [
    {
      title: 'About EDVO.X',
      description: "Learn about our company, mission, and what we're building.",
      prompt: 'Tell me about EDVO.X — what you do, your mission, and your vision.',
      icon: '<path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18"/><path d="M3 22h18"/><path d="M10 7h1M13 7h1M10 11h1M13 11h1M10 15h1M13 15h1"/><path d="M10 22v-3h4v3"/>',
    },
    {
      title: 'Our Divisions',
      description: 'Explore EDVO.X OPS, AI, DEV, and IT, and the brands under each.',
      prompt: 'What are the divisions of EDVO.X, and what does each one do?',
      icon: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="9" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5M12 12v5"/>',
    },
    {
      title: 'Our Services',
      description: 'Website and mobile app development, AI automation, and BPO customer operations.',
      prompt: 'What services does EDVO.X offer, and how much does each one start at?',
      icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    },
    {
      title: 'Our Work',
      description: 'See the results we have delivered for our clients.',
      prompt: 'What results has EDVO.X delivered for its clients?',
      icon: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/><path d="M16 8h4v4"/>',
    },
    {
      title: 'Careers',
      description: 'See opportunities and how to join EDVO.X.',
      prompt: 'What career opportunities are open at EDVO.X, and how can I apply?',
      icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/>',
    },
    {
      title: 'Company Documents',
      description: 'Access important company documents.',
      prompt: 'Summarize the key company policies and documents I should know about.',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/>',
    },
    {
      title: 'Contact Us',
      description: 'Get the right contact information for your inquiry.',
      prompt: 'How can I contact EDVO.X, and how soon will I get a response?',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
    },
  ];

  const appendQuickActions = () => {
    const grid = document.createElement('div');
    grid.className = 'quick-actions';
    grid.innerHTML = quickActions.map((action, index) => `<button class="quick-action" type="button" data-index="${index}"><span class="quick-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${action.icon}</svg></span><span class="quick-action-copy"><strong>${action.title}</strong><small>${action.description}</small></span><span class="quick-action-arrow" aria-hidden="true">›</span></button>`).join('');
    chatMessages.appendChild(grid);
  };

  chatMessages.addEventListener('click', (event) => {
    const card = event.target.closest('.quick-action');
    if (!card || chatInput.disabled) return;
    chatInput.value = quickActions[card.dataset.index].prompt;
    chatForm.requestSubmit();
  });

  const startChat = (name, emailValue) => {
    currentUserName = getDisplayName(name, emailValue);
    chatMessages.replaceChildren();
    chatHistory = [];
    appendChatMessage('assistant', `Hi ${currentUserName}, what can I do for you today?`);
    appendQuickActions();
    chatInput.value = '';
  };

  const openChat = (session) => {
    lockScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    startChat(session.name, session.email);
    adminSidebar.classList.remove('hidden');
    sidebarToggle.classList.remove('hidden');
    uploadsLink.classList.toggle('hidden', session.role !== 'admin');
    if (session.role === 'admin') renderDocuments();
    showAdminView('chatView');
  };

  const showError = (message, field) => {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
    field.focus();
  };

  let isTransitioning = false;
  const showLoading = (message) => {
    isTransitioning = true;
    loadingText.textContent = message;
    loadingOverlay.classList.remove('hidden');
  };

  const hideLoading = () => {
    loadingOverlay.classList.add('hidden');
    isTransitioning = false;
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isTransitioning || signInButton.disabled) return;
    const emailValue = email.value.trim();
    if (!emailValue || !email.validity.valid) {
      showError('Enter a valid work email address.', email);
      return;
    }
    if (password.value.length < 6) {
      showError('Enter a password with at least 6 characters.', password);
      return;
    }
    loginError.classList.add('hidden');
    showLoading('Signing you in…');
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue.toLowerCase(), password: password.value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        hideLoading();
        showError(data.error || 'Account not found or password is incorrect.', password);
        return;
      }
      currentSession = data;
      window.setTimeout(() => {
        openChat(currentSession);
        hideLoading();
      }, 650);
    } catch {
      hideLoading();
      showError('Could not reach the server. Check your connection and try again.', password);
    }
  });

  passwordToggle.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    passwordToggle.classList.toggle('is-visible', isPassword);
    passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  [email, password].forEach((field) => field.addEventListener('input', () => {
    loginError.classList.add('hidden');
  }));

  sidebarToggle.addEventListener('click', () => {
    const isOpen = adminSidebar.classList.toggle('is-open');
    sidebarToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (event) => {
    const isMobileSidebar = window.matchMedia('(max-width: 640px)').matches;
    const clickedInsideSidebar = adminSidebar.contains(event.target);
    const clickedToggle = sidebarToggle.contains(event.target);
    if (isMobileSidebar && adminSidebar.classList.contains('is-open') && !clickedInsideSidebar && !clickedToggle) {
      adminSidebar.classList.remove('is-open');
      sidebarToggle.setAttribute('aria-expanded', 'false');
    }
  });

  sidebarLinks.forEach((link) => link.addEventListener('click', () => {
    showAdminView(link.dataset.view);
    adminSidebar.classList.remove('is-open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }));

  logoutButton.addEventListener('click', () => {
    if (isTransitioning) return;
    showLoading('Signing you out…');
    window.setTimeout(() => {
      currentSession = null;
      chatScreen.classList.add('hidden');
      lockScreen.classList.remove('hidden');
      adminSidebar.classList.add('hidden');
      adminSidebar.classList.remove('is-open');
      sidebarToggle.classList.add('hidden');
      sidebarToggle.setAttribute('aria-expanded', 'false');
      showAdminView('chatView');
      loginForm.reset();
      password.type = 'password';
      passwordToggle.classList.remove('is-visible');
      loginError.classList.add('hidden');
      hideLoading();
    }, 650);
  });

  const resizeChatInput = () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  };
  chatInput.addEventListener('input', resizeChatInput);

  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    appendChatMessage('user', message);
    chatInput.value = '';
    resizeChatInput();
    chatInput.disabled = true;
    chatSendButton.disabled = true;
    const typing = showTypingIndicator();
    const finishTurn = (replyText) => {
      typing.remove();
      typeBotReply(replyText, () => {
        chatInput.disabled = false;
        chatSendButton.disabled = false;
        chatInput.focus();
      });
    };
    try {
      const response = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.token}` },
        body: JSON.stringify({ message, history: chatHistory }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        finishTurn(data.error || 'Something went wrong reaching the assistant. Please try again.');
        return;
      }
      chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: data.reply });
      finishTurn(data.reply);
    } catch {
      finishTurn('Could not reach the assistant. Check your connection and try again.');
    }
  });

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = documentFile.files[0];
    if (!file) return;
    const uploadButton = uploadForm.querySelector('button[type="submit"]');
    uploadButton.disabled = true;
    uploadStatus.textContent = `Uploading ${file.name}…`;
    uploadStatus.classList.remove('hidden');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${apiBase}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentSession.token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        uploadStatus.textContent = data.error || 'Could not upload the document. Please try again.';
        return;
      }
      uploadForm.reset();
      uploadStatus.textContent = `${file.name} was added to EDVO Bot's knowledge base.`;
      renderDocuments();
    } catch {
      uploadStatus.textContent = 'Could not reach the server. Check your connection and try again.';
    } finally {
      uploadButton.disabled = false;
    }
  });

  let pendingDeleteId = null;

  documentList.addEventListener('click', (event) => {
    const button = event.target.closest('.doc-delete-btn');
    if (!button) return;
    pendingDeleteId = button.dataset.id;
    deleteDocMessage.textContent = `Delete "${button.dataset.name}"? This will remove it from EDVO Bot's knowledge and from the Google Drive folder.`;
    deleteDocDialog.classList.remove('hidden');
  });

  deleteDocCancel.addEventListener('click', () => {
    pendingDeleteId = null;
    deleteDocDialog.classList.add('hidden');
  });

  deleteDocConfirm.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    deleteDocConfirm.disabled = true;
    try {
      const response = await fetch(`${apiBase}/documents/${pendingDeleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${currentSession.token}` },
      });
      if (response.ok) renderDocuments();
    } finally {
      deleteDocConfirm.disabled = false;
      pendingDeleteId = null;
      deleteDocDialog.classList.add('hidden');
    }
  });
});
