import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let myClubs = []; // Store user's own clubs

// Fetch and render clubs
async function fetchAndRenderClubs() {
  // Show loading, hide everything else
  loadingIndicator.style.display = 'block';
  clubsGrid.style.display = 'none';
  emptyState.style.display = 'none';
  clubsGrid.innerHTML = '';

  try {
    const q = query(collection(db, 'clubs'), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    // Hide loading
    loadingIndicator.style.display = 'none';

    // Check if there are NO clubs at all
    if (querySnapshot.empty) {
      console.log('No clubs found in database');
      emptyState.style.display = 'block';
      clubsGrid.style.display = 'none';
      return;
    }

    // Store all clubs
    allClubs = [];
    querySnapshot.forEach((doc) => {
      allClubs.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Loaded ${allClubs.length} clubs from database`);

    // Display clubs
    displayClubs(allClubs);

    // Check user's own clubs for download button
    checkUserClubs();

  } catch (error) {
    console.error("Error fetching clubs:", error);
    loadingIndicator.style.display = 'none';

    // Show error message in grid
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
}

// Display clubs in grid
function displayClubs(clubs) {
  clubsGrid.innerHTML = '';

  // If no clubs after filtering, show empty state
  if (clubs.length === 0) {
    emptyState.style.display = 'block';
    clubsGrid.style.display = 'none';
    return;
  }

  // Hide empty state and show grid
  emptyState.style.display = 'none';
  clubsGrid.style.display = 'grid';

  // Create cards for each club
  clubs.forEach(club => {
    const card = createClubCard(club);
    clubsGrid.appendChild(card);
  });
}

// Check if user has created clubs and show download button
async function checkUserClubs() {
  try {
    const userName = currentUser.name || currentUser.email.split('@')[0];
    const q = query(
      collection(db, 'clubs'), 
      where("createdBy", "==", userName),
      where("email", "==", currentUser.email)
    );
    const querySnapshot = await getDocs(q);

    myClubs = [];
    querySnapshot.forEach((doc) => {
      myClubs.push({ id: doc.id, ...doc.data() });
    });

    // Show download button if user has clubs
    if (myClubs.length > 0) {
      addDownloadButton();
    }
  } catch (error) {
    console.error("Error checking user clubs:", error);
  }
}

// Add download button to the page
function addDownloadButton() {
  const nav = document.querySelector('nav .flex.items-center.space-x-4');

  // Check if button already exists
  if (document.getElementById('download-clubs-btn')) return;

  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-clubs-btn';
  downloadBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all';
  downloadBtn.innerHTML = `
    <i class="fas fa-download"></i>
    <span class="font-medium">My Clubs (${myClubs.length})</span>
  `;
  downloadBtn.onclick = downloadMyClubs;

  // Insert before the "Create Club" button
  nav.insertBefore(downloadBtn, nav.firstChild);
}

// Download user's clubs as Excel (CSV format)
function downloadMyClubs() {
  if (myClubs.length === 0) {
    alert('No clubs to download');
    return;
  }

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Headers
  csvContent += "Club Name,Type,College,Mission,Members,Created Date,Join Form,Email\n";

  // Data rows
  myClubs.forEach(club => {
    const row = [
      escapeCSV(club.name || 'Untitled'),
      escapeCSV(club.type || club.clubType || ''),
      escapeCSV(club.college || ''),
      escapeCSV(club.mission || club.description || ''),
      club.members || '0',
      formatDate(club.createdAt),
      escapeCSV(club.joinForm || club.gform || ''),
      escapeCSV(club.email || '')
    ].join(',');
    csvContent += row + "\n";
  });

  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `my_clubs_${currentUser.name || 'user'}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Escape CSV special characters
function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  const stringified = String(str);
  if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
    return '"' + stringified.replace(/"/g, '""') + '"';
  }
  return stringified;
}

// Create club card element
function createClubCard(club) {
  const card = document.createElement('div');
  const userName = currentUser.name || currentUser.email.split('@')[0];
  const isMyClub = club.createdBy === userName && club.email === currentUser.email;

  card.className = `bg-white p-6 rounded-2xl shadow-lg border ${isMyClub ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-gray-100'} hover:shadow-xl transition-all duration-300 flex flex-col`;

  // Get club type
  const clubType = club.type || club.clubType || 'Club';

  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center space-x-2">
        <span class="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">${clubType}</span>
        ${isMyClub ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Your Club</span>' : ''}
      </div>
      <span class="text-gray-400 text-xs">${formatDate(club.createdAt)}</span>
    </div>

    <h3 class="text-xl font-bold text-gray-900 mb-1">${truncate(club.name || 'Untitled Club', 40)}</h3>
    <p class="text-xs text-gray-500 mb-4">by ${club.createdBy || 'Unknown'} • ${club.college || 'N/A'}</p>

    <div class="space-y-2 mb-6 flex-grow">
      <p class="text-sm text-gray-600 line-clamp-3">${truncate(club.mission || club.description || 'No description provided', 120)}</p>
      ${club.members ? `
        <div class="flex items-center text-sm text-gray-600 mt-3">
          <i class="fas fa-users text-indigo-500 mr-2"></i>
          <span class="font-semibold">${club.members} members</span>
        </div>
      ` : ''}
    </div>

    ${club.joinForm || club.gform ? `
      <a href="${club.joinForm || club.gform}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all">
        <i class="fas fa-user-plus mr-2"></i>Join Club
      </a>
    ` : `
      <button class="block w-full text-center py-3 rounded-xl border-2 border-gray-300 text-gray-500 text-sm font-bold cursor-not-allowed" title="No join form available">
        Membership Closed
      </button>
    `}
  `;

  return card;
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', () => {
    filterClubs();
  });
}

// Filter functionality
if (filterType) {
  filterType.addEventListener('change', () => {
    filterClubs();
  });
}

// Filter clubs based on search and type
function filterClubs() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const typeFilter = filterType ? filterType.value : 'all';

  const filtered = allClubs.filter(club => {
    const matchesSearch = 
      (club.name && club.name.toLowerCase().includes(searchTerm)) ||
      (club.mission && club.mission.toLowerCase().includes(searchTerm)) ||
      (club.description && club.description.toLowerCase().includes(searchTerm)) ||
      (club.college && club.college.toLowerCase().includes(searchTerm)) ||
      (club.createdBy && club.createdBy.toLowerCase().includes(searchTerm)) ||
      (club.type && club.type.toLowerCase().includes(searchTerm)) ||
      (club.clubType && club.clubType.toLowerCase().includes(searchTerm));

    const clubTypeValue = club.type || club.clubType || '';
    const matchesType = typeFilter === 'all' || clubTypeValue === typeFilter;

    return matchesSearch && matchesType;
  });

  displayClubs(filtered);
}

// Helper: Truncate text
function truncate(text, maxLength) {
  if (!text) return 'N/A';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Initialize
async function init() {
  await fetchAndRenderClubs();
}

init();