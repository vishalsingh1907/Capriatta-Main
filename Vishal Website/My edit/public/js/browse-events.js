import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();

// DOM Elements
const eventsGrid = document.getElementById('events-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');

// Store all events for filtering
let allEvents = [];

// Fetch and render events
async function fetchAndRenderEvents() {
  loadingIndicator.classList.remove('hidden');
  eventsGrid.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    const q = query(collection(db, 'events'), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    loadingIndicator.classList.add('hidden');

    if (querySnapshot.empty) {
      emptyState.classList.remove('hidden');
      return;
    }

    allEvents = [];
    querySnapshot.forEach((doc) => {
      allEvents.push({ id: doc.id, ...doc.data() });
    });

    displayEvents(allEvents);

  } catch (error) {
    console.error("Error fetching events:", error);
    loadingIndicator.classList.add('hidden');
    eventsGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500 mb-4">Error loading events. Please try again.</p>
        <button onclick="location.reload()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Retry
        </button>
      </div>
    `;
  }
}

// Display events in grid
function displayEvents(events) {
  eventsGrid.innerHTML = '';

  if (events.length === 0) {
    emptyState.classList.remove('hidden');
    eventsGrid.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  eventsGrid.classList.remove('hidden');

  events.forEach(event => {
    const card = createEventCard(event);
    eventsGrid.appendChild(card);
  });
}

// Create event card element
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = "bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col";

  const badgeColor = event.type === 'Technical' 
    ? 'bg-blue-100 text-blue-700' 
    : event.type === 'Cultural'
    ? 'bg-purple-100 text-purple-700'
    : event.type === 'Sports'
    ? 'bg-green-100 text-green-700'
    : 'bg-orange-100 text-orange-700';

  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <span class="${badgeColor} text-xs font-bold px-3 py-1 rounded-full">${event.type || 'General'}</span>
      <span class="text-gray-400 text-xs">${formatDate(event.createdAt)}</span>
    </div>

    <h3 class="text-xl font-bold text-gray-900 mb-2">${event.eventName}</h3>
    <p class="text-xs text-gray-500 mb-3">📍 ${event.college}</p>

    <div class="space-y-2 mb-4 flex-grow">
      ${event.eventDate ? `<p class="text-sm text-gray-600"><span class="font-semibold">📅 Date:</span> ${event.eventDate}</p>` : ''}
      ${event.venue ? `<p class="text-sm text-gray-600"><span class="font-semibold">📍 Venue:</span> ${truncate(event.venue, 40)}</p>` : ''}
      ${event.organizer ? `<p class="text-sm text-gray-600"><span class="font-semibold">👤 Organizer:</span> ${event.organizer}</p>` : ''}
      <p class="text-sm text-gray-500 line-clamp-2">${truncate(event.description, 100)}</p>
    </div>

    ${event.gform ? `
      <a href="${event.gform}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all">
        Register Now
      </a>
    ` : `
      <button class="block w-full text-center py-3 rounded-xl border-2 border-gray-300 text-gray-500 text-sm font-bold cursor-not-allowed">
        Registration Closed
      </button>
    `}
  `;

  return card;
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', () => {
    filterEvents();
  });
}

// Filter functionality
if (filterType) {
  filterType.addEventListener('change', () => {
    filterEvents();
  });
}

// Filter events based on search and type
function filterEvents() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const typeFilter = filterType ? filterType.value : 'all';

  const filtered = allEvents.filter(event => {
    const matchesSearch = 
      (event.eventName && event.eventName.toLowerCase().includes(searchTerm)) ||
      (event.description && event.description.toLowerCase().includes(searchTerm)) ||
      (event.college && event.college.toLowerCase().includes(searchTerm)) ||
      (event.venue && event.venue.toLowerCase().includes(searchTerm)) ||
      (event.organizer && event.organizer.toLowerCase().includes(searchTerm));

    const matchesType = typeFilter === 'all' || event.type === typeFilter;

    return matchesSearch && matchesType;
  });

  displayEvents(filtered);
}

// Helper: Truncate text
function truncate(text, maxLength) {
  if (!text) return 'N/A';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Initialize
fetchAndRenderEvents();