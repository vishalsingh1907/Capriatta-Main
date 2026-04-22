import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { collection, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}


const currentUser = userStorage.get();


// DOM Elements
const clubsGrid = document.getElementById('clubs-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');


// Store all clubs for filtering
let allClubs = [];
let myClubs = [];


// Store listener unsubscribes
let clubsListener = null;
let myClubsListener = null;


// Get user's college safely
const userCollege = (currentUser.college || '').toLowerCase().trim();


// ===== DOWNLOAD BUTTON SETUP =====
function setupDownloadButton() {
  const downloadBtn = document.getElementById('download-clubs-btn');
  const myClubsCount = document.getElementById('my-clubs-count');

  console.log('🔧 Setting up download button...');
  console.log('Download button found:', !!downloadBtn);
  console.log('My clubs count:', myClubs.length);

  if (downloadBtn) {
    // Add click listener
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('📥 Download button clicked');
      downloadMyClubs();
    });

    // Update count when myClubs changes
    if (myClubs.length > 0) {
      if (myClubsCount) {
        myClubsCount.textContent = myClubs.length;
        myClubsCount.classList.remove('hidden');
        console.log('✅ Badge updated:', myClubs.length);
      }
    } else {
      if (myClubsCount) {
        myClubsCount.classList.add('hidden');
      }
    }
  } else {
    console.warn('⚠️ Download button not found in HTML');
  }
}


// Fetch and render clubs with real-time listener
function setupClubsListener() {
  loadingIndicator.style.display = 'block';
  clubsGrid.style.display = 'none';
  emptyState.style.display = 'none';
  clubsGrid.innerHTML = '';

  try {
    const q = query(collection(db, 'clubs'), orderBy("createdAt", "desc"));
    
    // Use onSnapshot for real-time updates instead of getDocs
    clubsListener = onSnapshot(q, 
      (querySnapshot) => {
        loadingIndicator.style.display = 'none';

        if (querySnapshot.empty) {
          console.log('No clubs found in database');
          emptyState.style.display = 'block';
          clubsGrid.style.display = 'none';
          allClubs = [];
          return;
        }

        allClubs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          allClubs.push({ 
            id: doc.id, 
            ...data,
            // Ensure consistent field names
            memberCount: data.members ? data.members.length : 0
          });
        });

        console.log(`Loaded ${allClubs.length} clubs from database (real-time)`);

        displayClubs(allClubs);
        setupMyClubsListener();
      },
      (error) => {
        console.error("Error fetching clubs:", error);
        loadingIndicator.style.display = 'none';

        clubsGrid.innerHTML = `
          <div class="col-span-full text-center py-12 bg-red-50 rounded-2xl border-2 border-red-200">
            <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
            <p class="text-red-600 font-semibold mb-4">Error loading clubs</p>
            <p class="text-red-500 text-sm mb-4">${error.message}</p>
            <button onclick="location.reload()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <i class="fas fa-redo mr-2"></i>Retry
            </button>
          </div>
        `;
        clubsGrid.style.display = 'grid';
      }
    );
  } catch (error) {
    console.error("Error setting up listener:", error);
    loadingIndicator.style.display = 'none';
  }
}


// Display clubs in grid - UPDATED to sort by college match
function displayClubs(clubs) {
  clubsGrid.innerHTML = '';

  if (clubs.length === 0) {
    emptyState.style.display = 'block';
    clubsGrid.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  clubsGrid.style.display = 'grid';

  // Sort clubs: user's college first, others after
  const sortedClubs = [...clubs].sort((a, b) => {
    const aCollege = (a.college || '').toLowerCase().trim();
    const bCollege = (b.college || '').toLowerCase().trim();

    const aIsMyCollege = aCollege === userCollege;
    const bIsMyCollege = bCollege === userCollege;

    if (aIsMyCollege && !bIsMyCollege) return -1;
    if (!aIsMyCollege && bIsMyCollege) return 1;
    return 0;
  });

  sortedClubs.forEach(club => {
    const card = createClubCard(club);
    clubsGrid.appendChild(card);
  });
}


// Check if user has created clubs with real-time listener
function setupMyClubsListener() {
  try {
    const userName = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'user');

    const q = query(
      collection(db, 'clubs'), 
      where("createdBy", "==", userName)
    );
    
    // Remove previous listener if exists
    if (myClubsListener) {
      myClubsListener();
    }
    
    // Setup real-time listener for user's clubs
    myClubsListener = onSnapshot(q, 
      (querySnapshot) => {
        myClubs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          myClubs.push({ 
            id: doc.id, 
            ...data,
            memberCount: data.members ? data.members.length : 0
          });
        });

        console.log('✅ My clubs updated:', myClubs.length);
        console.log('My clubs data:', myClubs);

        // Update download button
        setupDownloadButton();
      },
      (error) => {
        console.error("Error checking user clubs:", error);
      }
    );
  } catch (error) {
    console.error("Error setting up my clubs listener:", error);
  }
}


