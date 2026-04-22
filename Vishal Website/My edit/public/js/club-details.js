import { db } from './firebase-config.js';
import { userStorage, requireAuth, formatDate } from './utils.js';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check authentication
if (!requireAuth()) {
  throw new Error('Authentication required');
}

const currentUser = userStorage.get();

// Get club ID from URL
const urlParams = new URLSearchParams(window.location.search);
const clubId = urlParams.get('id');

if (!clubId) {
  alert('No club selected!');
  window.location.href = 'browse-clubs.html';
}

let clubData = null;
let clubListener = null;

// Load club details with real-time listener
function setupClubListener() {
  try {
    const docRef = doc(db, 'clubs', clubId);
    
    // Use onSnapshot for real-time updates
    clubListener = onSnapshot(docRef, 
      (docSnap) => {
        if (!docSnap.exists()) {
          alert('Club not found!');
          window.location.href = 'browse-clubs.html';
          return;
        }

        clubData = { id: docSnap.id, ...docSnap.data() };
        displayClubDetails();
      },
      (error) => {
        console.error('Error loading club:', error);
        alert('Error loading club details');
        window.location.href = 'browse-clubs.html';
      }
    );

  } catch (error) {
    console.error('Error setting up listener:', error);
    alert('Error loading club details');
    window.location.href = 'browse-clubs.html';
  }
}

// Display club details
function displayClubDetails() {
  // Display club info
  document.getElementById('club-name').textContent = clubData.name || 'Untitled Club';
  document.getElementById('club-type-badge').textContent = clubData.type || clubData.clubType || 'Club';
  document.getElementById('club-creator').textContent = clubData.createdBy || 'Unknown';
  document.getElementById('club-college').textContent = clubData.college || 'N/A';
  document.getElementById('club-mission').textContent = clubData.mission || clubData.description || 'No mission statement provided.';

  // Member count (updates in real-time)
  const memberCount = clubData.members ? clubData.members.length : 0;
  const memberCountElement = document.getElementById('member-count');
  
  // Animate member count change
  if (memberCountElement.textContent !== memberCount.toString()) {
    memberCountElement.classList.add('animate-pulse');
    setTimeout(() => {
      memberCountElement.classList.remove('animate-pulse');
    }, 500);
  }
  
  memberCountElement.textContent = memberCount;

  // Created date
  if (clubData.createdAt) {
    const createdDate = clubData.createdAt.toDate ? clubData.createdAt.toDate() : new Date(clubData.createdAt);
    document.getElementById('created-date').textContent = createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } else {
    document.getElementById('created-date').textContent = '-';
  }

  // Email link
  const emailLink = document.getElementById('club-email');
  const clubEmail = clubData.email || 'N/A';
  if (clubEmail !== 'N/A') {
    emailLink.href = `mailto:${clubEmail}`;
    emailLink.querySelector('span').textContent = clubEmail;
    emailLink.classList.add('hover:underline');
  } else {
    emailLink.querySelector('span').textContent = 'No email provided';
    emailLink.style.cursor = 'not-allowed';
    emailLink.classList.remove('hover:underline');
    emailLink.removeAttribute('href');
  }

  // Phone number display (NEW)
  const phoneContainer = document.getElementById('club-phone-container');
  const phoneElement = document.getElementById('club-phone');
  const clubPhone = clubData.phone || clubData.phoneNumber;
  
  if (clubPhone) {
    phoneElement.textContent = formatPhoneNumber(clubPhone);
    phoneContainer.style.display = 'flex';
  } else {
    phoneContainer.style.display = 'none';
  }

  // Pre-fill join form
  prefillJoinForm();

  // Check if user already joined
  checkIfAlreadyJoined();

  // Show content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'grid';
}

// Format phone number for display (NEW)
function formatPhoneNumber(phone) {
  // Format as: +91 XXXXX XXXXX
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

// Check if user already joined (NEW)
function checkIfAlreadyJoined() {
  const currentMemberEmail = currentUser.email || document.querySelector('input[name="memberEmail"]').value;
  const submitBtn = document.querySelector('button[type="submit"]');
  const joinForm = document.getElementById('join-form');
  
  if (clubData.members && clubData.members.some(m => m.email === currentMemberEmail)) {
    // User already joined - disable form
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Already a Member';
    submitBtn.classList.remove('from-indigo-600', 'to-purple-600', 'hover:shadow-lg', 'transform', 'hover:scale-[1.02]');
    submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    
    // Disable all form inputs
    const inputs = joinForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      if (input.name !== 'memberName' && input.name !== 'memberEmail' && input.name !== 'memberCourse') {
        input.disabled = true;
      }
    });
  }
}

// Pre-fill join form with user data
function prefillJoinForm() {
  const memberNameField = document.querySelector('input[name="memberName"]');
  const memberEmailField = document.querySelector('input[name="memberEmail"]');
  const memberPhoneField = document.querySelector('input[name="memberPhone"]');
  const memberCourseField = document.querySelector('input[name="memberCourse"]');

  // Safely set name
  if (currentUser.name) {
    memberNameField.value = currentUser.name;
  } else if (currentUser.email) {
    memberNameField.value = currentUser.email.split('@')[0];
  } else {
    memberNameField.value = 'User';
  }

  // Safely set email
  if (currentUser.email) {
    memberEmailField.value = currentUser.email;
  } else {
    memberEmailField.value = '';
    memberEmailField.removeAttribute('readonly');
    memberEmailField.setAttribute('placeholder', 'Enter your email');
    memberEmailField.classList.remove('bg-gray-50', 'border-gray-200');
    memberEmailField.classList.add('border-gray-300');
  }

  // Safely set phone (NEW)
  if (currentUser.phone || currentUser.phoneNumber) {
    memberPhoneField.value = currentUser.phone || currentUser.phoneNumber;
    memberPhoneField.setAttribute('readonly', true);
    memberPhoneField.classList.remove('border-gray-300');
    memberPhoneField.classList.add('border-gray-200', 'bg-gray-50');
  } else {
    memberPhoneField.value = '';
    memberPhoneField.removeAttribute('readonly');
    memberPhoneField.setAttribute('placeholder', 'Enter 10-digit mobile number');
    
    // Add real-time phone validation
    memberPhoneField.addEventListener('input', validatePhoneInput);
  }

  // Safely set course
  if (currentUser.course) {
    memberCourseField.value = currentUser.course;
  } else {
    memberCourseField.value = '';
    memberCourseField.removeAttribute('readonly');
    memberCourseField.setAttribute('placeholder', 'Enter your course');
    memberCourseField.classList.remove('bg-gray-50', 'border-gray-200');
    memberCourseField.classList.add('border-gray-300');
  }
}

