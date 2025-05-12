document.addEventListener('DOMContentLoaded', () => {
  initializeFormValidation();
  initializeRichTextEditors();
  initializeFileUploadPreviews();
  initializeDatePickers();
  initializeMultiSelectDropdowns();
});

/**
 * Initialize form validation for forms with the 'needs-validation' class.
 */
function initializeFormValidation() {
  const forms = document.querySelectorAll('.needs-validation');

  forms.forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
}

/**
 * Initialize rich text editors for textareas with the 'rich-text-editor' class.
 * Supports TinyMCE and Quill.
 */
function initializeRichTextEditors() {
  const editors = document.querySelectorAll('.rich-text-editor');

  if (editors.length > 0) {
    if (typeof tinymce !== 'undefined') {
      tinymce.init({
        selector: '.rich-text-editor',
        height: 300,
        menubar: false,
        plugins: [
          'advlist autolink lists link image charmap print preview anchor',
          'searchreplace visualblocks code fullscreen',
          'insertdatetime media table paste code help wordcount'
        ],
        toolbar: 'undo redo | formatselect | bold italic backcolor | ' +
                 'alignleft aligncenter alignright alignjustify | ' +
                 'bullist numlist outdent indent | removeformat | help'
      });
    } else if (typeof Quill !== 'undefined') {
      editors.forEach(textarea => {
        const container = document.createElement('div');
        container.style.height = '300px';
        textarea.parentNode.insertBefore(container, textarea);
        textarea.style.display = 'none';

        const quill = new Quill(container, {
          theme: 'snow',
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline', 'strike'],
              ['blockquote]()
