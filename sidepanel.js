/* ==========================================================================
   SideNote - Chrome Extension Side Panel Core JS Logic (Rich Text & Dikey Klasör)
   ========================================================================== */

// 1. STATE MANAGEMENT
let state = {
  folders: [],
  notes: [],
  settings: {
    theme: "dark",
    activeFolderId: "all"
  }
};

// Editing track pointers
let editingNoteId = null;

// Selectors
const DOM = {
  body: document.body,
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  searchInput: document.getElementById("search-input"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  addNoteBtn: document.getElementById("add-note-btn"),
  addFolderBtn: document.getElementById("sidebar-add-folder-btn"), // Güncellenen ID
  settingsBtn: document.getElementById("sidebar-settings-btn"), // Ayarlar Butonu
  foldersContainer: document.getElementById("sidebar-folders-list"), // Dikey klasör listesi
  currentFolderTitle: document.getElementById("current-folder-title"),
  noteCount: document.getElementById("note-count"),
  notesContainer: document.getElementById("notes-container"),
  emptyStateView: document.getElementById("empty-state-view"),
  emptyAddBtn: document.getElementById("empty-add-btn"),
  
  // Note Modal
  noteModal: document.getElementById("note-modal"),
  modalTitle: document.getElementById("modal-title"),
  closeNoteModal: document.getElementById("close-note-modal"),
  noteTitleInput: document.getElementById("note-title-input"),
  noteContentEditor: document.getElementById("note-content-editor"), // contenteditable div
  noteFolderSelect: document.getElementById("note-folder-select"),
  cancelNoteBtn: document.getElementById("cancel-note-btn"),
  saveNoteBtn: document.getElementById("save-note-btn"),
  
  // Folder Modal
  folderModal: document.getElementById("folder-modal"),
  folderModalTitle: document.getElementById("folder-modal-title"),
  closeFolderModal: document.getElementById("close-folder-modal"),
  folderEmojiInput: document.getElementById("folder-emoji-input"),
  folderNameInput: document.getElementById("folder-name-input"),
  cancelFolderBtn: document.getElementById("cancel-folder-btn"),
  saveFolderBtn: document.getElementById("save-folder-btn"),
  
  // Settings Modal
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsModal: document.getElementById("close-settings-modal"),
  saveSettingsBtn: document.getElementById("save-settings-btn"),
  exportNotesBtn: document.getElementById("export-notes-btn"),
  importNotesBtn: document.getElementById("import-notes-btn"),
  importFileInput: document.getElementById("import-file-input"),
  accentPickerContainer: document.getElementById("accent-picker-container"),
  themePickerContainer: document.getElementById("theme-picker-container"),

  // Toast
  toastContainer: document.getElementById("toast-container"),

  // Login View Selectors
  loginView: document.getElementById("login-view"),
  loginUsernameInput: document.getElementById("login-username"),
  loginPasswordInput: document.getElementById("login-password"),
  loginSubmitBtn: document.getElementById("login-submit-btn"),
  loginErrorMsg: document.getElementById("login-error-msg"),
  sidebarLogoutBtn: document.getElementById("sidebar-logout-btn"),

  // Server & Admin Selectors
  adminNewUsername: document.getElementById("admin-new-username"),
  adminNewPassword: document.getElementById("admin-new-password"),
  adminCreateUserBtn: document.getElementById("admin-create-user-btn"),
  adminUsersTbody: document.getElementById("admin-users-tbody"),
  noteIsGlobalInput: document.getElementById("note-is-global-input"),
  adminBtn: document.getElementById("sidebar-admin-btn"),
  adminModal: document.getElementById("admin-modal"),
  closeAdminModal: document.getElementById("close-admin-modal"),
  saveAdminBtn: document.getElementById("save-admin-btn"),

  // User Profile Selectors
  profileBtn: document.getElementById("sidebar-profile-btn"),
  profileModal: document.getElementById("profile-modal"),
  closeProfileModal: document.getElementById("close-profile-modal"),
  saveProfileBtn: document.getElementById("save-profile-btn"),
  profileAvatarChar: document.getElementById("profile-avatar-char"),
  profileUsernameDisplay: document.getElementById("profile-username-display"),
  profileRoleDisplay: document.getElementById("profile-role-display"),
  profileOldPassword: document.getElementById("profile-old-password"),
  profileNewPassword: document.getElementById("profile-new-password"),
  profileChangePasswordBtn: document.getElementById("profile-change-password-btn")
};

// 2. DATA STORAGE LAYER (Chrome Storage with LocalStorage fallback & try-catch security)
const Storage = {
  isExtension: typeof chrome !== "undefined" && chrome.storage && chrome.storage.local,

  save: function() {
    try {
      if (this.isExtension) {
        chrome.storage.local.set({ sidenote_state: state }, () => {
          if (chrome.runtime.lastError) {
            console.error("Storage error:", chrome.runtime.lastError);
          }
        });
      } else {
        localStorage.setItem("sidenote_state", JSON.stringify(state));
      }
    } catch (e) {
      console.error("Storage save failed:", e);
    }
  },

  load: function(callback) {
    const defaultState = {
      folders: [
        { id: "f1", name: "Genel Şablonlar", emoji: "📁" },
        { id: "f2", name: "Kod Parçacıkları", emoji: "💻" }
      ],
      notes: [
        {
          id: "n1",
          folderId: "f1",
          title: "Hoş Geldiniz! 👋",
          content: "<div><b>PioNotes</b>'a hoş geldiniz!</div><div>Bu karta tıklayarak içeriği <i>biçimlendirilmiş</i> olarak kopyalayabilirsiniz.</div><div><br></div><div>Notlarınızı <b>kalın</b>, <i>italik</i> veya liste şeklinde düzenleyin! 🚀</div>",
          color: "blue",
          createdAt: Date.now()
        },
        {
          id: "n2",
          folderId: "f2",
          title: "React Arrow Component",
          content: "<div>const MyComponent = () =&gt; {</div><div>&nbsp; return (</div><div>&nbsp; &nbsp; &lt;div&gt;Merhaba Dünya&lt;/div&gt;</div><div>&nbsp; );</div><div>};</div>",
          color: "purple",
          createdAt: Date.now() - 60000
        }
      ],
      settings: {
        theme: "dark",
        activeFolderId: "all",
        malatyaUnlocked: false,
        apiUrl: "http://localhost:3000",
        token: null,
        user: null
      }
    };

    try {
      if (this.isExtension) {
        chrome.storage.local.get(["sidenote_state"], (result) => {
          if (result && result.sidenote_state) {
            state = result.sidenote_state;
            // Emniyet bariyerleri
            if (!state.folders) state.folders = [];
            if (!state.notes) state.notes = [];
            if (!state.settings) state.settings = defaultState.settings;
            if (state.settings.malatyaUnlocked === undefined) state.settings.malatyaUnlocked = false;
            if (state.settings.apiUrl === undefined) state.settings.apiUrl = "http://localhost:3000";
            if (state.settings.token === undefined) state.settings.token = null;
            if (state.settings.user === undefined) state.settings.user = null;
          } else {
            state = defaultState;
            this.save();
          }
          if (callback) callback();
        });
      } else {
        const local = localStorage.getItem("sidenote_state");
        if (local) {
          state = JSON.parse(local);
          if (!state.folders) state.folders = [];
          if (!state.notes) state.notes = [];
          if (!state.settings) state.settings = defaultState.settings;
          if (state.settings.malatyaUnlocked === undefined) state.settings.malatyaUnlocked = false;
          if (state.settings.apiUrl === undefined) state.settings.apiUrl = "http://localhost:3000";
          if (state.settings.token === undefined) state.settings.token = null;
          if (state.settings.user === undefined) state.settings.user = null;
        } else {
          state = defaultState;
          this.save();
        }
        if (callback) callback();
      }
    } catch (e) {
      console.error("Storage load failed, using default state:", e);
      state = defaultState;
      if (callback) callback();
    }
  }
};

// 3. TOAST SYSTEM
function showToast(message, type = "success") {
  if (!DOM.toastContainer) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type === "success" ? "toast-success" : ""}`;
  
  const content = document.createElement("span");
  content.innerText = message;
  
  const close = document.createElement("span");
  close.style.cursor = "pointer";
  close.innerHTML = "&times;";
  close.addEventListener("click", () => toast.remove());
  
  toast.appendChild(content);
  toast.appendChild(close);
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 2200);
}

// 4. THEME CONTROLLER
// 4. THEME CONTROLLER
function updateMalatyaElements() {
  try {
    const unlocked = state.settings && state.settings.malatyaUnlocked;
    const isMalatyaThemeActive = state.settings && state.settings.theme === "malatya";
    
    const logoPeach = document.getElementById("logo-peach");
    const headerPeach = document.getElementById("header-peach");
    const malatyaThemeBtn = document.getElementById("theme-malatya-btn");
    
    if (logoPeach) {
      if (isMalatyaThemeActive) {
        logoPeach.classList.remove("hidden");
      } else {
        logoPeach.classList.add("hidden");
      }
    }
    
    if (headerPeach) {
      if (isMalatyaThemeActive) {
        headerPeach.classList.remove("hidden");
      } else {
        headerPeach.classList.add("hidden");
      }
    }
    
    if (malatyaThemeBtn) {
      if (unlocked) {
        malatyaThemeBtn.classList.remove("hidden");
      } else {
        malatyaThemeBtn.classList.add("hidden");
      }
    }
  } catch (e) {
    console.error("updateMalatyaElements error:", e);
  }
}

function initTheme() {
  try {
    if (!DOM.body) return;
    const activeTheme = state.settings.theme || "dark";
    
    // Always sync Malatya elements visibility first
    updateMalatyaElements();
    
    // Remove all theme classes first
    DOM.body.classList.remove("dark-theme", "light-theme", "gradient-theme", "cyberpunk-theme", "matrix-theme", "sunset-theme", "malatya-theme");
    
    // Add active theme class
    DOM.body.classList.add(`${activeTheme}-theme`);
    
    // Style toggle button icon and visibility based on theme
    if (DOM.themeToggleBtn) {
      DOM.themeToggleBtn.classList.remove("hidden");
      
      const moon = DOM.themeToggleBtn.querySelector(".moon-icon");
      const sun = DOM.themeToggleBtn.querySelector(".sun-icon");
      if (activeTheme === "dark" || activeTheme === "malatya") {
        if (moon) moon.classList.add("hidden");
        if (sun) sun.classList.remove("hidden");
      } else {
        if (sun) sun.classList.add("hidden");
        if (moon) moon.classList.remove("hidden");
      }
    }
    
    // Update theme picker buttons active class inside Settings Modal
    const pickerBtns = document.querySelectorAll(".theme-picker-btn");
    pickerBtns.forEach(btn => {
      if (btn.dataset.theme === activeTheme) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  } catch (e) {
    console.error("initTheme error:", e);
  }
}

function toggleTheme() {
  const currentTheme = state.settings.theme || "dark";
  let nextTheme = "dark";
  
  if (currentTheme === "dark") {
    nextTheme = "light";
  } else if (currentTheme === "light") {
    if (state.settings && state.settings.malatyaUnlocked) {
      nextTheme = "malatya";
    } else {
      nextTheme = "dark";
    }
  } else if (currentTheme === "malatya") {
    nextTheme = "dark";
  }
  
  state.settings.theme = nextTheme;
  Storage.save();
  initTheme();
  
  // Re-apply accent color configuration since theme changed
  if (nextTheme === "malatya") {
    applyAccentColor("amber");
  } else {
    applyAccentColor(state.settings.accentColor || "indigo");
  }
  
  const themeNames = {
    dark: "Premium Koyu Tema 🌙 Etkinleştirildi!",
    light: "Elegant Açık Tema ☀️ Etkinleştirildi!",
    malatya: "Özel Malatyalı Teması 🍑🔥 Etkinleştirildi!"
  };
  showToast(themeNames[nextTheme]);
}

// Accent Color options configurations
const ACCENT_COLORS = {
  indigo: {
    dark: { main: "#6366f1", hover: "#4f46e5" },
    light: { main: "#4f46e5", hover: "#3730a3" }
  },
  teal: {
    dark: { main: "#14b8a6", hover: "#0d9488" },
    light: { main: "#0d9488", hover: "#0f766e" }
  },
  emerald: {
    dark: { main: "#10b981", hover: "#059669" },
    light: { main: "#059669", hover: "#047857" }
  },
  amber: {
    dark: { main: "#fb923c", hover: "#ea580c" },
    light: { main: "#ea580c", hover: "#c2410c" }
  },
  rose: {
    dark: { main: "#f43f5e", hover: "#e11d48" },
    light: { main: "#e11d48", hover: "#be123c" }
  },
  violet: {
    dark: { main: "#8b5cf6", hover: "#7c3aed" },
    light: { main: "#7c3aed", hover: "#6d28d9" }
  }
};

function applyAccentColor(accentName) {
  try {
    const theme = state.settings.theme || "dark";
    const colors = ACCENT_COLORS[accentName] || ACCENT_COLORS.indigo;
    
    // Resolve theme to either dark or light configurations
    const resolvedTheme = (theme === "light") ? "light" : "dark";
    const hexConfig = colors[resolvedTheme];
    
    const mainColor = hexConfig.main;
    const hoverColor = hexConfig.hover;
    
    if (DOM.body) {
      DOM.body.style.setProperty('--accent-color', mainColor);
      DOM.body.style.setProperty('--accent-hover', hoverColor);
      DOM.body.style.setProperty('--accent-glow', mainColor + "30"); // Glow alpha shadow
    }
    
    state.settings.accentColor = accentName;
    Storage.save();
    
    // Update settings modal accent color dots active class status
    const dots = document.querySelectorAll(".accent-dot");
    dots.forEach(dot => {
      if (dot.dataset.accent === accentName) {
        dot.classList.add("active");
      } else {
        dot.classList.remove("active");
      }
    });
  } catch (e) {
    console.error("applyAccentColor error:", e);
  }
}

// 5. ADVANCED DUAL-FORMAT clipboard copy (HTML & Plain Text)
function copyNoteToClipboard(htmlContent, cardElement) {
  if (!htmlContent) return;
  
  // Create plain text representation from HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;
  const plainTextContent = tempDiv.innerText || tempDiv.textContent || "";

  try {
    const blobHtml = new Blob([htmlContent], { type: "text/html" });
    const blobText = new Blob([plainTextContent], { type: "text/plain" });
    
    // Modern Clipboard API using ClipboardItem
    const item = new ClipboardItem({
      "text/html": blobHtml,
      "text/plain": blobText
    });
    
    navigator.clipboard.write([item]).then(() => {
      cardElement.classList.add("copied-pulse");
      showToast("Not Kopyalandı! 📋");
      setTimeout(() => {
        cardElement.classList.remove("copied-pulse");
      }, 400);
    }).catch(err => {
      console.warn("Rich copy failed, fallback to plain text:", err);
      fallbackPlainCopy(plainTextContent, cardElement);
    });
  } catch (e) {
    console.warn("ClipboardItem not supported, fallback to plain text:", e);
    fallbackPlainCopy(plainTextContent, cardElement);
  }
}

function fallbackPlainCopy(text, cardElement) {
  navigator.clipboard.writeText(text).then(() => {
    cardElement.classList.add("copied-pulse");
    showToast("Not Kopyalandı! 📋");
    setTimeout(() => {
      cardElement.classList.remove("copied-pulse");
    }, 400);
  }).catch(err => {
    console.error("Copy fully failed:", err);
    showToast("Metin kopyalanamadı!", "error");
  });
}

// 6. RENDER ENGINE (DIKEY KLASÖRLEME VE NOT LISTELEME)
function renderFolders() {
  if (!DOM.foldersContainer) return;
  DOM.foldersContainer.innerHTML = "";
  DOM.noteFolderSelect.innerHTML = '<option value="none">Klasörsüz (Genel)</option>';

  const allCount = state.notes.length;
  const uncategorizedCount = state.notes.filter(n => n.folderId === "none").length;

  // 1. "Tüm Notlar" Dikey Item
  const allItem = document.createElement("div");
  allItem.className = `sidebar-folder-item ${state.settings.activeFolderId === "all" ? "active" : ""}`;
  allItem.innerHTML = `
    <span class="folder-icon" title="📚 Tüm Notlar">📚</span>
    <span class="folder-name">Tüm Notlar</span>
    <span class="folder-count-badge">${allCount}</span>
  `;
  allItem.addEventListener("click", () => selectFolder("all"));
  DOM.foldersContainer.appendChild(allItem);

  // 2. "Klasörsüz" Dikey Item
  const uncategItem = document.createElement("div");
  uncategItem.className = `sidebar-folder-item ${state.settings.activeFolderId === "none" ? "active" : ""}`;
  uncategItem.innerHTML = `
    <span class="folder-icon" title="📥 Klasörsüz">📥</span>
    <span class="folder-name">Klasörsüz</span>
    <span class="folder-count-badge">${uncategorizedCount}</span>
  `;
  uncategItem.addEventListener("click", () => selectFolder("none"));
  DOM.foldersContainer.appendChild(uncategItem);

  // 3. Özel Dikey Klasörler
  state.folders.forEach(folder => {
    const count = state.notes.filter(n => n.folderId === folder.id).length;
    
    const item = document.createElement("div");
    item.className = `sidebar-folder-item ${state.settings.activeFolderId === folder.id ? "active" : ""}`;
    
    const iconSpan = document.createElement("span");
    iconSpan.className = "folder-icon";
    iconSpan.innerText = folder.emoji || "📁";
    iconSpan.title = folder.name;
    item.appendChild(iconSpan);

    const nameSpan = document.createElement("span");
    nameSpan.className = "folder-name";
    nameSpan.innerText = folder.name;
    item.appendChild(nameSpan);

    const countSpan = document.createElement("span");
    countSpan.className = "folder-count-badge";
    countSpan.innerText = count;
    item.appendChild(countSpan);

    // Dikey silme aksiyonu
    const delBtn = document.createElement("button");
    delBtn.className = "folder-delete-action";
    delBtn.innerHTML = "&times;";
    delBtn.title = "Klasörü Sil";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFolder(folder.id);
    });
    item.appendChild(delBtn);

    item.addEventListener("click", () => selectFolder(folder.id));
    DOM.foldersContainer.appendChild(item);

    // Modal klasör seçimi listesini doldur
    const opt = document.createElement("option");
    opt.value = folder.id;
    opt.innerText = `${folder.emoji || "📁"} ${folder.name}`;
    DOM.noteFolderSelect.appendChild(opt);
  });
}

function renderNotes() {
  if (!DOM.notesContainer) return;
  DOM.notesContainer.innerHTML = "";
  
  const query = DOM.searchInput.value.toLowerCase().trim();
  const folderFilter = state.settings.activeFolderId;

  // Filter notes
  let filtered = state.notes.filter(note => {
    // 1. Folder match
    if (folderFilter !== "all" && note.folderId !== folderFilter) {
      return false;
    }
    // 2. Search match
    if (query) {
      const matchTitle = note.title && note.title.toLowerCase().includes(query);
      
      // Strip HTML inside content before search matching to make search accurate
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = note.content || "";
      const textVal = tempDiv.innerText.toLowerCase();
      const matchContent = textVal.includes(query);
      
      return matchTitle || matchContent;
    }
    return true;
  });

  // Sort notes: newest first
  filtered.sort((a, b) => b.createdAt - a.createdAt);

  DOM.noteCount.innerText = `${filtered.length} Not`;

  // Title rendering
  if (folderFilter === "all") {
    DOM.currentFolderTitle.innerText = "Tüm Notlar";
  } else if (folderFilter === "none") {
    DOM.currentFolderTitle.innerText = "Klasörsüz Notlar";
  } else {
    const currentFolderObj = state.folders.find(f => f.id === folderFilter);
    DOM.currentFolderTitle.innerText = currentFolderObj ? `${currentFolderObj.emoji} ${currentFolderObj.name}` : "Klasör";
  }

  // Handle empty state
  if (filtered.length === 0) {
    DOM.notesContainer.classList.add("hidden");
    DOM.emptyStateView.classList.remove("hidden");
  } else {
    DOM.notesContainer.classList.remove("hidden");
    DOM.emptyStateView.classList.add("hidden");
    
    // Draw note cards
    filtered.forEach(note => {
      const card = document.createElement("div");
      card.className = `note-card ${note.color || "blue"}`;
      card.dataset.id = note.id;

      // Note Header
      const header = document.createElement("div");
      header.className = "note-card-header";
      
      const title = document.createElement("div");
      title.className = "note-card-title";
      if (note.is_global) {
        title.innerHTML = `${note.title || "İsimsiz Not"} <span class="note-global-badge">📌 Genel</span>`;
      } else {
        title.innerText = note.title || "İsimsiz Not";
      }
      header.appendChild(title);

      const actions = document.createElement("div");
      actions.className = "note-card-actions";

      // Edit Button
      const editBtn = document.createElement("button");
      editBtn.className = "note-action-btn edit";
      editBtn.title = "Notu Düzenle";
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditNoteModal(note.id);
      });
      actions.appendChild(editBtn);

      // Delete Button
      const delBtn = document.createElement("button");
      delBtn.className = "note-action-btn delete";
      delBtn.title = "Notu Sil";
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteNote(note.id);
      });
      actions.appendChild(delBtn);

      // Hide administrative actions on global notes for regular users
      const isSuperAdmin = state.settings.user && state.settings.user.role === 'superadmin';
      if (note.is_global && !isSuperAdmin) {
        editBtn.classList.add("hidden");
        delBtn.classList.add("hidden");
      }

      header.appendChild(actions);
      card.appendChild(header);

      // Note Body (Render as innerHTML to showcase formatting!)
      const body = document.createElement("div");
      body.className = "note-card-body";
      body.innerHTML = note.content;
      card.appendChild(body);

      // Note Footer
      const footer = document.createElement("div");
      footer.className = "note-card-footer";

      // Folder tag
      const folderTag = document.createElement("div");
      folderTag.className = "note-folder-tag";
      let folderName = "Klasörsüz";
      let folderEmoji = "📥";
      if (note.folderId !== "none") {
        const found = state.folders.find(f => f.id === note.folderId);
        if (found) {
          folderName = found.name;
          folderEmoji = found.emoji;
        }
      }
      folderTag.innerText = `${folderEmoji} ${folderName}`;
      footer.appendChild(folderTag);

      // Quick Copy Hover Badge
      const copyBadge = document.createElement("div");
      copyBadge.className = "copy-hover-badge";
      copyBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Kopyala`;
      footer.appendChild(copyBadge);

      card.appendChild(footer);

      // Card Copy event trigger
      card.addEventListener("click", (e) => {
        if (e.target.closest(".note-card-actions")) {
          return;
        }
        copyNoteToClipboard(note.content, card);
      });

      DOM.notesContainer.appendChild(card);
    });
  }
}

