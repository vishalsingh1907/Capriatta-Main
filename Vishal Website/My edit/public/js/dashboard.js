import { userStorage } from './utils.js';

// Check authentication
const currentUser = userStorage.get();

if (!currentUser) {
  window.location.href = 'index.html';
} else {
  // Display user greeting
  const firstName = currentUser.name.split(' ')[0];
  document.getElementById('user-greeting').innerText = firstName;
}

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    userStorage.clear();
    window.location.href = 'index.html';
  }
});
