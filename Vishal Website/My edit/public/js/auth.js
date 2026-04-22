import { userStorage } from './utils.js';

// Check if already logged in
if (userStorage.isAuthenticated()) {
  window.location.href = 'dashboard.html';
}

// Handle Registration/Login Form
const registrationForm = document.getElementById('registration-form');

registrationForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Capture user details
  const userData = {
    name: document.getElementById('login-name').value.trim(),
    college: document.getElementById('login-college').value.trim(),
    course: document.getElementById('login-course').value.trim(),
    loginTime: new Date().toISOString()
  };
  
  // Save to localStorage
  userStorage.save(userData);
  
  // Redirect to dashboard
  window.location.href = 'dashboard.html';
});
