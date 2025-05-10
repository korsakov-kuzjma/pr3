// Web Components
class CustomCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 1rem;
                    background-color: var(--accent-color);
                    color: white;
                    border-radius: 4px;
                    margin-top: 1rem;
                }
                h3 {
                    margin: 0 0 0.5rem 0;
                }
                p {
                    margin: 0;
                }
            </style>
            <h3>${this.getAttribute('data-title') || 'Card'}</h3>
            <p>${this.getAttribute('data-content') || 'Content'}</p>
        `;
    }
}

customElements.define('custom-card', CustomCard);

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
});

// Check for saved theme preference
if (localStorage.getItem('theme') === 'dark' || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme'))) {
    document.documentElement.setAttribute('data-theme', 'dark');
}

// Canvas Animation
const canvas = document.getElementById('animation-canvas');
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
const ctx = canvas.getContext('2d');

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.2) this.size -= 0.1;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

let particles = [];

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].size <= 0.2) {
            particles.splice(i, 1);
            i--;
        }
    }
    
    requestAnimationFrame(animateParticles);
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (let i = 0; i < 5; i++) {
        particles.push(new Particle(x, y));
    }
});

animateParticles();

// Fetch API
const fetchBtn = document.getElementById('fetch-btn');
const userData = document.getElementById('user-data');

fetchBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('https://randomuser.me/api/');
        const data = await response.json();
        const user = data.results[0];
        
        userData.innerHTML = `
            <img src="${user.picture.large}" alt="User" style="border-radius:50%;width:100px;height:100px;">
            <h3>${user.name.first} ${user.name.last}</h3>
            <p>Email: ${user.email}</p>
            <p>Location: ${user.location.city}, ${user.location.country}</p>
        `;
    } catch (error) {
        userData.textContent = 'Failed to fetch user data';
    }
});

// Web Workers
const workerBtn = document.getElementById('worker-btn');
const workerInput = document.getElementById('worker-input');
const workerOutput = document.getElementById('worker-output');

workerBtn.addEventListener('click', () => {
    const number = parseInt(workerInput.value);
    
    if (window.Worker) {
        const worker = new Worker('worker.js');
        
        worker.postMessage(number);
        
        worker.onmessage = (e) => {
            workerOutput.textContent = `Result: ${e.data}`;
            worker.terminate();
        };
    } else {
        workerOutput.textContent = `Result: ${calculatePrimes(number)} (main thread)`;
    }
});

function calculatePrimes(max) {
    const primes = [];
    for (let i = 2; i <= max; i++) {
        let isPrime = true;
        for (let j = 2; j <= Math.sqrt(i); j++) {
            if (i % j === 0) {
                isPrime = false;
                break;
            }
        }
        if (isPrime) primes.push(i);
    }
    return primes.length;
}

// Drag and Drop
const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropZone.classList.add('active');
}

function unhighlight() {
    dropZone.classList.remove('active');
}

dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    fileList.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const li = document.createElement('li');
        li.textContent = `${files[i].name} (${formatFileSize(files[i].size)})`;
        fileList.appendChild(li);
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Speech Recognition
const speechBtn = document.getElementById('speech-btn');
const speechOutput = document.getElementById('speech-output');

if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    speechBtn.addEventListener('click', () => {
        recognition.start();
        speechBtn.textContent = 'Listening...';
    });
    
    recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        speechOutput.textContent = transcript;
        speechBtn.textContent = 'Start Listening';
    };
    
    recognition.onerror = (e) => {
        speechOutput.textContent = 'Error occurred: ' + e.error;
        speechBtn.textContent = 'Start Listening';
    };
} else {
    speechBtn.disabled = true;
    speechOutput.textContent = 'Speech Recognition not supported';
}

// Media Devices (Camera)
const cameraBtn = document.getElementById('camera-btn');
const cameraFeed = document.getElementById('camera-feed');

cameraBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = stream;
        cameraBtn.textContent = 'Camera Active';
    } catch (err) {
        console.error('Error accessing camera:', err);
        cameraFeed.textContent = 'Could not access camera';
    }
});

// Local Storage
const storageInput = document.getElementById('storage-input');
const storageSave = document.getElementById('storage-save');
const storageLoad = document.getElementById('storage-load');
const storageOutput = document.getElementById('storage-output');

storageSave.addEventListener('click', () => {
    localStorage.setItem('userText', storageInput.value);
    storageOutput.textContent = 'Text saved to localStorage';
});

storageLoad.addEventListener('click', () => {
    const savedText = localStorage.getItem('userText');
    storageOutput.textContent = savedText || 'No text saved yet';
});

// Notifications
const notifyBtn = document.getElementById('notify-btn');

notifyBtn.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'granted') {
        showNotification();
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification();
            }
        });
    }
});

function showNotification() {
    const notification = new Notification('Modern Web Demo', {
        body: 'This is a notification from the demo app!',
        icon: 'https://via.placeholder.com/128',
        vibrate: [200, 100, 200]
    });
    
    notification.onclick = () => {
        window.focus();
    };
}

// Geolocation
const geolocationBtn = document.getElementById('geolocation-btn');

geolocationBtn.addEventListener('click', () => {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                alert(`Latitude: ${position.coords.latitude}, Longitude: ${position.coords.longitude}`);
            },
            (error) => {
                alert(`Error getting location: ${error.message}`);
            }
        );
    } else {
        alert('Geolocation not supported');
    }
});

// PWA Installation
const installBtn = document.getElementById('install-btn');
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        installBtn.hidden = true;
    }
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installed');
    installBtn.hidden = true;
    deferredPrompt = null;
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(
            (registration) => {
                console.log('ServiceWorker registration successful');
            },
            (err) => {
                console.log('ServiceWorker registration failed: ', err);
            }
        );
    });
}