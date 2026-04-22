import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();

// Determine page type
const isProjectsPage = window.location.pathname.includes('browse-projects');
const collectionName = isProjectsPage ? 'projects' : 'clubs';

// DOM Elements
const itemsGrid = document.getElementById(isProjectsPage ? 'projects-grid' : 'clubs-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const emptyState = document.getElementById('empty-state');

// Fetch and render items
async function fetchAndRenderItems() {
  loadingIndicator.classList.remove('hidden');
  itemsGrid.innerHTML = '';
  
  try {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    loadingIndicator.classList.add('hidden');
    
    if (querySnapshot.empty) {
      emptyState.classList.remove('hidden');
      return;
    }
    
    emptyState.classList.add('hidden');
    
    querySnapshot.forEach((doc) => {
      const item = doc.data();
      const card = createItemCard(item, doc.id);
      itemsGrid.appendChild(card);
    });
    
  } catch (error) {
    console.error("Error fetching documents:", error);
    loadingIndicator.classList.add('hidden');
    itemsGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500 mb-4">Error loading data. Please try again.</p>
        <button onclick="location.reload()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Retry
        </button>
      </div>
    `;
  }
}

// Create card element for project or club
function createItemCard(item, docId) {
  const card = document.createElement('div');
  card.className = "bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all";
  
  if (isProjectsPage) {
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <span class="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">Project</span>
        <span class="text-gray-400 text-xs">${formatDate(item.createdAt)}</span>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-1">${truncate(item.motive || 'Untitled Project', 40)}</h3>
      <p class="text-xs text-gray-500 mb-4">by ${item.createdBy} • ${item.college}</p>
      
      <div class="space-y-2 mb-6">
        <p class="text-sm text-gray-600"><span class="font-semibold">Course:</span> ${item.course}</p>
        <p class="text-sm text-gray-600"><span class="font-semibold">Looking for:</span> ${truncate(item.requirements, 50)}</p>
        <p class="text-sm text-gray-600 line-clamp-3">${truncate(item.description, 100)}</p>
      </div>
      
      ${item.gform ? `
        <a href="${item.gform}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-3 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors">
          Apply to Join
        </a>
      ` : `
        <a href="mailto:${item.email}" class="block w-full text-center py-3 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors">
          Contact via Email
        </a>
      `}
    `;
  } else {
    // Club card
    const badgeColor = item.type === 'Official Club' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700';
    card.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <span class="${badgeColor} text-xs font-bold px-3 py-1 rounded-full">${item.type || 'Community'}</span>
        <span class="text-gray-400 text-xs">${item.college}</span>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">${item.clubName}</h3>
      <p class="text-sm text-gray-600 mb-2"><span class="font-semibold">Mission:</span> ${truncate(item.motive, 60)}</p>
      <p class="text-sm text-gray-500 mb-6 line-clamp-3">${truncate(item.description, 100)}</p>
      
      ${item.gform ? `
        <a href="${item.gform}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-3 rounded-lg border-2 border-black text-black text-sm font-bold hover:bg-black hover:text-white transition-colors">
          Join Community
        </a>
      ` : `
        <button class="block w-full text-center py-3 rounded-lg border-2 border-gray-300 text-gray-500 text-sm font-bold cursor-not-allowed">
          No Form Available
        </button>
      `}
    `;
  }
  
  return card;
}

// Helper: Truncate text
function truncate(text, maxLength) {
  if (!text) return 'N/A';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Initialize
fetchAndRenderItems();
