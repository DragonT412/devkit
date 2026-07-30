// ---- State ----
const state = {
  method: 'GET',
  url: '',
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  body: '',
  params: [],
  response: null,
  activePanel: 'history',
  activeTab: 'headers',
  activeRTab: 'body',
  history: [],
  collections: [],
};

// ---- DOM refs ----
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const dom = {
  methodSelect: $('#method-select'),
  urlInput: $('#url-input'),
  sendBtn: $('#send-btn'),
  saveBtn: $('#save-btn'),
  headersList: $('#headers-list'),
  addHeaderBtn: $('#add-header-btn'),
  bodyEditor: $('#body-editor'),
  paramsList: $('#params-list'),
  addParamBtn: $('#add-param-btn'),
  statusBadge: $('#status-badge'),
  durationText: $('#duration-text'),
  sizeText: $('#size-text'),
  errorText: $('#error-text'),
  responseBodyView: $('#response-body-view'),
  responseHeadersView: $('#response-headers-view'),
  responseRawView: $('#response-raw-view'),
  panelContent: $('#panel-content'),
  saveModal: $('#save-modal'),
  collectionSelect: $('#collection-select'),
  saveRequestName: $('#save-request-name'),
  saveConfirmBtn: $('#save-confirm-btn'),
};

// ---- Utility ----
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function statusClass(code) {
  if (!code) return '';
  if (code < 300) return 'success';
  if (code < 400) return 'redirect';
  if (code < 500) return 'client-error';
  return 'server-error';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- JSON Syntax Highlighting ----
function syntaxHighlight(json) {
  return json.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

function formatAndHighlight(text) {
  try {
    const parsed = JSON.parse(text);
    return syntaxHighlight(JSON.stringify(parsed, null, 2));
  } catch {
    return escapeHtml(text);
  }
}

// ---- Headers Editor ----
function makeKvRow(key, value, placeholder, onRemove) {
  const row = document.createElement('div');
  row.className = 'kv-row';
  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.placeholder = 'Key';
  keyInput.value = key || '';
  const valInput = document.createElement('input');
  valInput.type = 'text';
  valInput.placeholder = placeholder || 'Value';
  valInput.value = value || '';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'kv-remove';
  removeBtn.innerHTML = '&times;';
  removeBtn.onclick = () => { row.remove(); if (onRemove) onRemove(); };
  row.append(keyInput, valInput, removeBtn);
  return row;
}

function buildHeaders() {
  const result = {};
  dom.headersList.querySelectorAll('.kv-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const val = inputs[1].value.trim();
    if (key) result[key] = val;
  });
  return result;
}

function buildParams() {
  const result = {};
  dom.paramsList.querySelectorAll('.kv-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const val = inputs[1].value.trim();
    if (key) result[key] = val;
  });
  return result;
}

function addHeaderRow(key, value) {
  dom.headersList.appendChild(makeKvRow(key, value, 'Value'));
}
function addParamRow(key, value) {
  dom.paramsList.appendChild(makeKvRow(key, value, 'Value'));
}

// ---- Tabs ----
function setActiveTab(name) {
  state.activeTab = name;
  $$('.request-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  ['headers', 'body', 'params'].forEach(t => {
    $(`#tab-${t}`).classList.toggle('hidden', t !== name);
  });
}

function setActiveRTab(name) {
  state.activeRTab = name;
  $$('.response-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.rtab === name));
  ['body', 'headers', 'raw'].forEach(t => {
    $(`#rtab-${t}`).classList.toggle('hidden', t !== name);
  });
}

// ---- Request ----
async function sendRequest() {
  const url = dom.urlInput.value.trim();
  if (!url) {
    dom.urlInput.focus();
    return;
  }

  dom.sendBtn.disabled = true;
  dom.sendBtn.textContent = 'Sending...';
  dom.errorText.classList.add('hidden');
  dom.statusBadge.classList.add('hidden');
  dom.durationText.textContent = '';
  dom.sizeText.textContent = '';

  const headers = buildHeaders();
  const params = buildParams();

  // Append query params to URL
  let finalUrl = url;
  if (Object.keys(params).length > 0) {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl += sep + new URLSearchParams(params).toString();
  }

  try {
    const resp = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: state.method,
        url: finalUrl,
        headers: headers,
        body: state.body,
      }),
    });

    const data = await resp.json();
    state.response = data;

    // Status badge
    const sc = data.status_code;
    dom.statusBadge.textContent = sc + ' ' + (statusClass(sc) === 'success' ? 'OK' :
      statusClass(sc) === 'redirect' ? 'Redirect' :
      statusClass(sc) === 'client-error' ? 'Client Error' : 'Server Error');
    dom.statusBadge.className = 'status-badge ' + statusClass(sc);
    dom.statusBadge.classList.remove('hidden');

    // Timing & size
    dom.durationText.textContent = data.duration_ms + 'ms';
    dom.sizeText.textContent = formatBytes(new Blob([data.body]).size);

    // Body view with syntax highlight
    dom.responseBodyView.innerHTML = formatAndHighlight(data.body);

    // Raw view (plain text)
    dom.responseRawView.textContent = data.body;

    // Headers view
    dom.responseHeadersView.innerHTML = '';
    Object.entries(data.headers).forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'response-header-row';
      row.innerHTML = '<span class="rh-key">' + escapeHtml(k) + '</span><span class="rh-value">' + escapeHtml(v) + '</span>';
      dom.responseHeadersView.appendChild(row);
    });

    // Refresh history
    await loadHistory();
  } catch (err) {
    dom.errorText.textContent = 'Error: ' + err.message;
    dom.errorText.classList.remove('hidden');
  } finally {
    dom.sendBtn.disabled = false;
    dom.sendBtn.textContent = 'Send';
  }
}

