import { db } from './firebase-config.js';
import { userStorage, requireAuth } from './utils.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  window.location.href = 'index.html';
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();

// Pre-fill email if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.querySelector('input[name="email"]');
  if (emailInput && currentUser && currentUser.email) {
    emailInput.value = currentUser.email;
  }
});

// Validate Google Form URL
function isValidGoogleFormURL(url) {
  const googleFormPatterns = [
    /forms\.gle\/[a-zA-Z0-9_-]+/,
    /docs\.google\.com\/forms\/d\/e\/[a-zA-Z0-9_-]+/,
    /docs\.google\.com\/forms\/d\/[a-zA-Z0-9_-]+/
  ];

  return googleFormPatterns.some(pattern => pattern.test(url));
}

// Add custom validation for Google Form URL (REQUIRED)
const gformInput = document.querySelector('input[name="gform"]');
if (gformInput) {
  gformInput.addEventListener('blur', () => {
    const value = gformInput.value.trim();
    if (!value) {
      gformInput.setCustomValidity('Google Form link is required for project applications');
      gformInput.reportValidity();
    } else if (!isValidGoogleFormURL(value)) {
      gformInput.setCustomValidity('Please enter a valid Google Forms link (forms.gle/... or docs.google.com/forms/...)');
      gformInput.reportValidity();
    } else {
      gformInput.setCustomValidity('');
    }
  });

  // Clear validation on input
  gformInput.addEventListener('input', () => {
    gformInput.setCustomValidity('');
  });
}

// Handle form submission
const form = document.getElementById('project-creation-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.textContent;

  // Validate Google Form before submission
  const gformValue = gformInput.value.trim();
  if (!gformValue) {
    alert('❌ Google Form link is required. Please provide an application form link.');
    gformInput.focus();
    return;
  }

  if (!isValidGoogleFormURL(gformValue)) {
    alert('❌ Invalid Google Form URL. Please check the link and try again.');
    gformInput.focus();
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing...';

  // Collect form data
  const formData = new FormData(form);

  const projectData = {
    // Project details
    motive: formData.get('title'), // Using 'motive' to match browse-projects.js
    course: formData.get('course'),
    description: formData.get('description'),
    techStack: formData.get('techStack'),
    requirements: formData.get('lookingFor'), // Maps to 'requirements' field
    teamSize: parseInt(formData.get('teamSize')),
    gform: gformValue, // Google Form link (REQUIRED)
    email: formData.get('email'),

    // Creator information (from logged-in user)
    createdBy: currentUser.name || currentUser.email.split('@')[0],
    college: currentUser.college || 'Not specified',

    // Metadata
    createdAt: new Date().toISOString(),
    createdDate: new Date().toLocaleDateString('en-IN'),
    createdTime: new Date().toLocaleTimeString('en-IN'),
    status: 'Active',

    // Additional fields for tracking
    applicants: 0,
    views: 0
  };

  try {
    // Add to 'projects' collection in Firebase
    const docRef = await addDoc(collection(db, 'projects'), projectData);
    console.log('Project created with ID:', docRef.id);

    // Show success message
    alert('✅ Project published successfully! Users can now apply via your Google Form.');

    // Redirect to browse projects page
    window.location.href = 'browse-projects.html';

  } catch (error) {
    console.error("Error creating project:", error);
    alert('❌ Error publishing project. Please try again.');

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});