// Real-time phone validation (NEW)
function validatePhoneInput(e) {
  const input = e.target;
  // Remove non-numeric characters
  input.value = input.value.replace(/\D/g, '');
  
  // Visual feedback
  if (input.value.length === 10) {
    input.classList.remove('border-red-500');
    input.classList.add('border-green-500');
  } else if (input.value.length > 0) {
    input.classList.remove('border-green-500');
    input.classList.add('border-red-500');
  } else {
    input.classList.remove('border-green-500', 'border-red-500');
  }
}

// Validate reason field (NEW)
function validateReason(reason) {
  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    return { valid: false, message: 'Please provide at least 10 characters explaining why you want to join.' };
  }
  if (trimmed.length > 500) {
    return { valid: false, message: 'Please keep your reason under 500 characters.' };
  }
  return { valid: true };
}

// Handle join form submission
const joinForm = document.getElementById('join-form');

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  // Get current member email safely
  const currentMemberEmail = currentUser.email || document.querySelector('input[name="memberEmail"]').value;

  // Check if already a member
  if (clubData.members && clubData.members.some(m => m.email === currentMemberEmail)) {
    alert('✋ You are already a member of this club!');
    return;
  }

  // Validate phone number
  const phoneInput = document.querySelector('input[name="memberPhone"]');
  const phoneValue = phoneInput.value.trim();
  
  if (!phoneValue || phoneValue.length !== 10 || !/^\d{10}$/.test(phoneValue)) {
    alert('❌ Please enter a valid 10-digit phone number');
    phoneInput.focus();
    phoneInput.classList.add('border-red-500', 'animate-pulse');
    setTimeout(() => {
      phoneInput.classList.remove('animate-pulse');
    }, 500);
    return;
  }

  // Validate reason
  const reasonInput = document.querySelector('textarea[name="reason"]');
  const reasonValue = reasonInput.value.trim();
  const reasonValidation = validateReason(reasonValue);
  
  if (!reasonValidation.valid) {
    alert('❌ ' + reasonValidation.message);
    reasonInput.focus();
    return;
  }

  // Disable button with loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';

  // Collect form data
  const formData = new FormData(e.target);
  const memberData = {
    name: formData.get('memberName') || 'Unknown',
    email: formData.get('memberEmail') || 'No email',
    phone: phoneValue, // NEW FIELD
    course: formData.get('memberCourse') || 'Not specified',
    reason: reasonValue,
    joinedAt: new Date().toISOString(),
    status: 'pending' // Can be used for approval system later
  };

  try {
    // Add member to club's members array
    const docRef = doc(db, 'clubs', clubId);
    await updateDoc(docRef, {
      members: arrayUnion(memberData)
    });

    console.log('Member added successfully:', memberData);

    // Success animation
    submitBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Success!';
    submitBtn.classList.add('bg-green-600');

    // Success message
    setTimeout(() => {
      alert('✅ Successfully joined the club!\n\nThe club admin will contact you via:\n📧 Email: ' + memberData.email + '\n📱 Phone: ' + formatPhoneNumber(memberData.phone));
      
      // Redirect back to clubs
      window.location.href = 'browse-clubs.html';
    }, 500);

  } catch (error) {
    console.error('Error joining club:', error);
    
    // Better error messages
    let errorMessage = 'Error joining club: ';
    if (error.code === 'permission-denied') {
      errorMessage += 'You do not have permission to join this club.';
    } else if (error.code === 'not-found') {
      errorMessage += 'Club not found.';
    } else {
      errorMessage += error.message;
    }
    
    alert('❌ ' + errorMessage);

    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

// Add reason character counter (NEW)
const reasonTextarea = document.querySelector('textarea[name="reason"]');
if (reasonTextarea) {
  const counterDiv = document.createElement('p');
  counterDiv.className = 'text-xs text-gray-500 mt-1.5 text-right';
  counterDiv.id = 'reason-counter';
  reasonTextarea.parentElement.appendChild(counterDiv);
  
  reasonTextarea.addEventListener('input', (e) => {
    const length = e.target.value.length;
    counterDiv.textContent = `${length}/500 characters`;
    
    if (length < 10) {
      counterDiv.classList.add('text-red-500');
      counterDiv.classList.remove('text-green-600');
    } else if (length > 500) {
      counterDiv.classList.add('text-red-500');
      counterDiv.classList.remove('text-green-600');
    } else {
      counterDiv.classList.add('text-green-600');
      counterDiv.classList.remove('text-red-500');
    }
  });
  
  // Initial counter
  counterDiv.textContent = '0/500 characters';
}

// Cleanup listener on page unload
window.addEventListener('beforeunload', () => {
  if (clubListener) {
    clubListener();
  }
});

// Initialize
setupClubListener();
