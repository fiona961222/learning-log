(() => {
  const config = window.SUPABASE_URL && window.SUPABASE_PUBLISHABLE_KEY;
  const authPanel = document.querySelector('#auth-panel');
  const workspace = document.querySelector('#workspace');
  const authForm = document.querySelector('#auth-form');
  const authMessage = document.querySelector('#auth-message');
  const logForm = document.querySelector('#log-form');
  const logMessage = document.querySelector('#log-message');
  const recordsMessage = document.querySelector('#records-message');
  const recordList = document.querySelector('#record-list');
  const recentSummary = document.querySelector('#recent-summary');
  const loginButton = document.querySelector('#login-button');
  const signupButton = document.querySelector('#signup-button');
  let supabase;

  function message(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle('error', isError);
  }

  function friendlyError(error) {
    const known = {
      'Invalid login credentials': 'Email 或密碼不正確，請再試一次。',
      'User already registered': '這個 Email 已經註冊，請直接登入。',
      'Email not confirmed': '請先到信箱完成 Email 確認。'
    };
    return known[error?.message] || error?.message || '發生錯誤，請稍後再試。';
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    if (busy) {
      button.dataset.originalLabel = button.textContent;
      button.textContent = label;
    } else if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  }

  function showAuthenticated(user) {
    authPanel.classList.add('hidden');
    workspace.classList.remove('hidden');
    document.querySelector('#user-email').textContent = user.email || '學習者';
  }

  function showSignedOut() {
    workspace.classList.add('hidden');
    authPanel.classList.remove('hidden');
  }

  function addText(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function renderRecords(records) {
    recordList.replaceChildren();
    document.querySelector('#record-count').textContent = `${records.length} 筆紀錄`;
    updateRecentSummary(records);
    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      addText(empty, 'strong', '', '還沒有學習紀錄');
      addText(empty, 'span', '', '寫下第一筆，讓今天的努力留下來。');
      recordList.append(empty);
      return;
    }

    for (const record of records) {
      const card = document.createElement('article');
      card.className = 'record-card';
      const top = document.createElement('div');
      top.className = 'record-card-top';
      addText(top, 'span', 'record-date', formatDate(record.log_date));
      addText(top, 'span', 'record-minutes', `⏱ ${record.minutes} 分鐘`);
      card.append(top);
      addText(card, 'h3', '', '今天學了什麼');
      addText(card, 'p', 'record-learning', record.topic);
      if (record.note) {
        const stuck = document.createElement('div');
        stuck.className = 'record-stuck-wrap';
        addText(stuck, 'h4', '', '卡關筆記');
        addText(stuck, 'p', 'record-stuck', record.note);
        card.append(stuck);
      }
      const actions = document.createElement('div');
      actions.className = 'record-actions';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-button';
      remove.textContent = '刪除紀錄';
      remove.addEventListener('click', () => deleteRecord(record.id, remove));
      actions.append(remove);
      card.append(actions);
      recordList.append(card);
    }
  }

  function updateRecentSummary(records) {
    const today = localToday();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const recentRecords = records.filter(record => record.log_date >= startDate && record.log_date <= today);
    const totalMinutes = recentRecords.reduce((total, record) => total + (Number(record.minutes) || 0), 0);
    recentSummary.textContent = `最近 7 天：${totalMinutes} 分鐘，${recentRecords.length} 筆紀錄`;
  }

  function formatDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, day)));
  }

  async function loadRecords() {
    message(recordsMessage, '正在載入紀錄……');
    const { data, error } = await supabase
      .from('learning_logs')
      .select('id, log_date, topic, minutes, note, created_at')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      message(recordsMessage, `載入失敗：${friendlyError(error)}`, true);
      return;
    }
    message(recordsMessage, '');
    renderRecords(data || []);
  }

  async function deleteRecord(id, button) {
    if (!window.confirm('確定要刪除這筆學習紀錄嗎？')) return;
    button.disabled = true;
    const { error } = await supabase.from('learning_logs').delete().eq('id', id);
    if (error) {
      button.disabled = false;
      message(recordsMessage, `刪除失敗：${friendlyError(error)}`, true);
      return;
    }
    message(recordsMessage, '紀錄已刪除。');
    await loadRecords();
  }

  async function signIn(event) {
    event.preventDefault();
    message(authMessage, '');
    setBusy(loginButton, true, '登入中…');
    const { error } = await supabase.auth.signInWithPassword({
      email: document.querySelector('#auth-email').value.trim(),
      password: document.querySelector('#auth-password').value
    });
    setBusy(loginButton, false);
    if (error) message(authMessage, friendlyError(error), true);
  }

  async function signUp() {
    message(authMessage, '');
    if (!authForm.reportValidity()) return;
    setBusy(signupButton, true, '建立中…');
    const { data, error } = await supabase.auth.signUp({
      email: document.querySelector('#auth-email').value.trim(),
      password: document.querySelector('#auth-password').value
    });
    setBusy(signupButton, false);
    if (error) {
      message(authMessage, friendlyError(error), true);
    } else if (data.session) {
      message(authMessage, '帳戶建立完成，歡迎開始記錄。');
    } else {
      message(authMessage, '帳戶已建立，請查看信箱完成確認後再登入。');
    }
  }

  async function saveRecord(event) {
    event.preventDefault();
    const button = logForm.querySelector('button[type="submit"]');
    message(logMessage, '');
    setBusy(button, true, '儲存中…');
    const { error } = await supabase.from('learning_logs').insert({
      log_date: document.querySelector('#log-date').value,
      topic: document.querySelector('#log-learning').value.trim(),
      minutes: Number(document.querySelector('#log-minutes').value),
      note: document.querySelector('#log-stuck').value.trim() || null
    });
    setBusy(button, false);
    if (error) {
      message(logMessage, `儲存失敗：${friendlyError(error)}`, true);
      return;
    }
    logForm.reset();
    document.querySelector('#log-date').value = localToday();
    message(logMessage, '已儲存，做得好！');
    await loadRecords();
  }

  function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  async function start() {
    document.querySelector('#log-date').value = localToday();
    if (!window.supabase || !config || config.includes('貼上')) {
      message(authMessage, '請先在 config.js 填入 Supabase Project URL 和 publishable key。', true);
      loginButton.disabled = true;
      signupButton.disabled = true;
      return;
    }
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
    authForm.addEventListener('submit', signIn);
    signupButton.addEventListener('click', signUp);
    logForm.addEventListener('submit', saveRecord);
    document.querySelector('#logout-button').addEventListener('click', async () => {
      const { error } = await supabase.auth.signOut();
      if (error) message(recordsMessage, friendlyError(error), true);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        showAuthenticated(session.user);
        window.setTimeout(() => loadRecords(), 0);
      } else showSignedOut();
    });
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      showAuthenticated(session.user);
      await loadRecords();
    }
  }

  start();
})();
