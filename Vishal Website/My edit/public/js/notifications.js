import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();
const userName = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'user');

// DOM Elements
const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const notificationsContainer = document.getElementById('notifications-container');
const unreadBadge = document.getElementById('unread-badge');
const markAllReadBtn = document.getElementById('mark-all-read-btn');

// State
let allNotifications = [];
let currentFilter = 'all';
let notificationsListener = null;

// Setup notifications listener
function setupNotificationsListener() {
  try {
    // Query user's clubs to track member joins
    const clubsQuery = query(
      collection(db, 'clubs'),
      where('createdBy', '==', userName)
    );

    notificationsListener = onSnapshot(clubsQuery, (snapshot) => {
      allNotifications = [];
      
      snapshot.forEach((doc) => {
        const clubData = doc.data();
        const clubId = doc.id;
        
        // Create notification for club creation
        allNotifications.push({
          id: `club-created-${clubId}`,
          type: 'club-created',
          clubName: clubData.name,
          clubType: clubData.type,
          timestamp: clubData.createdAt,
          read: true, // Mark club creation as read by default
          icon: 'fa-plus-circle',
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          message: `You created "${clubData.name}" club`
        });

        // Create notifications for each member
        if (clubData.members && clubData.members.length > 0) {
          clubData.members.forEach((member, index) => {
            const notificationId = `${clubId}-member-${index}-${member.joinedAt}`;
            
            allNotifications.push({
              id: notificationId,
              type: 'member-joined',
              clubName: clubData.name,
              clubId: clubId,
              memberName: member.name,
              memberEmail: member.email,
              memberPhone: member.phone,
              memberCourse: member.course,
              memberReason: member.reason,
              timestamp: member.joinedAt,
              read: checkIfRead(notificationId),
              icon: 'fa-user-plus',
              iconColor: 'text-indigo-500',
              bgColor: 'bg-indigo-50',
              message: `${member.name} joined your "${clubData.name}" club`
            });
          });
        }
      });

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });

      updateUnreadCount();
      displayNotifications();
      
      loading.style.display = 'none';
    });

  } catch (error) {
    console.error('Error setting up notifications listener:', error);
    loading.style.display = 'none';
    emptyState.style.display = 'block';
  }
}

// Check if notification is read (stored in localStorage)
function checkIfRead(notificationId) {
  const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
  return readNotifications.includes(notificationId);
}

// Mark notification as read
function markAsRead(notificationId) {
  const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
  if (!readNotifications.includes(notificationId)) {
    readNotifications.push(notificationId);
    localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
  }
  
  // Update notification in array
  const notification = allNotifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
  
  updateUnreadCount();
}

// Mark all as read
markAllReadBtn.addEventListener('click', () => {
  const readNotifications = allNotifications.map(n => n.id);
  localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
  
  allNotifications.forEach(n => n.read = true);
  
  updateUnreadCount();
  displayNotifications();
  
  // Show success message
  const btn = markAllReadBtn;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-check mr-1"></i>All Marked!';
  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 2000);
});

// Update unread count
function updateUnreadCount() {
  const unreadCount = allNotifications.filter(n => !n.read).length;
  
  if (unreadCount > 0) {
    unreadBadge.textContent = unreadCount;
    unreadBadge.classList.remove('hidden');
    markAllReadBtn.classList.remove('hidden');
  } else {
    unreadBadge.classList.add('hidden');
    markAllReadBtn.classList.add('hidden');
  }
}

