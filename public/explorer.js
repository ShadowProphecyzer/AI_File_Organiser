const fileList = document.getElementById('fileList');
const pathDisplay = document.getElementById('pathDisplay');
let currentUser = null;
let currentPath = '';
const pathStack = [];

function redirect(to) {
  window.location.href = to;
}

async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/current-user');
    if (!res.ok) throw new Error('Not logged in');
    const data = await res.json();
    return data.username;
  } catch (err) {
    redirect('/index.html');
  }
}

async function loadDirectory(path) {
  try {
    const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      if (res.status === 401) {
        redirect('/index.html');
      } else if (res.status === 403) {
        redirect('/dashboard.html');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Error loading directory');
      }
      return;
    }

    const data = await res.json();
    currentPath = data.path;
    pathDisplay.textContent = '/' + (currentPath || '');
    fileList.innerHTML = '';

    if (pathStack.length > 0) {
      const backLi = document.createElement('li');
      backLi.textContent = '⬅️ .. (Back)';
      backLi.classList.add('back-item');
      backLi.addEventListener('click', () => {
        currentPath = pathStack.pop() || '';
        loadDirectory(currentPath);
      });
      fileList.appendChild(backLi);
    }

    data.contents.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.name;
      li.addEventListener('click', () => {
        if (item.isDirectory) {
          pathStack.push(currentPath);
          const nextPath = currentPath ? `${currentPath}/${item.name}` : item.name;
          loadDirectory(nextPath);
        } else {
          alert(`File selected: ${item.name}`);
        }
      });
      fileList.appendChild(li);
    });
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

(async () => {
  currentUser = await fetchCurrentUser();
  if (!currentUser) return;
  loadDirectory('');
})();
