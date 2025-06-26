const username = localStorage.getItem("username");

// Redirect to login if not found
if (!username) {
  window.location.href = "/sign-in-sign-up.html";
} else {
  const greeting = document.getElementById("userGreeting");
  if (greeting) {
    greeting.innerText = `Welcome, ${username}`;
  }
}

const fileInput = document.getElementById("fileInput");
const fileBtn = document.getElementById("fileBtn");
const dropArea = document.getElementById("drop-area");
const fileList = document.getElementById("file-list");

// Helpers
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function createProgressBar(fileName) {
  const container = document.createElement("div");
  container.className = "upload-item";

  const label = document.createElement("span");
  label.textContent = sanitizeFilename(fileName);
  container.appendChild(label);

  const progress = document.createElement("progress");
  progress.max = 100;
  progress.value = 0;
  container.appendChild(progress);

  fileList.appendChild(container);
  return progress;
}

// Handle upload
function uploadFiles(files) {
  Array.from(files).forEach((file) => {
    const sanitized = sanitizeFilename(file.name);
    const formData = new FormData();
    formData.append("file", file, sanitized);

    const progressBar = createProgressBar(file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressBar.value = percent;
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        progressBar.classList.add("success");
      } else {
        progressBar.classList.add("error");
        progressBar.value = 100;
      }
    };

    xhr.onerror = () => {
      progressBar.classList.add("error");
      progressBar.value = 100;
    };

    xhr.send(formData);
  });
}

// Events
fileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    uploadFiles(e.target.files);
  }
});

["dragenter", "dragover"].forEach(event => {
  dropArea.addEventListener(event, (e) => {
    e.preventDefault();
    dropArea.classList.add("highlight");
  });
});

["dragleave", "drop"].forEach(event => {
  dropArea.addEventListener(event, (e) => {
    e.preventDefault();
    dropArea.classList.remove("highlight");
  });
});

dropArea.addEventListener("drop", (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadFiles(files);
  }
});