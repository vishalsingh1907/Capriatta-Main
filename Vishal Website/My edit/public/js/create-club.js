import { db } from './firebase-config.js';
import { userStorage, requireAuth } from './utils.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();

// Pre-fill form fields from user profile
const collegeField = document.querySelector('input[name="college"]');
const emailField = document.querySelector('input[name="email"]');
const phoneField = document.querySelector('input[name="phone"]');

// Pre-fill college if available
if (currentUser.college) {
  collegeField.value = currentUser.college;
}

// Pre-fill email if available
if (currentUser.email) {
  emailField.value = currentUser.email;
}

// Pre-fill phone if available
if (currentUser.phone || currentUser.phoneNumber) {
  phoneField.value = currentUser.phone || currentUser.phoneNumber;
}

// Mission character counter
const missionTextarea = document.querySelector('textarea[name="mission"]');
const missionCounter = document.getElementById('mission-counter');

if (missionTextarea && missionCounter) {
  missionTextarea.addEventListener('input', (e) => {
    const length = e.target.value.length;
    missionCounter.textContent = `${length}/500 characters`;
    
    if (length < 20) {
      missionCounter.classList.add('text-red-500');
      missionCounter.classList.remove('text-green-600');
    } else if (length > 500) {
      missionCounter.classList.add('text-red-500');
      missionCounter.classList.remove('text-green-600');
    } else {
      missionCounter.classList.add('text-green-600');
      missionCounter.classList.remove('text-red-500');
    }
  });
}

// Phone number real-time validation
if (phoneField) {
  phoneField.addEventListener('input', (e) => {
    // Remove non-numeric characters
    e.target.value = e.target.value.replace(/\D/g, '');
    
    // Visual feedback
    if (e.target.value.length === 10) {
      e.target.classList.remove('border-red-500', 'border-gray-300');
      e.target.classList.add('border-green-500');
    } else if (e.target.value.length > 0) {
      e.target.classList.remove('border-green-500', 'border-gray-300');
      e.target.classList.add('border-red-500');
    } else {
      e.target.classList.remove('border-green-500', 'border-red-500');
      e.target.classList.add('border-gray-300');
    }
  });
}

// Club name validation
const nameField = document.querySelector('input[name="name"]');
if (nameField) {
  nameField.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value.length >= 3 && value.length <= 50) {
      e.target.classList.remove('border-red-500');
      e.target.classList.add('border-green-500');
    } else if (value.length > 0) {
      e.target.classList.remove('border-green-500');
      e.target.classList.add('border-red-500');
    }
  });
}

// Email validation
if (emailField) {
  emailField.addEventListener('blur', (e) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(e.target.value)) {
      e.target.classList.remove('border-red-500');
      e.target.classList.add('border-green-500');
    } else if (e.target.value.length > 0) {
      e.target.classList.remove('border-green-500');
      e.target.classList.add('border-red-500');
    }
  });
}

// Form validation helper
function validateForm(formData) {
  const errors = [];
  
  // Validate club name
  const name = formData.get('name').trim();
  if (name.length < 3 || name.length > 50) {
    errors.push('Club name must be between 3 and 50 characters');
  }
  
  // Validate type
  const type = formData.get('type');
  if (!type) {
    errors.push('Please select a club type');
  }
  
  // Validate college
  const college = formData.get('college').trim();
  if (college.length < 3) {
    errors.push('Please enter a valid college name');
  }
  
  // Validate mission
  const mission = formData.get('mission').trim();
  if (mission.length < 20) {
    errors.push('Mission must be at least 20 characters');
  }
  if (mission.length > 500) {
    errors.push('Mission must not exceed 500 characters');
  }
  
  // Validate email
  const email = formData.get('email');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Validate phone
  const phone = formData.get('phone').trim();
  if (!/^\d{10}$/.test(phone)) {
    errors.push('Please enter a valid 10-digit phone number');
  }
  
  return errors;
}

// Handle form submission
const form = document.getElementById('club-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Collect form data
  const formData = new FormData(e.target);
  
  // Validate form
  const validationErrors = validateForm(formData);
  if (validationErrors.length > 0) {
    alert('❌ Please fix the following errors:\n\n' + validationErrors.join('\n'));
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Club...';

  // Prepare club data
  const clubData = {
    name: formData.get('name').trim(),
    type: formData.get('type'),
    college: formData.get('college').trim(),
    mission: formData.get('mission').trim(),
    email: formData.get('email').trim(),
    phone: formData.get('phone').trim(), // NEW FIELD
    createdBy: currentUser.name || (currentUser.email ? currentUser.email.split('@')[0] : 'Anonymous'),
    createdAt: new Date().toISOString(),
    members: [], // Empty array for member management
    status: 'active' // Can be used for approval system later
  };

  try {
    // Add club to Firestore
    const docRef = await addDoc(collection(db, 'clubs'), clubData);
    console.log('Club created successfully with ID:', docRef.id);
    console.log('Club data:', clubData);

    // Success animation
    submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Success!';
    submitBtn.classList.remove('from-indigo-600', 'to-purple-600');
    submitBtn.classList.add('bg-green-600');

    // Success message with details
    setTimeout(() => {
      alert(
        '✅ Club Created Successfully!\n\n' +
        `📚 Club: ${clubData.name}\n` +
        `🏷️ Type: ${clubData.type}\n` +
        `🏫 College: ${clubData.college}\n\n` +
        'Your club is now visible to students from your college!'
      );
      
      // Redirect to browse clubs
      window.location.href = 'browse-clubs.html';
    }, 500);

  } catch (error) {
    console.error("Error creating club:", error);
    
    // Better error messages
    let errorMessage = 'Error creating club: ';
    if (error.code === 'permission-denied') {
      errorMessage += 'You do not have permission to create clubs.';
    } else if (error.code === 'unavailable') {
      errorMessage += 'Network error. Please check your connection.';
    } else {
      errorMessage += error.message;
    }
    
    alert('❌ ' + errorMessage);

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    submitBtn.classList.remove('bg-green-600');
    submitBtn.classList.add('from-indigo-600', 'to-purple-600');
  }
});

// Prevent accidental navigation
let formModified = false;

form.addEventListener('input', () => {
  formModified = true;
});

window.addEventListener('beforeunload', (e) => {
  if (formModified) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
});

// Form submitted - allow navigation
form.addEventListener('submit', () => {
  formModified = false;
});

// Add helpful tooltips on focus
const fields = [
  { 
    selector: 'input[name="name"]', 
    message: '💡 Choose a unique, memorable name for your club' 
  },
  { 
    selector: 'textarea[name="mission"]', 
    message: '💡 Describe what makes your club special and what members will gain' 
  },
  { 
    selector: 'input[name="phone"]', 
    message: '💡 This number will be shared with interested members' 
  }
];

fields.forEach(field => {
  const element = document.querySelector(field.selector);
  if (element) {
    element.addEventListener('focus', (e) => {
      const helper = e.target.nextElementSibling;
      if (helper && helper.classList.contains('text-xs')) {
        helper.textContent = field.message;
        helper.classList.add('text-indigo-600', 'font-medium');
        setTimeout(() => {
          helper.classList.remove('text-indigo-600', 'font-medium');
        }, 3000);
      }
    });
  }
});

console.log('Create Club form initialized');
console.log('Current user:', currentUser.name || currentUser.email);