// 7. FOLDER OPERATIONAL LOGIC
function selectFolder(folderId) {
  state.settings.activeFolderId = folderId;
  Storage.save();
  renderFolders();
  renderNotes();
}

async function deleteFolder(folderId) {
  if (confirm("Bu klasörü silmek istediğinize emin misiniz? Klasörün içindeki notlar SİLİNMEYECEK, sadece 'Klasörsüz' yapılacaktır.")) {
    try {
      await apiFetch(`/api/folders/${folderId}`, { method: 'DELETE' });
      
      if (state.settings.activeFolderId === folderId) {
        state.settings.activeFolderId = "all";
      }
      
      showToast("Klasör başarıyla silindi.");
      syncFromServer();
    } catch (err) {
      showToast(err.message || "Klasör silinemedi.", "error");
    }
  }
}

// 8. NOTE OPERATIONAL LOGIC
async function deleteNote(noteId) {
  if (confirm("Bu notu tamamen silmek istiyor musunuz?")) {
    try {
      await apiFetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      showToast("Not silindi.");
      syncFromServer();
    } catch (err) {
      showToast(err.message || "Not silinemedi.", "error");
    }
  }
}

// 9. MODALS OPERATIONAL LOGIC & RICH TEXT ACTIONS
function openAddNoteModal() {
  try {
    console.log("openAddNoteModal triggered");
    editingNoteId = null;
    if (DOM.modalTitle) DOM.modalTitle.innerText = "Yeni Not Oluştur";
    if (DOM.noteTitleInput) DOM.noteTitleInput.value = "";
    if (DOM.noteContentEditor) DOM.noteContentEditor.innerHTML = ""; // Clear contenteditable div
    
    const activeFolder = state.settings.activeFolderId;
    if (DOM.noteFolderSelect) {
      if (activeFolder !== "all") {
        DOM.noteFolderSelect.value = activeFolder;
      } else {
        DOM.noteFolderSelect.value = "none";
      }
    }

    // Set default color checked
    const colorBlue = document.getElementById("color-blue");
    if (colorBlue) colorBlue.checked = true;

    // Reset global note checkbox
    if (DOM.noteIsGlobalInput) {
      DOM.noteIsGlobalInput.checked = false;
    }

    if (DOM.noteModal) DOM.noteModal.classList.remove("hidden");
    if (DOM.noteContentEditor) DOM.noteContentEditor.focus();
  } catch (err) {
    console.error("openAddNoteModal error:", err);
    showToast("Not ekleme ekranı açılırken hata: " + err.message, "error");
  }
}

