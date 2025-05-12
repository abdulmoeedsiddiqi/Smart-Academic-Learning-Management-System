/**
 * Main JavaScript file for the Learning Management System (SALAMS)
 */

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips if Bootstrap is available
  if (typeof bootstrap !== 'undefined') {
    // Initialize all tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  
    // Initialize all popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
      return new bootstrap.Popover(popoverTriggerEl);
    });
  }

  // Add active class to current navigation item
  const currentLocation = window.location.pathname;
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link, nav a');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentLocation) {
      link.classList.add('active', 'font-bold');
      // If inside dropdown, mark parent as active too
      const dropdown = link.closest('.dropdown');
      if (dropdown) {
        dropdown.querySelector('.dropdown-toggle')?.classList.add('active');
      }
    }
  });  // Auto-hide flash messages after 3 seconds if they aren't Alpine.js controlled
  setTimeout(() => {
    // Handle Bootstrap alerts
    const flashMessages = document.querySelectorAll('.alert-dismissible:not([x-data])');
    flashMessages.forEach(message => {
      try {
        if (typeof bootstrap !== 'undefined' && bootstrap.Alert && message) {
          // For Bootstrap 5
          const bsAlert = new bootstrap.Alert(message);
          bsAlert.close();
        } else if (typeof $ !== 'undefined' && $(message).alert) {
          // For Bootstrap 4 with jQuery
          $(message).alert('close');
        } else {
          // Fallback for when Bootstrap is not available
          message.style.opacity = '0';
          setTimeout(() => {
            message.style.display = 'none';
            if (message.parentNode) {
              message.parentNode.removeChild(message);
            }
          }, 300);
        }
      } catch (error) {
        console.warn('Error closing alert:', error);
        // Fallback if bootstrap alert initialization fails
        message.style.display = 'none';
      }
    });
    
    // Handle Tailwind CSS alerts (used in auth layout)
    const tailwindAlerts = document.querySelectorAll('.bg-red-100, .bg-green-100, .bg-yellow-100, .bg-blue-100, .auto-dismiss');
    tailwindAlerts.forEach(alert => {
      if (alert) {
        alert.classList.add('opacity-0');
        alert.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
          if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
          }
        }, 500);
      }
    });
  }, 3000); // 3 seconds

  // Form validation for client-side validation
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });

  // Add confirmation for delete actions
  const deleteButtons = document.querySelectorAll('.btn-delete');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  });
});

// Course search functionality
const courseSearch = document.getElementById('course-search');
if (courseSearch) {
  courseSearch.addEventListener('input', function() {
    const searchValue = this.value.toLowerCase();
    const courseCards = document.querySelectorAll('.course-card');
    
    courseCards.forEach(card => {
      const courseTitle = card.querySelector('.card-title').textContent.toLowerCase();
      const courseDescription = card.querySelector('.card-text').textContent.toLowerCase();
      
      if (courseTitle.includes(searchValue) || courseDescription.includes(searchValue)) {
        card.closest('.col').style.display = '';
      } else {
        card.closest('.col').style.display = 'none';
      }
    });
  });
}

// Handle file upload previews
const fileInputs = document.querySelectorAll('.custom-file-input');
fileInputs.forEach(input => {
  input.addEventListener('change', function() {
    const fileName = this.files[0]?.name;
    const label = this.nextElementSibling;
    if (label) {
      label.textContent = fileName || 'Choose file';
    }
  });
});

// Dashboard charts initialization (if Chart.js is included)
if (typeof Chart !== 'undefined') {
  // Example attendance chart
  const attendanceChart = document.getElementById('attendanceChart');
  if (attendanceChart) {
    new Chart(attendanceChart, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Attendance Rate (%)',
          data: [95, 93, 88, 92, 94, 96, 90, 92, 93, 91, 89, 94],
          fill: false,
          borderColor: '#3490dc',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Monthly Attendance Rate'
          }
        },
        scales: {
          y: {
            min: 50,
            max: 100
          }
        }
      }
    });
  }

  // Example grade distribution chart
  const gradeChart = document.getElementById('gradeChart');
  if (gradeChart) {
    new Chart(gradeChart, {
      type: 'pie',
      data: {
        labels: ['A', 'B', 'C', 'D', 'F'],
        datasets: [{
          label: 'Grade Distribution',
          data: [40, 30, 20, 7, 3],
          backgroundColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#f97316',
            '#ef4444'
          ]
        }]
      }
    });
  }
}