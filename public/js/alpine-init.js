/**
 * Alpine.js Initialization & Custom Components for SALAMS
 */

document.addEventListener('alpine:init', () => {
  /** -------------------------
   *  Global Stores
   *  -------------------------
   */

  // Store: Feature Modal (Home Page)
  Alpine.store('featureModal', {
    open: false,
    currentFeature: null,

    getFeatureTitle() {
      const titles = {
        course: 'Course Management',
        assignment: 'Assignment Management',
        grade: 'Grade Tracking',
        attendance: 'Attendance Management',
        roles: 'User Role Management',
        reporting: 'Comprehensive Reporting'
      };
      return titles[this.currentFeature] || 'SALAMS Features';
    }
  });

  /** -------------------------
   *  Alpine Data Components
   *  -------------------------
   */

  // Component: Form Validation
  Alpine.data('formValidation', () => ({
    submitted: false,
    errors: {},

    validate(form) {
      this.submitted = true;
      this.errors = {};

      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (!input.checkValidity()) {
          this.errors[input.name] = this.getValidationMessage(input);
        }
      });

      return Object.keys(this.errors).length === 0;
    },

    getValidationMessage(input) {
      if (input.validity.valueMissing)
        return input.dataset.errorRequired || 'This field is required';

      if (input.validity.typeMismatch)
        return input.dataset.errorType || 'Please enter a valid format';

      if (input.validity.tooShort)
        return input.dataset.errorMinlength || `Must be at least ${input.minLength} characters`;

      if (input.validity.patternMismatch)
        return input.dataset.errorPattern || 'Please enter a valid format';

      if (input.validity.customError)
        return input.validationMessage;

      return 'Invalid input';
    },

    hasError(name) {
      return this.submitted && this.errors[name];
    },

    getError(name) {
      return this.errors[name];
    }
  }));

  // Component: Flash Notifications
  Alpine.data('notifications', () => ({
    messages: [],

    addMessage(type, text, timeout = 5000) {
      const id = Date.now();
      this.messages.push({ id, type, text });

      if (timeout) {
        setTimeout(() => this.removeMessage(id), timeout);
      }
    },

    removeMessage(id) {
      this.messages = this.messages.filter(msg => msg.id !== id);
    }
  }));

  // Component: Dropdown
  Alpine.data('dropdown', () => ({
    open: false,
    toggle() { this.open = !this.open; },
    close() { this.open = false; }
  }));

  // Component: Tabs
  Alpine.data('tabs', () => ({
    activeTab: 0,
    isActive(tab) { return this.activeTab === tab; },
    setActive(tab) { this.activeTab = tab; }
  }));

  // Component: Modal
  Alpine.data('modal', () => ({
    open: false,
    toggle() { this.open = !this.open; },
    close() { this.open = false; }
  }));
});
