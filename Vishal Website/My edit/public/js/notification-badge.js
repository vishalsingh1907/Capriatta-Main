import { db } from './firebase-config.js';
import { userStorage } from './utils.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const currentUser = userStorage.get();
if (!currentUser) {
    console.log('No user logged in');
} else {
    const userName = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'user');
    
    // Get badge elements
    const navBadge = document.getElementById('nav-notification-badge');
    const dropdownBadge = document.getElementById('dropdown-notification-badge');
    const notificationBtn = document.getElementById('notification-btn');

    if (navBadge) {
        const clubsQuery = query(
            collection(db, 'clubs'),
            where('createdBy', '==', userName)
        );

        onSnapshot(clubsQuery, (snapshot) => {
            let unreadCount = 0;
            const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');

            snapshot.forEach((doc) => {
                const clubData = doc.data();
                if (clubData.members && clubData.members.length > 0) {
                    clubData.members.forEach((member, index) => {
                        const notificationId = `${doc.id}-member-${index}-${member.joinedAt}`;
                        if (!readNotifications.includes(notificationId)) {
                            unreadCount++;
                        }
                    });
                }
            });

            // Update both badges
            if (unreadCount > 0) {
                const displayCount = unreadCount > 99 ? '99+' : unreadCount;
                
                // Nav badge
                navBadge.textContent = displayCount;
                navBadge.classList.remove('hidden');
                
                // Dropdown badge
                if (dropdownBadge) {
                    dropdownBadge.textContent = displayCount;
                    dropdownBadge.classList.remove('hidden');
                }
                
                // Ring the bell on new notification
                if (notificationBtn) {
                    const bellIcon = notificationBtn.querySelector('.fa-bell');
                    if (bellIcon) {
                        bellIcon.classList.remove('bell-ring');
                        setTimeout(() => {
                            bellIcon.classList.add('bell-ring');
                        }, 10);
                    }
                }
            } else {
                navBadge.classList.add('hidden');
                if (dropdownBadge) {
                    dropdownBadge.classList.add('hidden');
                }
            }
        });
    }
}
