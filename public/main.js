document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initBootstrapTooltips();
  autoDismissAlerts();
});

// Handles login form behavior
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      // Intentionally empty: allow normal form submission for flash messages
    });
  }
}

// Initializes Bootstrap tooltips if available
function initBootstrapTooltips() {
  if (window.$ && $.fn.tooltip) {
    $('[data-toggle="tooltip"]').tooltip();
  }
}

// Automatically dismisses alert messages after a timeout
function autoDismissAlerts() {
  setTimeout(() => {
    const alerts = document.querySelectorAll('.alert:not(.persistent), .bg-red-100:not(.persistent), .auto-dismiss');
    alerts.forEach(alert => dismissAlert(alert));
  }, 3000);
}

// Dismisses a single alert element using Bootstrap or fallback
function dismissAlert(alert) {
  if (!alert) return;

  try {
    if (window.bootstrap && bootstrap.Alert) {
      new bootstrap.Alert(alert).close();
    } else if (window.$ && $(alert).alert) {
      $(alert).alert('close');
    } else {
      fadeOutAndRemove(alert);
    }
  } catch (error) {
    console.warn('Error hiding alert:', error);
    alert.style.display = 'none';
  }
}

// Fallback animation for alert dismissal
function fadeOutAndRemove(element) {
  element.style.transition = 'opacity 0.5s ease-out';
  element.style.opacity = '0';
  setTimeout(() => {
    element.style.display = 'none';
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }, 300);
}
