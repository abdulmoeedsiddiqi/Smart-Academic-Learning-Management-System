// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Find the login form if it exists on the page
  const loginForm = document.getElementById('loginForm');
  
  // If there's a login form, add a submit handler
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      // Don't use AJAX for login - we want a full page redirect to handle flash messages
      // The form will submit normally to the server
    });
  }

  // Add additional JavaScript functionality here
  
  // Initialize any Bootstrap components
  // For example, if you're using Bootstrap tooltips
  if (typeof $ !== 'undefined' && typeof $.fn.tooltip !== 'undefined') {
    $('[data-toggle="tooltip"]').tooltip();
  }
  
  // Hide alert messages after a few seconds
  setTimeout(() => {
    const alerts = document.querySelectorAll('.alert:not(.persistent), .bg-red-100:not(.persistent), .auto-dismiss');
    alerts.forEach(alert => {
      if (alert) {
        try {
          if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
            // Bootstrap 5
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
          } else if (typeof $ !== 'undefined' && $(alert).alert) {
            // Bootstrap 4
            $(alert).alert('close');
          } else {
            // Fallback for when Bootstrap is not available
            alert.style.transition = 'opacity 0.5s ease-out';
            alert.style.opacity = '0';
            setTimeout(() => {
              alert.style.display = 'none';
              if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
              }
            }, 300);
          }
        } catch (error) {
          console.warn('Error hiding alert:', error);
          alert.style.display = 'none';
        }
      }
    });
  }, 3000); // Hide after 3 seconds
});