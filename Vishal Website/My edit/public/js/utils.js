// User management utilities
export const userStorage = {
  save(userData) {
    localStorage.setItem('capriattaUser', JSON.stringify(userData));
  },
  
  get() {
    const data = localStorage.getItem('capriattaUser');
    return data ? JSON.parse(data) : null;
  },
  
  clear() {
    localStorage.removeItem('capriattaUser');
  },
  
  isAuthenticated() {
    return this.get() !== null;
  }
};

// Redirect to login if not authenticated
export function requireAuth() {
  if (!userStorage.isAuthenticated()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// Format date helper
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