function openEditNoteModal(noteId) {
  try {
    console.log("openEditNoteModal triggered for note:", noteId);
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;

    editingNoteId = noteId;
    if (DOM.modalTitle) DOM.modalTitle.innerText = "Notu Düzenle";
    if (DOM.noteTitleInput) DOM.noteTitleInput.value = note.title || "";
    if (DOM.noteContentEditor) DOM.noteContentEditor.innerHTML = note.content || ""; // Rich HTML content
    if (DOM.noteFolderSelect) DOM.noteFolderSelect.value = note.folderId || "none";
    
    const colorInput = document.getElementById(`color-${note.color || "blue"}`);
    if (colorInput) {
      colorInput.checked = true;
    }

    // Sync global note checkbox
    if (DOM.noteIsGlobalInput) {
      DOM.noteIsGlobalInput.checked = !!note.is_global;
    }

    if (DOM.noteModal) DOM.noteModal.classList.remove("hidden");
    if (DOM.noteContentEditor) DOM.noteContentEditor.focus();
  } catch (err) {
    console.error("openEditNoteModal error:", err);
    showToast("Not düzenleme ekranı açılırken hata: " + err.message, "error");
  }
}

function closeNoteModalFunc() {
  try {
    console.log("closeNoteModalFunc triggered");
    if (DOM.noteModal) DOM.noteModal.classList.add("hidden");
    editingNoteId = null;
  } catch (err) {
    console.error("closeNoteModalFunc error:", err);
  }
}

