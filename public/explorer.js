// explorer.js

// Navbar background change on scroll
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('bg-opacity-70', 'backdrop-blur');
    } else {
      navbar.classList.remove('bg-opacity-70', 'backdrop-blur');
    }
  }
});

const explorerList = document.getElementById('explorer-list');
const searchBar = document.getElementById('search-bar');
let currentDir = '';
let dirHistory = [];

function renderBreadcrumb(dir) {
  const container = document.getElementById('breadcrumb');
  container.innerHTML = '';
  const parts = dir ? dir.split('/') : [];
  let pathSoFar = '';
  const rootCrumb = document.createElement('span');
  rootCrumb.textContent = 'Home';
  rootCrumb.className = 'breadcrumb-part cursor-pointer text-blue-600 hover:underline';
  rootCrumb.onclick = () => navigateTo('');
  container.appendChild(rootCrumb);
  parts.forEach((part, idx) => {
    container.appendChild(document.createTextNode(' / '));
    pathSoFar += (pathSoFar ? '/' : '') + part;
    const crumb = document.createElement('span');
    crumb.textContent = part;
    crumb.className = 'breadcrumb-part cursor-pointer text-blue-600 hover:underline';
    crumb.onclick = () => navigateTo(pathSoFar);
    container.appendChild(crumb);
  });
}

function navigateTo(dir) {
  if (currentDir) dirHistory.push(currentDir);
  fetchExplorer(dir);
  currentDir = dir;
}

function goBack() {
  if (dirHistory.length > 0) {
    const prev = dirHistory.pop();
    fetchExplorer(prev);
    currentDir = prev;
  }
}

function renderExplorer(data, filter = '', dir = '') {
  renderBreadcrumb(dir);
  explorerList.innerHTML = '';
  if (!data || (!data.folders && !data.files)) {
    explorerList.innerHTML = '<div>No files or folders found.</div>';
    return;
  }
  // Folders
  if (data.folders && data.folders.length) {
    data.folders.filter(f => f.toLowerCase().includes(filter)).forEach(folder => {
      const div = document.createElement('div');
      div.className = 'folder-item';
      div.innerHTML = '<span class="folder-icon">📁</span>' + folder;
      div.onclick = () => navigateTo(dir ? `${dir}/${folder}` : folder);
      explorerList.appendChild(div);
    });
  }
  // Files
  if (data.files && data.files.length) {
    data.files.filter(f => f.toLowerCase().includes(filter)).forEach(file => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML = '<span class="file-icon">📄</span>' + file;
      div.onclick = () => {
        window.location = `/api/download?path=${encodeURIComponent(dir ? `${dir}/${file}` : file)}`;
      };
      explorerList.appendChild(div);
    });
  }
}

async function fetchExplorer(dir = '') {
  explorerList.innerHTML = '<div>Loading...</div>';
  try {
    const res = await fetch(`/api/explorer?dir=${encodeURIComponent(dir)}`);
    if (res.status === 401) {
      explorerList.innerHTML = '<div class="text-red-400">You must be signed in to view your files.</div>';
      return;
    }
    const data = await res.json();
    renderExplorer(data, searchBar.value.toLowerCase(), dir);
    searchBar.oninput = e => {
      renderExplorer(data, e.target.value.toLowerCase(), dir);
    };
  } catch (err) {
    explorerList.innerHTML = '<div class="text-red-400">Failed to load files.</div>';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Add breadcrumb and back button
  const container = document.querySelector('.explorer-container');
  const breadcrumb = document.createElement('div');
  breadcrumb.id = 'breadcrumb';
  breadcrumb.className = 'mb-4 text-sm';
  container.insertBefore(breadcrumb, searchBar);
  const backBtn = document.createElement('button');
  backBtn.textContent = 'Back';
  backBtn.className = 'mb-4 px-4 py-1 rounded bg-gray-200 text-black border border-gray-400 hover:bg-yellow-100 mr-4';
  backBtn.onclick = goBack;
  container.insertBefore(backBtn, breadcrumb);
  fetchExplorer();
});
