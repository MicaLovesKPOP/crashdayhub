(function () {
  function setStatus(message, warn) {
    const el = document.getElementById('output-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('has-warning', !!warn);
  }

  function fallbackCopy(text) {
    const field = document.createElement('textarea');
    field.style.position = 'fixed';
    field.style.top = '-9999px';
    field.value = text;
    document.body.appendChild(field);
    field.focus();
    field.select();
    try {
      document.execCommand('copy');
      setStatus('Copied live preview output.');
    } catch (error) {
      setStatus('Copy failed. Select the preview and copy manually.', true);
    }
    document.body.removeChild(field);
  }

  function copyPreview(event) {
    const preview = document.getElementById('output-preview');
    const text = preview ? preview.textContent : '';
    if (!text || text === 'No output yet.') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (text.includes('…preview truncated')) {
      setStatus('Preview is truncated; use the main generated output for very large exports.', true);
      fallbackCopy(text);
      return;
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(function () { setStatus('Copied live preview output.'); })
        .catch(function () { fallbackCopy(text); });
      return;
    }

    fallbackCopy(text);
  }

  function bind() {
    const button = document.getElementById('copy-output');
    if (button) button.addEventListener('click', copyPreview, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
}());