async function saveNote() {
  const title = DOM.noteTitleInput.value.trim();
  const content = DOM.noteContentEditor.innerHTML.trim(); // Get Rich HTML content
  const plainText = DOM.noteContentEditor.innerText.trim(); // Check text content
  const folderId = DOM.noteFolderSelect.value;
  
  const colorRadio = document.querySelector('input[name="note-color"]:checked');
  const color = colorRadio ? colorRadio.value : "blue";

  const isGlobalChecked = DOM.noteIsGlobalInput ? DOM.noteIsGlobalInput.checked : false;

  // Validate on plain text inside editor
  if (!plainText && !content) {
    showToast("Not içeriği boş olamaz!", "error");
    DOM.noteContentEditor.focus();
    return;
  }

  DOM.saveNoteBtn.disabled = true;
  DOM.saveNoteBtn.innerText = "Kaydediliyor...";

  try {
    if (editingNoteId) {
      // Update existing
      await apiFetch(`/api/notes/${editingNoteId}`, {
        method: 'PUT',
        body: JSON.stringify({ folderId, title, content, color, isGlobal: isGlobalChecked })
      });
      showToast("Not güncellendi.");
    } else {
      // Create new
      const newNoteId = "note_" + Date.now().toString(36);
      await apiFetch(`/api/notes`, {
        method: 'POST',
        body: JSON.stringify({ id: newNoteId, folderId, title, content, color, isGlobal: isGlobalChecked })
      });
      showToast("Yeni Not Eklendi!");
    }

    closeNoteModalFunc();
    syncFromServer();
  } catch (err) {
    showToast(err.message || "Not kaydedilirken hata oluştu.", "error");
  } finally {
    DOM.saveNoteBtn.disabled = false;
    DOM.saveNoteBtn.innerText = "Kaydet";
  }
}

