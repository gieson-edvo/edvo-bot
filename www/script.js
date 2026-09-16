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
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
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
  const adminKey = 'edvoAdminAccounts';
  const employeeKey = 'edvoEmployeeAccounts';
  const documentKey = 'edvoKnowledgeDocuments';

  const defaultAdmin = { name: 'EDVO Administrator', email: 'admin@edvo.x', password: 'Admin123!' };
  const defaultEmployee = { name: 'EDVO Employee', email: 'employee@edvo.x', password: 'Employee123!' };
  const getAdmins = () => JSON.parse(localStorage.getItem(adminKey) || '[]');
  const saveAdmins = (admins) => localStorage.setItem(adminKey, JSON.stringify(admins));
  const getEmployees = () => JSON.parse(localStorage.getItem(employeeKey) || '[]');
  const saveEmployees = (employees) => localStorage.setItem(employeeKey, JSON.stringify(employees));
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

  const seedDefaultAccounts = () => {
    const admins = getAdmins();
    if (!admins.some((account) => account.email === defaultAdmin.email)) {
      saveAdmins([...admins, defaultAdmin]);
    }

    const employees = getEmployees();
    if (!employees.some((account) => account.email === defaultEmployee.email)) {
      saveEmployees([...employees, defaultEmployee]);
    }
  };

  seedDefaultAccounts();
  checkForAppUpdate();

  updateLater.addEventListener('click', () => updateDialog.classList.add('hidden'));

  const renderEmployees = () => {
    const employees = getEmployees();
    employeeList.innerHTML = employees.length
      ? employees.map((employee) => `<div class="employee-row"><span>${employee.name}</span><small>${employee.email}</small></div>`).join('')
      : '<p class="empty-employees">No employee accounts added yet.</p>';
  };

  const renderDocuments = () => {
    const documents = getDocuments();
    documentList.innerHTML = documents.length
      ? documents.map((document) => `<div class="document-row"><span>${document.name}</span><small>${document.size} KB · Waiting for cloud sync</small></div>`).join('')
      : '<p class="empty-employees">No documents uploaded yet.</p>';
  };

  const showAdminView = (viewId) => {
    adminViews.forEach((view) => view.classList.toggle('hidden', view.id !== viewId));
    sidebarLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === viewId));
    adminSidebar.classList.remove('is-open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
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

  const getDisplayName = (account, emailValue) => {
    if (account.name && !/^EDVO (Administrator|Employee)$/i.test(account.name)) return account.name.split(' ')[0];
    const firstName = emailValue.split('@')[0].split(/[._-]/)[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  const getFakeReply = (message) => {
    const question = message.toLowerCase();
    if (/\b(hi|hello|hey)\b/.test(question)) return `Hi ${currentUserName}! How can I help you with EDVO.X today?`;
    if (/mission|vision|story|about edvo/.test(question)) return 'EDVO.X connects people, ideas, and operations to help teams build a brighter tomorrow. This is a demo knowledge-base response.';
    if (/service|product|offer/.test(question)) return 'EDVO.X supports teams with connected operations, shared knowledge, and practical tools for everyday work.';
    if (/employee|account|password|login/.test(question)) return 'For employee access, an administrator can create an account from the Create employee section in the sidebar.';
    if (/upload|file|document|pdf/.test(question)) return 'Approved PDF documents can be added from Upload files. In this demo, uploaded file details are saved locally on the device.';
    return `Thanks, ${currentUserName}. I received your message. This demo chat replies using local sample data—try asking about EDVO.X, services, employee accounts, or uploads.`;
  };

  const startChat = (account, emailValue) => {
    currentUserName = getDisplayName(account, emailValue);
    chatMessages.replaceChildren();
    appendChatMessage('assistant', `Hi ${currentUserName}, what can I do for you today?`);
    chatInput.value = '';
  };

  const openChat = (role, account, emailValue) => {
    lockScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    startChat(account, emailValue);
    if (role === 'admin') {
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

  loginForm.addEventListener('submit', (event) => {
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
    const normalizedEmail = emailValue.toLowerCase();
    const accountGroups = [
      { role: 'admin', accounts: getAdmins() },
      { role: 'employee', accounts: getEmployees() },
    ];
    const match = accountGroups
      .map(({ role, accounts }) => ({ role, account: accounts.find((item) => item.email === normalizedEmail && item.password === password.value) }))
      .find(({ account }) => account);
    if (!match) {
      showError('Account not found or password is incorrect.', password);
      return;
    }
    loginError.classList.add('hidden');
    showLoading('Signing you in…');
    window.setTimeout(() => {
      openChat(match.role, match.account, emailValue);
      hideLoading();
    }, 650);
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

  sidebarLinks.forEach((link) => link.addEventListener('click', () => showAdminView(link.dataset.view)));

  logoutButton.addEventListener('click', () => {
    if (isTransitioning) return;
    showLoading('Signing you out…');
    window.setTimeout(() => {
      chatScreen.classList.add('hidden');
      lockScreen.classList.remove('hidden');
      adminSidebar.classList.add('hidden');
      adminSidebar.classList.remove('is-open');
      sidebarToggle.classList.add('hidden');
      sidebarToggle.setAttribute('aria-expanded', 'false');
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

  employeeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = employeeName.value.trim();
    const workEmail = employeeEmail.value.trim().toLowerCase();
    if (!name || !employeeEmail.validity.valid || employeePassword.value.length < 6) {
      adminError.textContent = 'Enter a name, valid work email, and 6+ character password.';
      adminError.classList.remove('hidden');
      return;
    }
    const employees = getEmployees();
    if (employees.some((employee) => employee.email === workEmail)) {
      adminError.textContent = 'That employee email already exists.';
      adminError.classList.remove('hidden');
      return;
    }
    employees.push({ name, email: workEmail, password: employeePassword.value });
    saveEmployees(employees);
    employeeForm.reset();
    adminError.classList.add('hidden');
    renderEmployees();
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