// ---- History ----
async function loadHistory() {
  try {
    const resp = await fetch('/api/history');
    const data = await resp.json();
    state.history = data;
    if (state.activePanel === 'history') renderHistory();
  } catch { /* ignore */ }
}

function renderHistory() {
  const container = dom.panelContent;
  if (state.history.length === 0) {
    container.innerHTML = '<div class="history-empty">No requests yet.<br>Send a request to see it here.</div>';
    return;
  }
  let html = '<div class="history-list">';
  state.history.forEach((item, i) => {
    const date = new Date(item.created_at + 'Z');
    const time = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    html += `
      <div class="history-item" data-idx="${i}">
        <span class="method-badge method-${item.method}">${item.method}</span>
        <div>
          <div class="hi-url">${escapeHtml(item.url)}</div>
          <div class="hi-meta">${item.status_code || '---'} &middot; ${time} &middot; ${item.duration_ms}ms</div>
        </div>
        <button class="hi-delete" data-idx="${i}" title="Delete">&times;</button>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;

  // Click to load
  container.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.hi-delete')) return;
      const idx = parseInt(el.dataset.idx);
      const item = state.history[idx];
      loadRequestFromItem(item);
    });
  });

  // Delete
  container.querySelectorAll('.hi-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const item = state.history[idx];
      await fetch(`/api/history/${item.id}`, { method: 'DELETE' });
      await loadHistory();
    });
  });
}

function loadRequestFromItem(item) {
  dom.methodSelect.value = item.method;
  state.method = item.method;
  dom.urlInput.value = item.url;
  dom.headersList.innerHTML = '';

  let headers = {};
  try { headers = JSON.parse(item.request_headers); } catch {}
  Object.entries(headers).forEach(([k, v]) => addHeaderRow(k, v));
  if (Object.keys(headers).length === 0) addHeaderRow('', '');

  state.body = item.request_body || '';
  dom.bodyEditor.value = state.body;
}

// ---- Collections ----
async function loadCollections() {
  try {
    const resp = await fetch('/api/collections');
    state.collections = await resp.json();

    // Load requests for each collection
    for (const col of state.collections) {
      const rresp = await fetch(`/api/collections/${col.id}/requests`);
      col.requests = await rresp.json();
    }

    if (state.activePanel === 'collections') renderCollections();
  } catch { /* ignore */ }
}

function renderCollections() {
  const container = dom.panelContent;
  let html = '';

  if (state.collections.length === 0) {
    html += '<div class="history-empty">No collections yet.<br>Save a request to create one.</div>';
  } else {
    state.collections.forEach(col => {
      const open = col._open ? ' open' : '';
      html += `
        <div class="collection-group">
          <div class="collection-header${open}" data-cid="${col.id}">
            <span class="chevron">&#9654;</span>
            <span class="collection-name">${escapeHtml(col.name)}</span>
            <button class="collection-delete" data-cid="${col.id}" title="Delete">&times;</button>
          </div>
          <div class="collection-items${open}">`;
      (col.requests || []).forEach(req => {
        html += `
            <div class="collection-item" data-cid="${col.id}" data-rid="${req.id}">
              <span class="method-badge method-${req.method}">${req.method}</span>
              <span class="ci-name">${escapeHtml(req.name)}</span>
              <span class="ci-url">${escapeHtml(req.url)}</span>
            </div>`;
      });
      html += `
          </div>
        </div>`;
    });
  }

  html += `
    <div class="add-collection">
      <input id="new-collection-input" type="text" placeholder="New collection name...">
    </div>`;

  container.innerHTML = html;

  // Toggle expand
  container.querySelectorAll('.collection-header').forEach(h => {
    h.addEventListener('click', (e) => {
      if (e.target.closest('.collection-delete')) return;
      const cid = parseInt(h.dataset.cid);
      const col = state.collections.find(c => c.id === cid);
      if (col) col._open = !col._open;
      renderCollections();
    });
  });

  // Delete collection
  container.querySelectorAll('.collection-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cid = parseInt(btn.dataset.cid);
      await fetch(`/api/collections/${cid}`, { method: 'DELETE' });
      await loadCollections();
    });
  });

  // Click collection request
  container.querySelectorAll('.collection-item').forEach(el => {
    el.addEventListener('click', () => {
      const cid = parseInt(el.dataset.cid);
      const rid = parseInt(el.dataset.rid);
      const col = state.collections.find(c => c.id === cid);
      if (col) {
        const req = (col.requests || []).find(r => r.id === rid);
        if (req) loadRequestFromCollectionItem(req);
      }
    });
  });

  // New collection input
  const newInput = $('#new-collection-input');
  if (newInput) {
    newInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && newInput.value.trim()) {
        await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newInput.value.trim() }),
        });
        newInput.value = '';
        await loadCollections();
      }
    });
  }
}

function loadRequestFromCollectionItem(item) {
  dom.methodSelect.value = item.method;
  state.method = item.method;
  dom.urlInput.value = item.url;
  dom.headersList.innerHTML = '';

  let headers = {};
  try { headers = (typeof item.headers === 'string') ? JSON.parse(item.headers) : item.headers; } catch {}
  headers = headers || {};
  Object.entries(headers).forEach(([k, v]) => addHeaderRow(k, v));
  if (Object.keys(headers).length === 0) addHeaderRow('', '');

  state.body = item.body || '';
  dom.bodyEditor.value = state.body;
}

// ---- Save Modal ----
function showSaveModal() {
  dom.collectionSelect.innerHTML = '<option value="">Select collection...</option>' +
    state.collections.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  dom.saveRequestName.value = '';
  dom.saveModal.classList.remove('hidden');
}

function hideSaveModal() {
  dom.saveModal.classList.add('hidden');
}

async function saveToCollection() {
  const colId = dom.collectionSelect.value;
  const name = dom.saveRequestName.value.trim() || dom.urlInput.value.trim() || 'Untitled';
  const url = `${colId}/requests`;

  if (!colId) return;

  const headers = buildHeaders();
  await fetch(`/api/collections/${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name,
      method: state.method,
      url: dom.urlInput.value,
      headers: headers,
      body: state.body,
    }),
  });

  hideSaveModal();
  await loadCollections();
}