// Folder Modals
function openAddFolderModal() {
  try {
    console.log("openAddFolderModal triggered");
    if (DOM.folderModalTitle) DOM.folderModalTitle.innerText = "Yeni Klasör Oluştur";
    if (DOM.folderEmojiInput) DOM.folderEmojiInput.value = "📁";
    if (DOM.folderNameInput) DOM.folderNameInput.value = "";
    if (DOM.folderModal) DOM.folderModal.classList.remove("hidden");
    if (DOM.folderNameInput) DOM.folderNameInput.focus();
  } catch (err) {
    console.error("openAddFolderModal error:", err);
    showToast("Klasör penceresi açılırken hata: " + err.message, "error");
  }
}

function closeFolderModalFunc() {
  try {
    console.log("closeFolderModalFunc triggered");
    if (DOM.folderModal) DOM.folderModal.classList.add("hidden");
  } catch (err) {
    console.error("closeFolderModalFunc error:", err);
  }
}

async function saveFolder() {
  try {
    const emoji = DOM.folderEmojiInput ? DOM.folderEmojiInput.value.trim() : "📁";
    const name = DOM.folderNameInput ? DOM.folderNameInput.value.trim() : "";

    if (!name) {
      showToast("Klasör ismi boş olamaz!", "error");
      if (DOM.folderNameInput) DOM.folderNameInput.focus();
      return;
    }

    const newFolderId = "folder_" + Date.now().toString(36);
    DOM.saveFolderBtn.disabled = true;

    await apiFetch('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ id: newFolderId, name, emoji: emoji || "📁" })
    });

    closeFolderModalFunc();
    showToast("Klasör oluşturuldu: " + name);
    syncFromServer();
  } catch (err) {
    showToast(err.message || "Klasör kaydedilirken hata oluştu.", "error");
  } finally {
    DOM.saveFolderBtn.disabled = false;
  }
}

// Settings Modals & Backup logic (Export / Import)
function openSettingsModal() {
  try {
    console.log("openSettingsModal triggered");
    
    // Highlight the active accent color dot
    const activeAccent = state.settings.accentColor || "indigo";
    applyAccentColor(activeAccent);
    
    if (DOM.settingsModal) DOM.settingsModal.classList.remove("hidden");
  } catch (err) {
    console.error("openSettingsModal error:", err);
    showToast("Ayarlar penceresi açılırken hata: " + err.message, "error");
  }
}

function closeSettingsModalFunc() {
  try {
    console.log("closeSettingsModalFunc triggered");
    if (DOM.settingsModal) DOM.settingsModal.classList.add("hidden");
  } catch (err) {
    console.error("closeSettingsModalFunc error:", err);
  }
}

// Admin Panel Modal
function openAdminModal() {
  try {
    console.log("openAdminModal triggered");
    if (DOM.adminModal) DOM.adminModal.classList.remove("hidden");
    adminFetchUsers(); // Refresh the list of users
  } catch (err) {
    console.error("openAdminModal error:", err);
    showToast("Yönetici paneli açılırken hata oluştu: " + err.message, "error");
  }
}

function closeAdminModalFunc() {
  try {
    console.log("closeAdminModalFunc triggered");
    if (DOM.adminModal) DOM.adminModal.classList.add("hidden");
  } catch (err) {
    console.error("closeAdminModalFunc error:", err);
  }
}

// User Profile Modal & Password Change handlers
function openProfileModal() {
  try {
    console.log("openProfileModal triggered");
    
    if (state.settings.user) {
      const username = state.settings.user.username || "User";
      const role = state.settings.user.role === 'superadmin' ? "👑 Süper Admin" : "👤 Standart Kullanıcı";
      
      if (DOM.profileUsernameDisplay) DOM.profileUsernameDisplay.innerText = username;
      if (DOM.profileRoleDisplay) DOM.profileRoleDisplay.innerText = role;
      if (DOM.profileAvatarChar) DOM.profileAvatarChar.innerText = username.charAt(0).toUpperCase();
    }
    
    // Clear password input fields on modal open
    if (DOM.profileOldPassword) DOM.profileOldPassword.value = "";
    if (DOM.profileNewPassword) DOM.profileNewPassword.value = "";
    
    if (DOM.profileModal) DOM.profileModal.classList.remove("hidden");
  } catch (err) {
    console.error("openProfileModal error:", err);
  }
}

function closeProfileModalFunc() {
  try {
    console.log("closeProfileModalFunc triggered");
    if (DOM.profileModal) DOM.profileModal.classList.add("hidden");
  } catch (err) {
    console.error("closeProfileModalFunc error:", err);
  }
}

async function handleProfilePasswordChange() {
  try {
    const oldPassword = DOM.profileOldPassword ? DOM.profileOldPassword.value : "";
    const newPassword = DOM.profileNewPassword ? DOM.profileNewPassword.value : "";
    
    if (!oldPassword || !newPassword) {
      showToast("Lütfen tüm alanları doldurun.", "error");
      return;
    }
    
    if (DOM.profileChangePasswordBtn) {
      DOM.profileChangePasswordBtn.disabled = true;
      DOM.profileChangePasswordBtn.innerText = "Güncelleniyor...";
    }
    
    const response = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    showToast(response.message || "Şifreniz başarıyla güncellendi.");
    closeProfileModalFunc();
  } catch (err) {
    showToast(err.message || "Şifre güncellenemedi.", "error");
  } finally {
    if (DOM.profileChangePasswordBtn) {
      DOM.profileChangePasswordBtn.disabled = false;
      DOM.profileChangePasswordBtn.innerText = "Şifreyi Güncelle";
    }
  }
}

