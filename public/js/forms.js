/**
 * Form utilities for the Learning Management System (SALAMS)
 */

document.addEventListener('DOMContentLoaded', function() {
  initFormValidation();
  initRichTextEditors();
  initFileUploads();
  initDatePickers();
  initMultiSelects();
});

/**
 * Initialize form validation for all forms with the 'needs-validation' class
 */
function initFormValidation() {
  const forms = document.querySelectorAll('.needs-validation');
  
  Array.from(forms).forEach(form => {
    // Custom validation messages
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      // Add custom error messages based on validation attributes
      if (input.hasAttribute('required')) {
        input.setAttribute('data-error-required', 'This field is required');
      }
      
      if (input.hasAttribute('minlength')) {
        const min = input.getAttribute('minlength');
        input.setAttribute('data-error-minlength', `Must be at least ${min} characters`);
      }
      
      if (input.hasAttribute('pattern')) {
        input.setAttribute('data-error-pattern', 'Please enter a valid format');
      }
      
      // Listen for input changes to show/hide error messages
      input.addEventListener('input', function() {
        validateInput(input);
      });
      
      input.addEventListener('blur', function() {
        validateInput(input);
      });
    });
    
    // Form submission handler
    form.addEventListener('submit', function(event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        
        // Validate all inputs
        inputs.forEach(input => {
          validateInput(input);
        });
        
        // Focus first invalid input
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.focus();
        }
      }
      
      form.classList.add('was-validated');
    }, false);
  });
}

/**
 * Validate a single input field and show appropriate error messages
 */
function validateInput(input) {
  const errorElement = input.nextElementSibling;
  
  if (!input.validity.valid) {
    let errorMessage = '';
    
    if (input.validity.valueMissing) {
      errorMessage = input.getAttribute('data-error-required') || 'This field is required';
    } else if (input.validity.tooShort) {
      errorMessage = input.getAttribute('data-error-minlength') || `Must be at least ${input.getAttribute('minlength')} characters`;
    } else if (input.validity.patternMismatch) {
      errorMessage = input.getAttribute('data-error-pattern') || 'Please enter a valid format';
    } else if (input.validity.typeMismatch) {
      if (input.type === 'email') {
        errorMessage = 'Please enter a valid email address';
      } else if (input.type === 'url') {
        errorMessage = 'Please enter a valid URL';
      } else {
        errorMessage = 'Please enter a valid value';
      }
    }
    
    if (errorElement && errorElement.classList.contains('invalid-feedback')) {
      errorElement.textContent = errorMessage;
    } else {
      input.classList.add('is-invalid');
      const newErrorElement = document.createElement('div');
      newErrorElement.className = 'invalid-feedback';
      newErrorElement.textContent = errorMessage;
      input.parentNode.insertBefore(newErrorElement, input.nextSibling);
    }
  } else {
    input.classList.remove('is-invalid');
    if (errorElement && errorElement.classList.contains('invalid-feedback')) {
      errorElement.textContent = '';
    }
  }
}

/**
 * Initialize rich text editors for textareas with the 'rich-text-editor' class
 * This assumes you're including a library like TinyMCE, Quill, etc.
 */
function initRichTextEditors() {
  const richTextAreas = document.querySelectorAll('.rich-text-editor');
  
  if (richTextAreas.length > 0) {
    // Check if rich text editor library is available
    if (typeof tinymce !== 'undefined') {
      // TinyMCE implementation
      tinymce.init({
        selector: '.rich-text-editor',
        height: 300,
        menubar: false,
        plugins: [
          'advlist autolink lists link image charmap print preview anchor',
          'searchreplace visualblocks code fullscreen',
          'insertdatetime media table paste code help wordcount'
        ],
        toolbar: 'undo redo | formatselect | bold italic backcolor | \
                 alignleft aligncenter alignright alignjustify | \
                 bullist numlist outdent indent | removeformat | help'
      });
    } else if (typeof Quill !== 'undefined') {
      // Quill implementation
      richTextAreas.forEach(textarea => {
        // Create container for Quill
        const container = document.createElement('div');
        container.style.height = '300px';
        textarea.parentNode.insertBefore(container, textarea);
        textarea.style.display = 'none';
        
        // Initialize Quill
        const quill = new Quill(container, {
          theme: 'snow',
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline', 'strike'],
              ['blockquote', 'code-block'],
              [{ 'header': 1 }, { 'header': 2 }],
              [{ 'list': 'ordered' }, { 'list': 'bullet' }],
              [{ 'indent': '-1' }, { 'indent': '+1' }],
              ['link', 'image'],
              ['clean']
            ]
          }
        });
        
        // Update textarea value on editor change
        quill.on('text-change', function() {
          textarea.value = quill.root.innerHTML;
        });
      });
    }
  }
}