// Display notifications
function displayNotifications() {
  let filteredNotifications = allNotifications;

  // Apply filter
  if (currentFilter === 'unread') {
    filteredNotifications = allNotifications.filter(n => !n.read);
  } else if (currentFilter !== 'all') {
    filteredNotifications = allNotifications.filter(n => n.type === currentFilter);
  }

  if (filteredNotifications.length === 0) {
    notificationsContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  notificationsContainer.style.display = 'block';
  emptyState.style.display = 'none';
  notificationsContainer.innerHTML = '';

  filteredNotifications.forEach(notification => {
    const notificationCard = createNotificationCard(notification);
    notificationsContainer.appendChild(notificationCard);
  });
}

// Create notification card
function createNotificationCard(notification) {
  const card = document.createElement('div');
  card.className = `notification-item bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 ${notification.read ? 'opacity-75' : 'border-l-4 border-indigo-500'}`;
  card.dataset.id = notification.id;

  const timeAgo = getTimeAgo(notification.timestamp);
  const formattedDate = formatDate(notification.timestamp);

  if (notification.type === 'member-joined') {
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-4 flex-1">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 ${notification.bgColor} rounded-full flex items-center justify-center">
              <i class="fas ${notification.icon} text-xl ${notification.iconColor}"></i>
            </div>
          </div>
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <h3 class="text-lg font-bold text-gray-900">${notification.message}</h3>
              ${!notification.read ? '<span class="bg-red-500 w-2 h-2 rounded-full"></span>' : ''}
            </div>
            <div class="space-y-2 mb-3">
              <p class="text-sm text-gray-600">
                <i class="fas fa-user mr-2 text-indigo-500"></i>
                <span class="font-semibold">Name:</span> ${notification.memberName}
              </p>
              <p class="text-sm text-gray-600">
                <i class="fas fa-envelope mr-2 text-indigo-500"></i>
                <span class="font-semibold">Email:</span> 
                <a href="mailto:${notification.memberEmail}" class="text-indigo-600 hover:underline">${notification.memberEmail}</a>
              </p>
              <p class="text-sm text-gray-600">
                <i class="fas fa-phone mr-2 text-indigo-500"></i>
                <span class="font-semibold">Phone:</span> 
                <a href="tel:+91${notification.memberPhone}" class="text-indigo-600 hover:underline">+91 ${notification.memberPhone}</a>
              </p>
              <p class="text-sm text-gray-600">
                <i class="fas fa-graduation-cap mr-2 text-indigo-500"></i>
                <span class="font-semibold">Course:</span> ${notification.memberCourse}
              </p>
              <div class="bg-gray-50 rounded-lg p-3 mt-2">
                <p class="text-sm text-gray-700">
                  <i class="fas fa-comment-dots mr-2 text-indigo-500"></i>
                  <span class="font-semibold">Why they joined:</span>
                </p>
                <p class="text-sm text-gray-600 mt-1 italic">"${notification.memberReason}"</p>
              </div>
            </div>
            <div class="flex items-center space-x-4 text-xs text-gray-500">
              <span title="${formattedDate}">
                <i class="far fa-clock mr-1"></i>${timeAgo}
              </span>
              <span>
                <i class="fas fa-tag mr-1"></i>${notification.clubName}
              </span>
            </div>
          </div>
        </div>
        <div class="flex flex-col space-y-2 ml-4">
          ${!notification.read ? `
            <button class="mark-read-btn text-indigo-600 hover:text-indigo-800 text-sm" data-id="${notification.id}">
              <i class="fas fa-check-circle mr-1"></i>Mark Read
            </button>
          ` : `
            <span class="text-green-600 text-sm">
              <i class="fas fa-check-circle mr-1"></i>Read
            </span>
          `}
          <a href="club-details.html?id=${notification.clubId}" class="text-indigo-600 hover:text-indigo-800 text-sm">
            <i class="fas fa-external-link-alt mr-1"></i>View Club
          </a>
        </div>
      </div>
    `;
  } else if (notification.type === 'club-created') {
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-4 flex-1">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 ${notification.bgColor} rounded-full flex items-center justify-center">
              <i class="fas ${notification.icon} text-xl ${notification.iconColor}"></i>
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-gray-900 mb-2">${notification.message}</h3>
            <p class="text-sm text-gray-600 mb-3">
              <i class="fas fa-tag mr-2"></i>
              <span class="font-semibold">Type:</span> ${notification.clubType}
            </p>
            <div class="flex items-center space-x-4 text-xs text-gray-500">
              <span title="${formattedDate}">
                <i class="far fa-clock mr-1"></i>${timeAgo}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Add click handler for mark as read buttons
  const markReadBtn = card.querySelector('.mark-read-btn');
  if (markReadBtn) {
    markReadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markAsRead(notification.id);
      displayNotifications();
    });
  }

  return card;
}

// Time ago helper
function getTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(timestamp);
}

// Filter tabs
const filterTabs = document.querySelectorAll('.filter-tab');
filterTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    // Update active state
    filterTabs.forEach(t => {
      t.classList.remove('active', 'bg-indigo-600', 'text-white');
      t.classList.add('text-gray-600', 'hover:bg-gray-100');
    });
    
    e.currentTarget.classList.add('active', 'bg-indigo-600', 'text-white');
    e.currentTarget.classList.remove('text-gray-600', 'hover:bg-gray-100');

    // Update filter and display
    currentFilter = e.currentTarget.dataset.filter;
    displayNotifications();
  });
});

// Style active tab initially
document.querySelector('.filter-tab.active').classList.add('bg-indigo-600', 'text-white');
document.querySelector('.filter-tab.active').classList.remove('text-gray-600');

// Cleanup
window.addEventListener('beforeunload', () => {
  if (notificationsListener) {
    notificationsListener();
  }
});

// Initialize
setupNotificationsListener();
