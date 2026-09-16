document.addEventListener('DOMContentLoaded', () => {
  const lockScreen = document.getElementById('lockScreen');
  const chatScreen = document.getElementById('chatScreen');
  const loginForm = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const loginError = document.getElementById('loginError');

  const openChat = () => {
    lockScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
  };

  const showError = (message, field) => {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
    field.focus();
  };

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
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
    openChat();
  });

  passwordToggle.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    passwordToggle.textContent = isPassword ? 'Hide' : 'Show';
    passwordToggle.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  });

  [email, password].forEach((field) => field.addEventListener('input', () => {
    loginError.classList.add('hidden');
  }));
});