function exportData() {
  try {
    console.log("exportData triggered");
    
    const backupObj = {
      app: "PioNotes",
      version: "1.0.0",
      backupDate: Date.now(),
      folders: state.folders || [],
      notes: state.notes || [],
      settings: state.settings || {}
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    
    const date = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("download", `pionotes_yedek_${date}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    showToast("Yedek dosyası başarıyla indirildi! 📥");
  } catch (err) {
    console.error("exportData error:", err);
    showToast("Yedek alınırken hata oluştu: " + err.message, "error");
  }
}

function importData(e) {
  try {
    console.log("importData triggered");
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const backup = JSON.parse(evt.target.result);
        
        // Simple structure validation check
        if (!backup || !Array.isArray(backup.folders) || !Array.isArray(backup.notes)) {
          showToast("Geçersiz yedek dosyası formatı!", "error");
          return;
        }
        
        // Overwrite state completely
        state.folders = backup.folders;
        state.notes = backup.notes;
        if (backup.settings) {
          state.settings = backup.settings;
        }
        
        // Save and completely refresh the UI
        Storage.save();
        initTheme();
        applyAccentColor(state.settings.accentColor || "indigo");
        renderFolders();
        renderNotes();
        closeSettingsModalFunc();
        
        showToast("Yedek Başarıyla Yüklendi! 🎉");
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        showToast("Dosya okuma veya JSON ayrıştırma hatası!", "error");
      }
    };
    reader.readAsText(file);
    
    // Reset file input value
    DOM.importFileInput.value = "";
  } catch (err) {
    console.error("importData error:", err);
    showToast("Yükleme sırasında hata: " + err.message, "error");
  }
}

// 10. SEARCH INTERACTIONS
function initSearch() {
  if (!DOM.searchInput) return;

  DOM.searchInput.addEventListener("input", () => {
    const val = DOM.searchInput.value;
    if (val) {
      DOM.clearSearchBtn.classList.remove("hidden");
    } else {
      DOM.clearSearchBtn.classList.add("hidden");
    }
    renderNotes();
  });

  DOM.clearSearchBtn.addEventListener("click", () => {
    DOM.searchInput.value = "";
    DOM.clearSearchBtn.classList.add("hidden");
    DOM.searchInput.focus();
    renderNotes();
  });
}

// 11. RICH TEXT TOOLBAR ACTIONS ATTACHER
function initRichTextToolbar() {
  const toolbarButtons = document.querySelectorAll(".toolbar-btn");
  toolbarButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); // Metin seçeneğinin kaybolmasını önle
      
      const command = btn.dataset.command;
      if (command) {
        document.execCommand(command, false, null);
        DOM.noteContentEditor.focus(); // Editöre odağı geri ver
      }
    });
  });
}

// 12. EVENT LISTENERS SETUP
function setupEventListeners() {
  // Theme toggle
  if (DOM.themeToggleBtn) {
    DOM.themeToggleBtn.addEventListener("click", toggleTheme);
  }

  // Add notes / folder buttons
  if (DOM.addNoteBtn) DOM.addNoteBtn.addEventListener("click", openAddNoteModal);
  if (DOM.addFolderBtn) DOM.addFolderBtn.addEventListener("click", openAddFolderModal);
  if (DOM.emptyAddBtn) DOM.emptyAddBtn.addEventListener("click", openAddNoteModal);

  // Note Modal events
  if (DOM.closeNoteModal) DOM.closeNoteModal.addEventListener("click", closeNoteModalFunc);
  if (DOM.cancelNoteBtn) DOM.cancelNoteBtn.addEventListener("click", closeNoteModalFunc);
  if (DOM.saveNoteBtn) DOM.saveNoteBtn.addEventListener("click", saveNote);
  
  // Folder Modal events
  if (DOM.closeFolderModal) DOM.closeFolderModal.addEventListener("click", closeFolderModalFunc);
  if (DOM.cancelFolderBtn) DOM.cancelFolderBtn.addEventListener("click", closeFolderModalFunc);
  if (DOM.saveFolderBtn) DOM.saveFolderBtn.addEventListener("click", saveFolder);

  // Keyboard save shortcut (Ctrl + Enter inside editable editor div)
  if (DOM.noteContentEditor) {
    DOM.noteContentEditor.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        saveNote();
      }
    });
  }
  
  if (DOM.folderNameInput) {
    DOM.folderNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveFolder();
      }
    });
  }

  // Modal Backdrop dismiss clicks
  window.addEventListener("click", (e) => {
    if (e.target === DOM.noteModal) {
      closeNoteModalFunc();
    }
    if (e.target === DOM.folderModal) {
      closeFolderModalFunc();
    }
    if (e.target === DOM.settingsModal) {
      closeSettingsModalFunc();
    }
    if (e.target === DOM.adminModal) {
      closeAdminModalFunc();
    }
    if (e.target === DOM.profileModal) {
      closeProfileModalFunc();
    }
  });

  // Emoji picker length control
  if (DOM.folderEmojiInput) {
    DOM.folderEmojiInput.addEventListener("input", () => {
      if (DOM.folderEmojiInput.value.length > 2) {
        DOM.folderEmojiInput.value = Array.from(DOM.folderEmojiInput.value)[0];
      }
    });
  }

  // Settings Modal events
  if (DOM.settingsBtn) DOM.settingsBtn.addEventListener("click", openSettingsModal);
  if (DOM.closeSettingsModal) DOM.closeSettingsModal.addEventListener("click", closeSettingsModalFunc);
  if (DOM.saveSettingsBtn) {
    DOM.saveSettingsBtn.addEventListener("click", () => {
      closeSettingsModalFunc();
    });
  }
  
  // Admin Modal events
  if (DOM.adminBtn) DOM.adminBtn.addEventListener("click", openAdminModal);
  if (DOM.closeAdminModal) DOM.closeAdminModal.addEventListener("click", closeAdminModalFunc);
  if (DOM.saveAdminBtn) DOM.saveAdminBtn.addEventListener("click", closeAdminModalFunc);
  
  // User Profile Modal events
  if (DOM.profileBtn) DOM.profileBtn.addEventListener("click", openProfileModal);
  if (DOM.closeProfileModal) DOM.closeProfileModal.addEventListener("click", closeProfileModalFunc);
  if (DOM.saveProfileBtn) DOM.saveProfileBtn.addEventListener("click", closeProfileModalFunc);
  if (DOM.profileChangePasswordBtn) DOM.profileChangePasswordBtn.addEventListener("click", handleProfilePasswordChange);

  if (DOM.exportNotesBtn) DOM.exportNotesBtn.addEventListener("click", exportData);
  if (DOM.importNotesBtn) {
    DOM.importNotesBtn.addEventListener("click", () => {
      if (DOM.importFileInput) DOM.importFileInput.click();
    });
  }
  if (DOM.importFileInput) DOM.importFileInput.addEventListener("change", importData);
  
  // Accent Picker clicks delegation
  if (DOM.accentPickerContainer) {
    DOM.accentPickerContainer.addEventListener("click", (e) => {
      const dot = e.target.closest(".accent-dot");
      if (dot) {
        const accent = dot.dataset.accent;
        applyAccentColor(accent);
        showToast("Tema rengi güncellendi! ✨");
      }
    });
  }

  // Theme Picker clicks delegation
  if (DOM.themePickerContainer) {
    DOM.themePickerContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".theme-picker-btn");
      if (btn) {
        const selectedTheme = btn.dataset.theme;
        state.settings.theme = selectedTheme;
        Storage.save();
        initTheme();
        
        if (selectedTheme === "malatya") {
          applyAccentColor("amber"); // Auto set to orange
        } else {
          applyAccentColor(state.settings.accentColor || "indigo"); // Re-apply accent configuration
        }
        
        const themeNames = {
          dark: "Premium Koyu Tema 🌙",
          light: "Elegant Açık Tema ☀️",
          malatya: "Özel Malatyalı Teması 🍑🔥"
        };
        showToast(`${themeNames[selectedTheme]} Etkinleştirildi!`);
      }
    });
  }

  // Easter Egg footer listener
  const footerCredit = document.getElementById("footer-credit");
  if (footerCredit) {
    footerCredit.addEventListener("click", triggerEasterEgg);
    footerCredit.style.cursor = "pointer";
  }

  // Login view events
  if (DOM.loginSubmitBtn) {
    DOM.loginSubmitBtn.addEventListener("click", handleLogin);
  }
  
  if (DOM.loginPasswordInput) {
    DOM.loginPasswordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleLogin();
      }
    });
  }

  if (DOM.sidebarLogoutBtn) {
    DOM.sidebarLogoutBtn.addEventListener("click", logout);
  }

  // Admin view events
  if (DOM.adminCreateUserBtn) {
    DOM.adminCreateUserBtn.addEventListener("click", adminCreateUser);
  }
}

// 12.5. EASTER EGG SYSTEM (MALATYALI COMBO)
let footerClicks = 0;
let footerClickTimeout = null;

function triggerEasterEgg(e) {
  try {
    footerClicks++;
    
    // Clear reset timer
    if (footerClickTimeout) clearTimeout(footerClickTimeout);
    
    // Reset after 5 seconds of inactivity
    footerClickTimeout = setTimeout(() => {
      footerClicks = 0;
    }, 5000);

    // Clicks 1 & 2 do nothing
    if (footerClicks < 3) {
      return;
    }
    
    // Create floating text near footer click
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX || (rect.left + rect.width / 2);
    const y = e.clientY || rect.top;
    
    const floatText = document.createElement("div");
    floatText.className = "combo-floating-text";
    floatText.style.left = `${x}px`;
    floatText.style.top = `${y - 30}px`;
    
    let text = "";
    let shakeDuration = 0;
    
    if (footerClicks >= 3 && footerClicks <= 7) {
      // 5 clicks of "Kombo Başlıyor!" (clicks 3, 4, 5, 6, 7)
      text = "Kombo Başlıyor! ⚡";
      floatText.style.color = "#6366f1"; // Indigo
    } else if (footerClicks >= 8 && footerClicks <= 12) {
      // 5 clicks of "ULTRAKILL!" (clicks 8, 9, 10, 11, 12)
      text = "ULTRAKILL! 💀";
      floatText.style.color = "#f59e0b"; // Amber
      floatText.style.fontWeight = "900";
      shakeDuration = 200; // Small screen shake
    } else if (footerClicks >= 13 && footerClicks <= 17) {
      // 5 clicks of "HOLY SHIT!" (clicks 13, 14, 15, 16, 17)
      text = "HOLY SHIT! 👑";
      floatText.style.color = "#8b5cf6"; // Purple
      floatText.style.fontWeight = "900";
      floatText.style.fontSize = "1.2rem";
      shakeDuration = 300; // Medium screen shake
    } else if (footerClicks >= 18 && footerClicks <= 22) {
      // 5 clicks of "BEYOND GODLIKE!" (clicks 18, 19, 20, 21, 22)
      text = "BEYOND GODLIKE! 🔥";
      floatText.style.color = "#f43f5e"; // Rose
      floatText.style.fontWeight = "900";
      floatText.style.fontSize = "1.25rem";
      shakeDuration = 450; // Intense screen shake
    } else if (footerClicks >= 23) {
      // Final click (click 23) triggers MALATYALI!!!
      text = "MALATYALI!!! 🍑🔥";
      floatText.style.color = "#fb923c"; // Orange
      floatText.style.fontWeight = "900";
      floatText.style.fontSize = "1.4rem";
    }
    
    floatText.innerText = text;
    document.body.appendChild(floatText);
    setTimeout(() => floatText.remove(), 1200);
    
    // Apply temporary minor shake for intermediate hits
    if (shakeDuration > 0) {
      DOM.body.classList.add("screen-shake");
      setTimeout(() => {
        DOM.body.classList.remove("screen-shake");
      }, shakeDuration);
    }
    
    if (footerClicks >= 23) {
      // Start the grand Malatya show!
      startMalatyaShow();
      footerClicks = 0;
    }
  } catch (err) {
    console.error("Easter egg error:", err);
  }
}

function startMalatyaShow() {
  try {
    // 1. Screen Shake
    DOM.body.classList.add("screen-shake");
    setTimeout(() => {
      DOM.body.classList.remove("screen-shake");
    }, 600);
    
    // 2. Create Overlay
    const overlay = document.createElement("div");
    overlay.className = "malatya-overlay";
    overlay.innerText = "MALATYALI!!! 🍑";
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 4600);
    
    // 3. Rain Apricots!
    const apricotCount = 45;
    for (let i = 0; i < apricotCount; i++) {
      setTimeout(() => {
        createFallingApricot();
      }, i * 70); // stagger entry slightly for smooth rain
    }
    
    // 4. Unlock Malatyalı Theme & Peach Badge!
    let justUnlocked = false;
    if (!state.settings.malatyaUnlocked) {
      state.settings.malatyaUnlocked = true;
      justUnlocked = true;
    }
    
    state.settings.theme = "malatya";
    Storage.save();
    
    // Initialize theme & elements
    initTheme();
    applyAccentColor("amber"); // Force beautiful orange accent
    
    if (justUnlocked) {
      showToast("Özel 'Malatyalı' Teması ve Kayısı Emojisi Açıldı! 🍑🔥");
    } else {
      showToast("MALATYA GÜCÜ AKTİFLEŞTİRİLDİ! 🍑🔥");
    }
  } catch (e) {
    console.error("Malatya show failed:", e);
  }
}

function createFallingApricot() {
  try {
    const apricot = document.createElement("div");
    apricot.className = "falling-apricot";
    apricot.innerText = "🍑";
    
    // Random position and animation variables
    const startX = Math.random() * window.innerWidth;
    const duration = 2.5 + Math.random() * 2; // 2.5 to 4.5 seconds
    const delay = Math.random() * 0.3; // 0 to 300ms
    const size = 1.2 + Math.random() * 1.8; // random scale
    const drift = -80 + Math.random() * 160; // horizontal movement drift
    
    apricot.style.left = `${startX}px`;
    apricot.style.setProperty("--fall-duration", `${duration}s`);
    apricot.style.setProperty("--fall-delay", `${delay}s`);
    apricot.style.setProperty("--drift-x", `${drift}px`);
    apricot.style.fontSize = `${size}rem`;
    
    document.body.appendChild(apricot);
    
    // Clean up
    setTimeout(() => {
      apricot.remove();
    }, (duration + delay) * 1000 + 200);
  } catch (e) {
    console.error("Apricot creation error:", e);
  }
}

// ==========================================================================
// 12.8. API SYNCHRONIZATION & AUTHENTICATION MOTORU (Railway & JWT Entegrasyonu)
// ==========================================================================

async function apiFetch(endpoint, options = {}) {
  const apiUrl = state.settings.apiUrl || "http://localhost:3000";
  const url = `${apiUrl}${endpoint}`;
  
  if (!options.headers) options.headers = {};
  options.headers['Content-Type'] = 'application/json';
  
  if (state.settings.token) {
    options.headers['Authorization'] = `Bearer ${state.settings.token}`;
  }
  
  try {
    const res = await fetch(url, options);
    
    if (res.status === 401 || res.status === 403) {
      logout();
      showToast("Oturum süreniz doldu, lütfen tekrar giriş yapın.", "error");
      throw new Error("Oturum yetkisi yok.");
    }
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Sunucu Hatası: ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.warn(`API Error (${endpoint}):`, err.message);
    throw err;
  }
}

function initSession() {
  try {
    const token = state.settings.token;
    
    if (!token) {
      if (DOM.loginView) DOM.loginView.style.display = "flex";
      const appLayout = document.querySelector(".app-layout");
      if (appLayout) appLayout.style.display = "none";
    } else {
      if (DOM.loginView) DOM.loginView.style.display = "none";
      const appLayout = document.querySelector(".app-layout");
      if (appLayout) appLayout.style.display = "flex";

      
      const isSuperAdmin = state.settings.user && state.settings.user.role === 'superadmin';
      const adminElements = document.querySelectorAll(".superadmin-only");
      
      adminElements.forEach(el => {
        if (isSuperAdmin) {
          el.classList.remove("hidden");
          if (el.id === "modal-global-note-row" || el.id === "sidebar-admin-btn") {
            el.style.display = "flex";
          } else {
            el.style.display = "block";
          }
        } else {
          el.classList.add("hidden");
          el.style.display = "none";
        }
      });
      
      syncFromServer();
      
      if (isSuperAdmin) {
        adminFetchUsers();
      }
    }
  } catch (e) {
    console.error("initSession failed:", e);
  }
}

async function handleLogin() {
  try {
    const username = DOM.loginUsernameInput.value.trim();
    const password = DOM.loginPasswordInput.value;
    
    if (!username || !password) {
      showToast("Lütfen tüm alanları doldurun.", "error");
      return;
    }
    
    DOM.loginSubmitBtn.disabled = true;
    DOM.loginSubmitBtn.innerText = "Giriş Yapılıyor...";
    
    if (DOM.loginErrorMsg) DOM.loginErrorMsg.classList.add("hidden");
    
    const apiUrl = state.settings.apiUrl || "http://localhost:3000";
    
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Giriş başarısız.");
    }
    
    const data = await response.json();
    
    state.settings.token = data.token;
    state.settings.user = {
      username: data.username,
      role: data.role
    };
    
    Storage.save();
    showToast(`Hoş geldiniz, ${data.username}! 👋`);
    
    DOM.loginUsernameInput.value = "";
    DOM.loginPasswordInput.value = "";
    
    initSession();
  } catch (err) {
    console.error("Login failed:", err);
    if (DOM.loginErrorMsg) {
      DOM.loginErrorMsg.innerText = err.message || "Giriş başarısız, sunucuyu kontrol edin.";
      DOM.loginErrorMsg.classList.remove("hidden");
    }
    showToast(err.message || "Giriş hatası.", "error");
  } finally {
    DOM.loginSubmitBtn.disabled = false;
    DOM.loginSubmitBtn.innerText = "Giriş Yap";
  }
}

function logout() {
  try {
    state.settings.token = null;
    state.settings.user = null;
    Storage.save();
    
    state.notes = [];
    state.folders = [];
    renderFolders();
    renderNotes();
    
    showToast("Başarıyla çıkış yapıldı. 🚪");
    initSession();
  } catch (e) {
    console.error("Logout error:", e);
  }
}

async function syncFromServer() {
  try {
    const [folders, notes] = await Promise.all([
      apiFetch('/api/folders'),
      apiFetch('/api/notes')
    ]);
    
    state.folders = folders || [];
    state.notes = notes || [];
    Storage.save();
    
    renderFolders();
    renderNotes();
  } catch (err) {
    console.warn("Sync failed, offline cache loaded:", err.message);
    showToast("Çevrimdışı Mod: Önbellekteki veriler gösteriliyor.", "error");
    renderFolders();
    renderNotes();
  }
}

// ==========================================
// 12.9. SUPER ADMIN USER MANAGEMENT OPERATIONS
// ==========================================

async function adminFetchUsers() {
  try {
    const users = await apiFetch('/api/users');
    if (!DOM.adminUsersTbody) return;
    
    DOM.adminUsersTbody.innerHTML = "";
    
    users.forEach(user => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--border-color)";
      
      const tdName = document.createElement("td");
      tdName.style.padding = "6px 10px";
      tdName.innerText = user.username;
      tr.appendChild(tdName);
      
      const tdRole = document.createElement("td");
      tdRole.style.padding = "6px 10px";
      tdRole.innerText = user.role === 'superadmin' ? "👑 Süper Admin" : "👤 Standart";
      tr.appendChild(tdRole);
      
      const tdAction = document.createElement("td");
      tdAction.style.padding = "6px 10px";
      tdAction.style.textAlign = "right";
      
      if (user.username !== '90220') {
        const delBtn = document.createElement("button");
        delBtn.className = "admin-user-delete-btn";
        delBtn.innerText = "Sil";
        delBtn.addEventListener("click", () => adminDeleteUser(user.id, user.username));
        tdAction.appendChild(delBtn);
      } else {
        tdAction.innerText = "-";
      }
      tr.appendChild(tdAction);
      DOM.adminUsersTbody.appendChild(tr);
    });
  } catch (err) {
    console.error("adminFetchUsers error:", err);
  }
}

async function adminCreateUser() {
  try {
    const username = DOM.adminNewUsername.value.trim();
    const password = DOM.adminNewPassword.value.trim();
    
    if (!username || !password) {
      showToast("Kullanıcı adı ve şifre zorunludur.", "error");
      return;
    }
    
    DOM.adminCreateUserBtn.disabled = true;
    
    const result = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    showToast(result.message || "Kullanıcı oluşturuldu.");
    DOM.adminNewUsername.value = "";
    DOM.adminNewPassword.value = "";
    adminFetchUsers();
  } catch (err) {
    showToast(err.message || "Hesap oluşturulamadı.", "error");
  } finally {
    DOM.adminCreateUserBtn.disabled = false;
  }
}

async function adminDeleteUser(userId, username) {
  if (confirm(`'${username}' isimli kullanıcının hesabını ve tüm notlarını silmek istediğinize emin misiniz?`)) {
    try {
      const result = await apiFetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      showToast(result.message || "Kullanıcı silindi.");
      adminFetchUsers();
    } catch (err) {
      showToast(err.message || "Kullanıcı silinemedi.", "error");
    }
  }
}

// 13. INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  Storage.load(() => {
    initTheme();
    applyAccentColor(state.settings.accentColor || "indigo"); // Load user accent color
    setupEventListeners();
    initSearch();
    initRichTextToolbar(); // Rich text toolbar tetikle
    initSession(); // Initialize active session
  });
});
