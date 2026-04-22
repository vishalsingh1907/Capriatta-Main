import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();

// DOM Elements
const projectsGrid = document.getElementById('projects-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterCourse = document.getElementById('filter-course');

// Store all projects for filtering
let allProjects = [];
let myProjects = []; // Store user's own projects

// Fetch and render projects
async function fetchAndRenderProjects() {
  // Show loading, hide everything else
  loadingIndicator.style.display = 'block';
  projectsGrid.style.display = 'none';
  emptyState.style.display = 'none';
  projectsGrid.innerHTML = '';

  try {
    const q = query(collection(db, 'projects'), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    // Hide loading
    loadingIndicator.style.display = 'none';

    // Check if there are NO projects at all
    if (querySnapshot.empty) {
      console.log('No projects found in database');
      emptyState.style.display = 'block';
      projectsGrid.style.display = 'none';
      return;
    }

    // Store all projects
    allProjects = [];
    querySnapshot.forEach((doc) => {
      allProjects.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Loaded ${allProjects.length} projects from database`);

    // Display projects
    displayProjects(allProjects);

    // Check user's own projects for download button
    checkUserProjects();

  } catch (error) {
    console.error("Error fetching projects:", error);
    loadingIndicator.style.display = 'none';

    // Show error message in grid
    projectsGrid.innerHTML = `
      <div class="col-span-full text-center py-12 bg-red-50 rounded-2xl border-2 border-red-200">
        <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
        <p class="text-red-600 font-semibold mb-4">Error loading projects</p>
        <p class="text-red-500 text-sm mb-4">${error.message}</p>
        <button onclick="location.reload()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          <i class="fas fa-redo mr-2"></i>Retry
        </button>
      </div>
    `;
    projectsGrid.style.display = 'grid';
  }
}

// Display projects in grid
function displayProjects(projects) {
  projectsGrid.innerHTML = '';

  // If no projects after filtering, show empty state
  if (projects.length === 0) {
    emptyState.style.display = 'block';
    projectsGrid.style.display = 'none';
    return;
  }

  // Hide empty state and show grid
  emptyState.style.display = 'none';
  projectsGrid.style.display = 'grid';

  // Create cards for each project
  projects.forEach(project => {
    const card = createProjectCard(project);
    projectsGrid.appendChild(card);
  });
}

// Check if user has created projects and show download button
async function checkUserProjects() {
  try {
    const q = query(
      collection(db, 'projects'), 
      where("createdBy", "==", currentUser.name || currentUser.email.split('@')[0]),
      where("email", "==", currentUser.email)
    );
    const querySnapshot = await getDocs(q);

    myProjects = [];
    querySnapshot.forEach((doc) => {
      myProjects.push({ id: doc.id, ...doc.data() });
    });

    // Show download button if user has projects
    if (myProjects.length > 0) {
      addDownloadButton();
    }
  } catch (error) {
    console.error("Error checking user projects:", error);
  }
}

// Add download button to the page
function addDownloadButton() {
  const nav = document.querySelector('nav .flex.items-center.space-x-4');

  // Check if button already exists
  if (document.getElementById('download-projects-btn')) return;

  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-projects-btn';
  downloadBtn.className = 'flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all';
  downloadBtn.innerHTML = `
    <i class="fas fa-download"></i>
    <span class="font-medium">My Projects (${myProjects.length})</span>
  `;
  downloadBtn.onclick = downloadMyProjects;

  // Insert before the "Create Project" button
  nav.insertBefore(downloadBtn, nav.firstChild);
}

// Download user's projects as Excel (CSV format)
function downloadMyProjects() {
  if (myProjects.length === 0) {
    alert('No projects to download');
    return;
  }

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Headers
  csvContent += "Project Title,Course,College,Tech Stack,Requirements,Description,Created Date,Google Form,Email\n";

  // Data rows
  myProjects.forEach(project => {
    const row = [
      escapeCSV(project.motive || 'Untitled'),
      escapeCSV(project.course || ''),
      escapeCSV(project.college || ''),
      escapeCSV(project.techStack || ''),
      escapeCSV(project.requirements || ''),
      escapeCSV(project.description || ''),
      formatDate(project.createdAt),
      escapeCSV(project.gform || ''),
      escapeCSV(project.email || '')
    ].join(',');
    csvContent += row + "\n";
  });

  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `my_projects_${currentUser.name || 'user'}_${new Date().toISOString().split('T')[0]}.csv`);
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

// Create project card element
function createProjectCard(project) {
  const card = document.createElement('div');
  const isMyProject = project.createdBy === (currentUser.name || currentUser.email.split('@')[0]) && project.email === currentUser.email;
  card.className = `bg-white p-6 rounded-2xl shadow-lg border ${isMyProject ? 'border-purple-300 ring-2 ring-purple-200' : 'border-gray-100'} hover:shadow-xl transition-all duration-300 flex flex-col`;

  card.innerHTML = `
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center space-x-2">
        <span class="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">Project</span>
        ${isMyProject ? '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Your Project</span>' : ''}
      </div>
      <span class="text-gray-400 text-xs">${formatDate(project.createdAt)}</span>
    </div>

    <h3 class="text-xl font-bold text-gray-900 mb-1">${truncate(project.motive || 'Untitled Project', 40)}</h3>
    <p class="text-xs text-gray-500 mb-4">by ${project.createdBy || 'Unknown'} • ${project.college || 'N/A'}</p>

    <div class="space-y-2 mb-6 flex-grow">
      <p class="text-sm text-gray-600"><span class="font-semibold">Course:</span> ${project.course || 'N/A'}</p>
      <p class="text-sm text-gray-600"><span class="font-semibold">Tech Stack:</span> ${truncate(project.techStack || 'Not specified', 50)}</p>
      <p class="text-sm text-gray-600"><span class="font-semibold">Looking for:</span> ${truncate(project.requirements || 'N/A', 50)}</p>
      <p class="text-sm text-gray-600 line-clamp-3">${truncate(project.description || 'No description provided', 100)}</p>
    </div>

    ${project.gform ? `
      <a href="${project.gform}" target="_blank" rel="noopener noreferrer" class="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:shadow-lg transform hover:scale-[1.02] transition-all">
        Apply to Join
      </a>
    ` : `
      <button class="block w-full text-center py-3 rounded-xl border-2 border-gray-300 text-gray-500 text-sm font-bold cursor-not-allowed" title="No application form available">
        Application Closed
      </button>
    `}
  `;

  return card;
}

// Search functionality
if (searchInput) {
  searchInput.addEventListener('input', () => {
    filterProjects();
  });
}

// Filter functionality
if (filterCourse) {
  filterCourse.addEventListener('change', () => {
    filterProjects();
  });
}

// Filter projects based on search and course
function filterProjects() {
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const courseFilter = filterCourse ? filterCourse.value : 'all';

  const filtered = allProjects.filter(project => {
    const matchesSearch = 
      (project.motive && project.motive.toLowerCase().includes(searchTerm)) ||
      (project.description && project.description.toLowerCase().includes(searchTerm)) ||
      (project.college && project.college.toLowerCase().includes(searchTerm)) ||
      (project.createdBy && project.createdBy.toLowerCase().includes(searchTerm)) ||
      (project.requirements && project.requirements.toLowerCase().includes(searchTerm)) ||
      (project.techStack && project.techStack.toLowerCase().includes(searchTerm));

    const matchesCourse = courseFilter === 'all' || project.course === courseFilter;

    return matchesSearch && matchesCourse;
  });

  displayProjects(filtered);
}

// Helper: Truncate text
function truncate(text, maxLength) {
  if (!text) return 'N/A';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Initialize
async function init() {
  await fetchAndRenderProjects();
}

init();