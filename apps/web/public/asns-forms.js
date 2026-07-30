/**
 * ASNS Form Tracker — Universal snippet for client websites
 * 
 * Usage:
 *   <script src="https://admin.asns.ro/asns-forms.js" 
 *           data-key="YOUR_API_KEY"
 *           data-service="web-design">
 *   </script>
 * 
 * Optional attributes:
 *   data-form="#contact-form"   Target specific form (default: all forms)
 *   data-service="seo"         Pre-set service name
 *   data-success="Mulțumim!"   Custom success message
 */
;(function() {
  'use strict';
  
  var ENDPOINT = 'https://admin.asns.ro/api/leads/webhook';
  
  // Find our script tag to read config
  var scripts = document.querySelectorAll('script[data-key]');
  var script = scripts[scripts.length - 1];
  if (!script) return;
  
  var API_KEY = script.getAttribute('data-key');
  var SERVICE = script.getAttribute('data-service') || '';
  var FORM_SELECTOR = script.getAttribute('data-form') || '';
  var SUCCESS_MSG = script.getAttribute('data-success') || 'Cererea a fost trimisă cu succes!';
  
  if (!API_KEY) { console.warn('[ASNS Forms] Missing data-key attribute'); return; }
  
  // ─── UTM Persistence ───
  function getUtmParams() {
    var params = {};
    var search = window.location.search;
    var utm_keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    utm_keys.forEach(function(key) {
      var match = search.match(new RegExp('[?&]' + key + '=([^&]*)'));
      if (match) params[key] = decodeURIComponent(match[1]);
    });
    
    // Persist in sessionStorage
    if (Object.keys(params).length > 0) {
      try { sessionStorage.setItem('asns_utm', JSON.stringify(params)); } catch(e) {}
    } else {
      try {
        var stored = sessionStorage.getItem('asns_utm');
        if (stored) params = JSON.parse(stored);
      } catch(e) {}
    }
    
    return params;
  }
  
  // ─── Extract form fields ───
  function extractFormData(form) {
    var data = {};
    var fieldMap = {
      'name': ['name', 'nume', 'fullname', 'full_name', 'your-name', 'your_name', 'companyname', 'company_name', 'firma'],
      'email': ['email', 'e-mail', 'your-email', 'your_email', 'emailaddress', 'email_address'],
      'phone': ['phone', 'telefon', 'tel', 'your-phone', 'your_phone', 'mobile', 'mobil'],
      'message': ['message', 'mesaj', 'your-message', 'your_message', 'comments', 'comentariu', 'detalii', 'details', 'textarea'],
      'service': ['service', 'serviciu', 'subject', 'subiect', 'your-subject']
    };
    
    var inputs = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.type === 'submit' || el.type === 'button' || el.type === 'hidden') continue;
      
      var name = (el.name || el.id || '').toLowerCase();
      var value = el.value || '';
      if (!value.trim()) continue;
      
      // Map to standard fields
      var mapped = false;
      for (var standard in fieldMap) {
        for (var j = 0; j < fieldMap[standard].length; j++) {
          if (name.indexOf(fieldMap[standard][j]) !== -1) {
            data[standard] = value;
            mapped = true;
            break;
          }
        }
        if (mapped) break;
      }
      
      // Store unmapped fields in raw
      if (!mapped && value.trim()) {
        if (!data._extra) data._extra = {};
        data._extra[name] = value;
      }
    }
    
    return data;
  }
  
  // ─── Submit to webhook ───
  function submitLead(formData) {
    var utm = getUtmParams();
    
    var payload = {
      name: formData.name || '',
      email: formData.email || '',
      phone: formData.phone || '',
      message: formData.message || '',
      sourceService: formData.service || SERVICE,
      sourcePage: window.location.pathname,
      sourceReferrer: document.referrer || '',
      sourceFormId: formData._formId || '',
      utm_source: utm.utm_source || '',
      utm_medium: utm.utm_medium || '',
      utm_campaign: utm.utm_campaign || '',
      utm_term: utm.utm_term || '',
      utm_content: utm.utm_content || '',
      extra: formData._extra || {}
    };
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', ENDPOINT, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-API-Key', API_KEY);
    xhr.send(JSON.stringify(payload));
    
    return xhr;
  }
  
  // ─── Attach to forms ───
  function attachToForms() {
    var forms;
    if (FORM_SELECTOR) {
      var el = document.querySelector(FORM_SELECTOR);
      forms = el ? [el] : [];
    } else {
      forms = document.querySelectorAll('form');
    }
    
    for (var i = 0; i < forms.length; i++) {
      (function(form) {
        // Skip if already attached
        if (form.getAttribute('data-asns-attached')) return;
        form.setAttribute('data-asns-attached', 'true');
        
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          var data = extractFormData(form);
          data._formId = form.id || form.getAttribute('data-form-id') || '';
          
          // Show loading
          var submitBtn = form.querySelector('[type="submit"], button:not([type="button"])');
          var originalText = '';
          if (submitBtn) {
            originalText = submitBtn.textContent || submitBtn.value || '';
            if (submitBtn.tagName === 'INPUT') {
              submitBtn.value = 'Se trimite...';
            } else {
              submitBtn.textContent = 'Se trimite...';
            }
            submitBtn.disabled = true;
          }
          
          var xhr = submitLead(data);
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              // Success feedback
              var msg = document.createElement('div');
              msg.style.cssText = 'padding:12px 16px;background:#10b981;color:#fff;border-radius:8px;margin-top:12px;font-size:14px;text-align:center;';
              msg.textContent = SUCCESS_MSG;
              form.appendChild(msg);
              form.reset();
              
              setTimeout(function() { msg.remove(); }, 5000);
            } else {
              console.error('[ASNS Forms] Submission failed:', xhr.status);
            }
            
            // Restore button
            if (submitBtn) {
              submitBtn.disabled = false;
              if (submitBtn.tagName === 'INPUT') {
                submitBtn.value = originalText;
              } else {
                submitBtn.textContent = originalText;
              }
            }
          };
          
          xhr.onerror = function() {
            console.error('[ASNS Forms] Network error');
            if (submitBtn) {
              submitBtn.disabled = false;
              if (submitBtn.tagName === 'INPUT') {
                submitBtn.value = originalText;
              } else {
                submitBtn.textContent = originalText;
              }
            }
          };
        });
      })(forms[i]);
    }
  }
  
  // Init — capture UTMs immediately, attach to forms when DOM ready
  getUtmParams();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachToForms);
  } else {
    attachToForms();
  }
  
  // Watch for dynamically added forms (SPAs, lazy-loaded content)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function() { attachToForms(); });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
})();