/**
 * Initialize file uploads with preview functionality
 */
function initFileUploads() {
  const fileInputs = document.querySelectorAll('.custom-file-input');
  
  fileInputs.forEach(input => {
    const label = input.nextElementSibling;
    const container = input.closest('.custom-file-container');
    let previewElement = null;
    
    if (container) {
      previewElement = container.querySelector('.file-preview') || createPreviewElement(container);
    }
    
    input.addEventListener('change', function() {
      const file = this.files[0];
      
      if (file) {
        // Update label text
        if (label) {
          label.textContent = file.name;
        }
        
        // Show preview for image files
        if (previewElement && file.type.startsWith('image/')) {
          const reader = new FileReader();
          
          reader.onload = function(e) {
            previewElement.style.backgroundImage = `url(${e.target.result})`;
            previewElement.classList.add('has-preview');
          };
          
          reader.readAsDataURL(file);
        } else if (previewElement) {
          // Show icon for non-image files
          previewElement.style.backgroundImage = 'none';
          previewElement.classList.add('has-preview');
          previewElement.innerHTML = getFileIcon(file.name);
        }
      } else {
        // Reset label and preview
        if (label) {
          label.textContent = 'Choose file';
        }
        
        if (previewElement) {
          previewElement.style.backgroundImage = 'none';
          previewElement.classList.remove('has-preview');
          previewElement.innerHTML = '';
        }
      }
    });
  });
}

/**
 * Create a preview element for file uploads
 */
function createPreviewElement(container) {
  const previewElement = document.createElement('div');
  previewElement.className = 'file-preview';
  container.appendChild(previewElement);
  return previewElement;
}

/**
 * Get appropriate icon based on file extension
 */
function getFileIcon(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  let iconClass = 'far fa-file';
  
  switch (extension) {
    case 'pdf':
      iconClass = 'far fa-file-pdf';
      break;
    case 'doc':
    case 'docx':
      iconClass = 'far fa-file-word';
      break;
    case 'xls':
    case 'xlsx':
      iconClass = 'far fa-file-excel';
      break;
    case 'ppt':
    case 'pptx':
      iconClass = 'far fa-file-powerpoint';
      break;
    case 'zip':
    case 'rar':
      iconClass = 'far fa-file-archive';
      break;
    case 'txt':
      iconClass = 'far fa-file-alt';
      break;
    case 'mp3':
    case 'wav':
      iconClass = 'far fa-file-audio';
      break;
    case 'mp4':
    case 'avi':
    case 'mov':
      iconClass = 'far fa-file-video';
      break;
  }
  
  return `<i class="${iconClass} fa-3x"></i>`;
}

/**
 * Initialize date pickers
 * Assumes Flatpickr or similar library is included
 */
function initDatePickers() {
  const datePickers = document.querySelectorAll('.datepicker');
  
  if (datePickers.length > 0 && typeof flatpickr !== 'undefined') {
    flatpickr('.datepicker', {
      dateFormat: 'Y-m-d',
      allowInput: true
    });
    
    // Special date range pickers
    const dateRangePickers = document.querySelectorAll('.daterange-picker');
    if (dateRangePickers.length > 0) {
      flatpickr('.daterange-picker', {
        mode: 'range',
        dateFormat: 'Y-m-d'
      });
    }
  }
}

/**
 * Initialize multi-select dropdowns
 * Assumes Select2 or similar library is included
 */
function initMultiSelects() {
  const multiSelects = document.querySelectorAll('.multiselect');
  
  if (multiSelects.length > 0 && typeof $ !== 'undefined' && typeof $.fn.select2 !== 'undefined') {
    $(document).ready(function() {
      $('.multiselect').select2({
        theme: 'bootstrap-5',
        width: '100%'
      });
    });
  }
}