// Download user's clubs as XLSX (Excel)
function downloadMyClubs() {
  console.log('🔍 downloadMyClubs called');
  console.log('myClubs count:', myClubs.length);
  console.log('myClubs data:', myClubs);

  if (myClubs.length === 0) {
    console.warn('⚠️ No clubs to download');
    alert('❌ No clubs to download');
    return;
  }

  // Check if SheetJS library is loaded
  if (typeof XLSX === 'undefined') {
    console.error('❌ XLSX library not loaded');
    alert('❌ Excel library not loaded. Please refresh the page.');
    return;
  }

  console.log('✅ XLSX library loaded, starting export...');

  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // ===== SHEET 1: Club Summary =====
    const clubSummaryData = [
      ['Club Name', 'Type', 'College', 'Mission', 'Members Count', 'Created Date', 'Contact Email', 'Contact Phone']
    ];

    myClubs.forEach(club => {
      clubSummaryData.push([
        club.name || 'Untitled',
        club.type || club.clubType || '',
        club.college || '',
        club.mission || club.description || '',
        club.memberCount || 0,
        formatDate(club.createdAt),
        club.email || 'N/A',
        club.phone || club.phoneNumber || 'N/A'
      ]);
    });

    const clubSummarySheet = XLSX.utils.aoa_to_sheet(clubSummaryData);
    
    // Set column widths for better readability
    clubSummarySheet['!cols'] = [
      { wch: 25 },  // Club Name
      { wch: 15 },  // Type
      { wch: 20 },  // College
      { wch: 35 },  // Mission
      { wch: 15 },  // Members Count
      { wch: 15 },  // Created Date
      { wch: 25 },  // Contact Email
      { wch: 15 }   // Contact Phone
    ];

    XLSX.utils.book_append_sheet(workbook, clubSummarySheet, "Club Summary");

    // ===== SHEET 2: Members Details =====
    const membersData = [
      ['Club Name', 'Member Name', 'Email', 'Phone', 'Course', 'Why Joined', 'Join Date']
    ];

    myClubs.forEach(club => {
      if (club.members && club.members.length > 0) {
        club.members.forEach(member => {
          membersData.push([
            club.name || 'Untitled',
            member.name || member.yourName || 'N/A',
            member.email || 'N/A',
            member.phone || member.phoneNumber || 'N/A',
            member.course || 'N/A',
            member.reason || member.whyJoin || 'N/A',
            formatDate(member.joinedAt || member.timestamp)
          ]);
        });
      }
    });

    const membersSheet = XLSX.utils.aoa_to_sheet(membersData);
    
    // Set column widths
    membersSheet['!cols'] = [
      { wch: 25 },  // Club Name
      { wch: 20 },  // Member Name
      { wch: 25 },  // Email
      { wch: 15 },  // Phone
      { wch: 20 },  // Course
      { wch: 35 },  // Why Joined
      { wch: 15 }   // Join Date
    ];

    XLSX.utils.book_append_sheet(workbook, membersSheet, "Members Details");

    // ===== SHEET 3: Statistics =====
    const totalMembers = myClubs.reduce((sum, club) => sum + (club.memberCount || 0), 0);
    
    const statsData = [
      ['Club Statistics'],
      [],
      ['Metric', 'Value'],
      ['Total Clubs', myClubs.length],
      ['Total Members', totalMembers],
      ['Average Members per Club', totalMembers > 0 ? (totalMembers / myClubs.length).toFixed(2) : 0],
      ['Export Date', new Date().toLocaleDateString('en-IN')],
      ['Export Time', new Date().toLocaleTimeString('en-IN')],
      [],
      ['Club-wise Member Breakdown'],
      ['Club Name', 'Member Count', 'College']
    ];

    myClubs.forEach(club => {
      statsData.push([
        club.name || 'Untitled',
        club.memberCount || 0,
        club.college || 'N/A'
      ]);
    });

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    
    // Set column widths
    statsSheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(workbook, statsSheet, "Statistics");

    // Generate filename
    const userName = currentUser.name || 'user';
    const filename = `my_clubs_${userName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write the workbook
    XLSX.writeFile(workbook, filename);

    console.log('✅ Excel file exported successfully:', filename);
    alert('✅ Excel file downloaded successfully!');

  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    alert('❌ Error exporting to Excel: ' + error.message);
  }
}


// Create club card - UPDATED with member count and phone
function createClubCard(club) {
  const card = document.createElement('div');

  // Safely get username
  const userName = currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : '');
  const isMyClub = club.createdBy === userName;

  // Check if club is from user's college
  const clubCollege = (club.college || '').toLowerCase().trim();
  const isMyCollege = clubCollege === userCollege;

  // Different styling for other colleges
  const cardStyle = isMyCollege 
    ? `bg-white p-6 rounded-2xl shadow-lg border ${isMyClub ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-gray-100'} hover:shadow-xl transition-all duration-300 flex flex-col`
    : `bg-gray-100 p-6 rounded-2xl shadow border border-gray-300 opacity-60 flex flex-col pointer-events-none`;

  card.className = cardStyle;

  const clubType = club.type || club.clubType || 'Club';
  const memberCount = club.memberCount || 0;

  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center space-x-2">
        <span class="${isMyCollege ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'} text-xs font-bold px-3 py-1 rounded-full">${clubType}</span>
        ${isMyClub ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Your Club</span>' : ''}
        ${!isMyCollege ? '<span class="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">Other College</span>' : ''}
      </div>
      <span class="text-gray-400 text-xs">${formatDate(club.createdAt)}</span>
    </div>

    <h3 class="text-xl font-bold ${isMyCollege ? 'text-gray-900' : 'text-gray-500'} mb-1">${truncate(club.name || 'Untitled Club', 40)}</h3>
    <p class="text-xs text-gray-500 mb-4">by ${club.createdBy || 'Unknown'} • ${club.college || 'N/A'}</p>

    <div class="space-y-2 mb-4 flex-grow">
      <p class="text-sm ${isMyCollege ? 'text-gray-600' : 'text-gray-400'} line-clamp-3">${truncate(club.mission || club.description || 'No description provided', 120)}</p>
    </div>

    <div class="flex items-center justify-between mb-4 text-xs ${isMyCollege ? 'text-gray-600' : 'text-gray-400'}">
      <div class="flex items-center space-x-1">
        <i class="fas fa-users"></i>
        <span>${memberCount} ${memberCount === 1 ? 'Member' : 'Members'}</span>
      </div>
      ${club.phone || club.phoneNumber ? `
        <div class="flex items-center space-x-1">
          <i class="fas fa-phone"></i>
          <span>${club.phone || club.phoneNumber}</span>
        </div>
      ` : ''}
    </div>

    ${isMyCollege ? `
      <button class="view-join-btn block w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all">
        <i class="fas fa-user-plus mr-2"></i>View & Join
      </button>
    ` : `
      <button class="block w-full text-center py-3 rounded-xl border-2 border-gray-400 text-gray-500 text-sm font-bold cursor-not-allowed" disabled>
        <i class="fas fa-lock mr-2"></i>Different College
      </button>
    `}
  `;

  // Add click handler only for user's college clubs
  if (isMyCollege) {
    const btn = card.querySelector('.view-join-btn');
    btn.addEventListener('click', () => {
      window.location.href = `club-details.html?id=${club.id}`;
    });
  }

  return card;
}


// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', filterClubs);
}

if (filterType) {
  filterType.addEventListener('change', filterClubs);
}


// Filter clubs
function filterClubs() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const typeFilter = filterType ? filterType.value : 'all';

  const filtered = allClubs.filter(club => {
    const matchesSearch = 
      (club.name && club.name.toLowerCase().includes(searchTerm)) ||
      (club.mission && club.mission.toLowerCase().includes(searchTerm)) ||
      (club.description && club.description.toLowerCase().includes(searchTerm)) ||
      (club.college && club.college.toLowerCase().includes(searchTerm)) ||
      (club.createdBy && club.createdBy.toLowerCase().includes(searchTerm));

    const clubTypeValue = club.type || club.clubType || '';
    const matchesType = typeFilter === 'all' || clubTypeValue === typeFilter;

    return matchesSearch && matchesType;
  });

  displayClubs(filtered);
}


// Helper
function truncate(text, maxLength) {
  if (!text) return 'N/A';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}


// Initialize
function init() {
  console.log('🚀 Initializing browse-clubs...');
  setupDownloadButton();
  setupClubsListener();
}


// Cleanup listeners on page unload
window.addEventListener('beforeunload', () => {
  if (clubsListener) clubsListener();
  if (myClubsListener) myClubsListener();
});


init();
