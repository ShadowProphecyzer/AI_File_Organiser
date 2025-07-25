// dashboard.js

// Navbar background change on scroll
window.addEventListener('scroll', () => {
  console.log('[dashboard.js] Scroll event');
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('bg-opacity-70', 'backdrop-blur');
    } else {
      navbar.classList.remove('bg-opacity-70', 'backdrop-blur');
    }
  }
});

// Real auth check using backend session
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[dashboard.js] DOMContentLoaded');
  console.log('⬛ [System] Checking authentication status...');
  try {
    const res = await fetch('/api/dashboard');
    if (res.status === 401) {
      console.log('⬛ [System] User not authenticated, redirecting to sign in.');
      window.location.href = 'signin.html';
    } else {
      const data = await res.json();
      console.log('⬛ [System] User authenticated:', data);
    }
  } catch (err) {
    console.log('⬛ [System] Error checking authentication:', err);
    window.location.href = 'signin.html';
  }
});

// File upload logic
const fileInput = document.getElementById('file-upload');
const uploadBtn = document.getElementById('upload-btn');
const progressBarBg = document.getElementById('progress-bar-bg');
const progressBar = document.getElementById('progress-bar');
const uploadStatus = document.getElementById('upload-status');

// Popup notification logic (reuse from signin_signup.js)
function showPopup(message) {
  let popup = document.getElementById('popup-notification');
  let popupMsg = document.getElementById('popup-message');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'popup-notification';
    popup.className = 'popup-notification';
    popup.innerHTML = '<span id="popup-message"></span><button class="popup-close" id="popup-close">Close</button>';
    document.body.appendChild(popup);
    document.getElementById('popup-close').addEventListener('click', hidePopup);
    popupMsg = document.getElementById('popup-message');
  }
  popupMsg.textContent = message;
  popup.classList.add('show');
}
function hidePopup() {
  const popup = document.getElementById('popup-notification');
  if (popup) popup.classList.remove('show');
}
if (document.getElementById('popup-close')) {
  document.getElementById('popup-close').addEventListener('click', hidePopup);
}

// Make the upload button open the file picker
uploadBtn.addEventListener('click', () => {
  console.log('[dashboard.js] Upload button clicked');
  fileInput.click();
  console.log('⬛ [User] Clicked Choose from computer (opens file picker)');
});

// When a file is selected, show the name and upload immediately
fileInput.addEventListener('change', () => {
  console.log('[dashboard.js] File input changed');
  const fileNameSpan = document.getElementById('selected-file-name');
  if (fileInput.files.length) {
    let validFiles = [];
    let invalidFiles = [];
    const allowedExtensions = [
      'txt','csv','tsv','json','xml','yaml','yml','ini','log','py','js','ts','java','c','cpp','h','hpp','cs','rb','php','html','css','md','sh','bat','json5','xls','xlsx','ods','doc','docx','odt','ppt','pptx','pdf','rtf','png','jpg','jpeg','bmp','gif','tiff','svg','mp3','wav','flac','ogg','mp4','avi','mov','mkv','zip','tar','gz','tgz','rar','7z','parquet','feather','hdf5','sqlite','db'
    ];
    for (const file of fileInput.files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (allowedExtensions.includes(ext)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }
    if (invalidFiles.length) {
      showPopup('These files are not allowed and will be skipped: ' + invalidFiles.join(', '));
      console.log('⬛ [System] Skipped disallowed files:', invalidFiles);
    }
    if (validFiles.length) {
      fileNameSpan.textContent = 'Selected: ' + validFiles.map(f => f.name).join(', ');
      for (const file of validFiles) {
        uploadFile(file);
      }
    } else {
      fileNameSpan.textContent = '';
    }
  } else {
    fileNameSpan.textContent = '';
  }
});

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  progressBarBg.style.display = 'block';
  progressBar.style.width = '0%';
  uploadStatus.textContent = '';
  showPopup('⬛ Uploading file...');
  console.log('⬛ [User] Uploading file:', file.name);

  // Real upload with progress
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload');
  xhr.withCredentials = true;
  xhr.upload.onprogress = function (e) {
    if (e.lengthComputable) {
      const percent = (e.loaded / e.total) * 100;
      progressBar.style.width = percent + '%';
      uploadStatus.textContent = `Uploading: ${Math.round(percent)}%`;
      console.log(`⬛ [System] Upload progress: ${Math.round(percent)}%`);
    }
  };
  xhr.onload = function () {
    if (xhr.status === 200) {
      showPopup('⬛ File uploaded successfully!');
      uploadStatus.textContent = 'Upload complete!';
      console.log('⬛ [System] File uploaded successfully');
    } else {
      showPopup('⬛ Upload failed: ' + xhr.responseText);
      uploadStatus.textContent = 'Upload failed.';
      console.log('⬛ [System] Upload failed:', xhr.responseText);
    }
    progressBar.style.width = '100%';
  };
  xhr.onerror = function () {
    showPopup('⬛ Upload failed: Network error');
    uploadStatus.textContent = 'Upload failed.';
    console.log('⬛ [System] Upload failed: Network error');
  };
  xhr.send(formData);
}