// ---- Sidebar panel switching ----
function setActivePanel(name) {
  state.activePanel = name;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  if (name === 'history') renderHistory();
  else if (name === 'collections') renderCollections();
}

// ---- Init ----
function init() {
  // Initial header row
  addHeaderRow('Content-Type', 'application/json');

  // Method select
  dom.methodSelect.addEventListener('change', () => {
    state.method = dom.methodSelect.value;
  });

  // URL input: Enter to send
  dom.urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) sendRequest();
  });

  // Send button
  dom.sendBtn.addEventListener('click', sendRequest);

  // Save button
  dom.saveBtn.addEventListener('click', () => {
    loadCollections().then(showSaveModal);
  });

  // Add header
  dom.addHeaderBtn.addEventListener('click', () => addHeaderRow('', ''));

  // Add param
  dom.addParamBtn.addEventListener('click', () => addParamRow('', ''));

  // Body editor
  dom.bodyEditor.addEventListener('input', () => {
    state.body = dom.bodyEditor.value;
  });

  // Tab switching
  $$('.request-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  $$('.response-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveRTab(btn.dataset.rtab));
  });

  // Sidebar nav
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => setActivePanel(btn.dataset.panel));
  });

  // Save modal
  dom.saveConfirmBtn.addEventListener('click', saveToCollection);
  $('#save-cancel-btn').addEventListener('click', hideSaveModal);
  $('#save-modal-close').addEventListener('click', hideSaveModal);
  $('#save-modal').querySelector('.modal-backdrop').addEventListener('click', hideSaveModal);

  // Copy response
  $('#copy-response-btn').addEventListener('click', () => {
    if (state.response) {
      navigator.clipboard.writeText(state.response.body).catch(() => {});
    }
  });

  // Format JSON
  $('#format-response-btn').addEventListener('click', () => {
    if (state.response) {
      try {
        const parsed = JSON.parse(state.response.body);
        state.response.body = JSON.stringify(parsed, null, 2);
        dom.responseBodyView.innerHTML = syntaxHighlight(state.response.body);
        dom.responseRawView.textContent = state.response.body;
      } catch { /* not JSON */ }
    }
  });

  // Global keyboard shortcut: Ctrl+Enter to send
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey && document.activeElement !== dom.bodyEditor) {
      e.preventDefault();
      sendRequest();
    }
  });

  // Initial data load
  loadHistory();
  loadCollections();
  setActivePanel('history');
  setActiveTab('headers');
  setActiveRTab('body');
}

document.addEventListener('DOMContentLoaded', init);
