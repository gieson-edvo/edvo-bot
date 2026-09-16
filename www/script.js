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
  const logoutButton = document.getElementById('logoutButton');
  const adminViews = document.querySelectorAll('.admin-view');
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-view]');
  const employeeMenuToggle = document.getElementById('employeeMenuToggle');
  const employeeSubmenu = document.getElementById('employeeSubmenu');
  const employeeForm = document.getElementById('employeeForm');
  const employeeName = document.getElementById('employeeName');
  const employeeEmail = document.getElementById('employeeEmail');
  const employeePassword = document.getElementById('employeePassword');
  const employeeList = document.getElementById('employeeList');
  const adminError = document.getElementById('adminError');
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
  const appVersion = window.EDVO_APP_VERSION || '1.1.0';
  const appVersionLabel = document.getElementById('appVersion');
  appVersionLabel.textContent = `Version ${appVersion}`;
  const releasesApi = 'https://api.github.com/repos/gieson-edvo/edvo-bot/releases/latest';
  const apiBase = 'https://bot.edvo-x.com/api';
  const documentKey = 'edvoKnowledgeDocuments';

  let currentSession = null;
  const getDocuments = () => JSON.parse(localStorage.getItem(documentKey) || '[]');
  const saveDocuments = (documents) => localStorage.setItem(documentKey, JSON.stringify(documents));

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

  const renderEmployees = async () => {
    employeeList.innerHTML = '<p class="empty-employees">Loading…</p>';
    try {
      const response = await fetch(`${apiBase}/employees`, {
        headers: { Authorization: `Bearer ${currentSession.token}` },
      });
      if (!response.ok) throw new Error('Failed to load employees');
      const employees = await response.json();
      employeeList.innerHTML = employees.length
        ? employees.map((employee) => `<div class="employee-row"><span>${employee.name}</span><small>${employee.email}</small></div>`).join('')
        : '<p class="empty-employees">No employee accounts added yet.</p>';
    } catch {
      employeeList.innerHTML = '<p class="empty-employees">Could not load employees. Check your connection and try again.</p>';
    }
  };

  const renderDocuments = () => {
    const documents = getDocuments();
    documentList.innerHTML = documents.length
      ? documents.map((document) => `<div class="document-row"><span>${document.name}</span><small>${document.size} KB · Waiting for cloud sync</small></div>`).join('')
      : '<p class="empty-employees">No documents uploaded yet.</p>';
  };

  const employeeViewIds = ['employeesView', 'employeeListView'];

  const showAdminView = (viewId) => {
    adminViews.forEach((view) => view.classList.toggle('hidden', view.id !== viewId));
    sidebarLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === viewId));
    employeeMenuToggle.classList.toggle('active', employeeViewIds.includes(viewId));
    if (employeeViewIds.includes(viewId)) {
      employeeSubmenu.classList.remove('hidden');
      employeeMenuToggle.setAttribute('aria-expanded', 'true');
    }
    adminSidebar.classList.remove('is-open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  };

  employeeMenuToggle.addEventListener('click', () => {
    const isOpen = employeeSubmenu.classList.toggle('hidden') === false;
    employeeMenuToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) showAdminView('employeesView');
  });

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

  const findKnowledgeAnswer = (question) => {
    const knowledge = window.EDVO_KNOWLEDGE || [];
    let best = null;
    let bestScore = 0;
    knowledge.forEach((entry) => {
      const score = entry.keywords.reduce((total, keyword) => (question.includes(keyword) ? total + keyword.length : total), 0);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });
    return best ? best.answer : null;
  };

  const getFakeReply = (message) => {
    const question = message.toLowerCase();
    if (/\b(hi|hello|hey)\b/.test(question)) return `Hi ${currentUserName}! How can I help you with EDVO.X today?`;
    if (/employee|account|password|login/.test(question)) return 'For employee access, an administrator can create an account from the Create employee section in the sidebar.';
    if (/upload|file|document|pdf/.test(question)) return 'Approved PDF documents can be added from Upload files. In this demo, uploaded file details are saved locally on the device.';
    const knowledgeAnswer = findKnowledgeAnswer(question);
    if (knowledgeAnswer) return knowledgeAnswer;
    return `Thanks, ${currentUserName}. I received your message. Try asking about EDVO.X's mission, services, pricing, careers, or how to get in touch.`;
  };

  const startChat = (name, emailValue) => {
    currentUserName = getDisplayName(name, emailValue);
    chatMessages.replaceChildren();
    appendChatMessage('assistant', `Hi ${currentUserName}, what can I do for you today?`);
    chatInput.value = '';
  };

  const openChat = (session) => {
    lockScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    startChat(session.name, session.email);
    if (session.role === 'admin') {
      renderEmployees();
      renderDocuments();
      adminSidebar.classList.remove('hidden');
      sidebarToggle.classList.remove('hidden');
      showAdminView('chatView');
    }
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
    if (link.dataset.view === 'employeeListView') renderEmployees();
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

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    appendChatMessage('user', message);
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendButton.disabled = true;
    const typing = showTypingIndicator();
    window.setTimeout(() => {
      typing.remove();
      typeBotReply(getFakeReply(message), () => {
        chatInput.disabled = false;
        chatSendButton.disabled = false;
        chatInput.focus();
      });
    }, 600);
  });

  employeeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = employeeName.value.trim();
    const workEmail = employeeEmail.value.trim().toLowerCase();
    if (!name || !employeeEmail.validity.valid || employeePassword.value.length < 6) {
      adminError.textContent = 'Enter a name, valid work email, and 6+ character password.';
      adminError.classList.remove('hidden');
      return;
    }
    try {
      const response = await fetch(`${apiBase}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.token}` },
        body: JSON.stringify({ name, email: workEmail, password: employeePassword.value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        adminError.textContent = data.error || 'Could not create the employee account.';
        adminError.classList.remove('hidden');
        return;
      }
      employeeForm.reset();
      adminError.classList.add('hidden');
      renderEmployees();
    } catch {
      adminError.textContent = 'Could not reach the server. Check your connection and try again.';
      adminError.classList.remove('hidden');
    }
  });

  uploadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const file = documentFile.files[0];
    if (!file) return;
    const documents = getDocuments();
    documents.push({ name: file.name, size: Math.max(1, Math.round(file.size / 1024)) });
    saveDocuments(documents);
    uploadForm.reset();
    uploadStatus.textContent = `${file.name} is saved in the app queue. Connect the secure Google Drive backend to sync it to cloud storage.`;
    uploadStatus.classList.remove('hidden');
    renderDocuments();
  });
});
