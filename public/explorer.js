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

function renderExplorer(data, filter = '') {
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
      explorerList.appendChild(div);
    });
  }
  // Files
  if (data.files && data.files.length) {
    data.files.filter(f => f.toLowerCase().includes(filter)).forEach(file => {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML = '<span class="file-icon">📄</span>' + file;
      explorerList.appendChild(div);
    });
  }
}

async function fetchExplorer() {
  explorerList.innerHTML = '<div>Loading...</div>';
  try {
    const res = await fetch('/api/explorer');
    if (res.status === 401) {
      explorerList.innerHTML = '<div class="text-red-400">You must be signed in to view your files.</div>';
      return;
    }
    const data = await res.json();
    renderExplorer(data);
    searchBar.addEventListener('input', e => {
      renderExplorer(data, e.target.value.toLowerCase());
    });
  } catch (err) {
    explorerList.innerHTML = '<div class="text-red-400">Failed to load files.</div>';
  }
}

window.addEventListener('DOMContentLoaded', fetchExplorer);
