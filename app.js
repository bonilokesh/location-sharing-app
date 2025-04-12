import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, collection, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your Firebase config here:
const firebaseConfig = {
  apiKey: "AIzaSyAfVPCSvTr8FHsRd10QtiwrBe5HC-bDg4o",
  authDomain: "maps-e3724.firebaseapp.com",
  projectId: "maps-e3724",
  storageBucket: "maps-e3724.firebasestorage.app",
  messagingSenderId: "455885472603",
  appId: "1:455885472603:web:2a7ca56ec522476adad07e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const map = L.map("map").setView([20, 78], 4); // Centered on India
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const shareBtn = document.getElementById("share-btn");
const stopBtn = document.getElementById("stop-btn");
const userNameSpan = document.getElementById("user-name");

let userId = null;
let userDisplayName = null;
let locationWatcher = null;
const markers = {};

// Auth Events
loginBtn.addEventListener("click", () => signInWithPopup(auth, provider));
logoutBtn.addEventListener("click", () => signOut(auth));

// Track login status
onAuthStateChanged(auth, (user) => {
  if (user) {
    userId = user.uid;
    userDisplayName = user.displayName;
    userNameSpan.textContent = `Hi, ${userDisplayName}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline";
    shareBtn.disabled = false;
  } else {
    userId = null;
    userDisplayName = null;
    userNameSpan.textContent = "";
    loginBtn.style.display = "inline";
    logoutBtn.style.display = "none";
    shareBtn.disabled = true;
    stopBtn.disabled = true;
  }
});

// Share location
shareBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return alert("Geolocation not supported");

  shareBtn.disabled = true;
  stopBtn.disabled = false;

  locationWatcher = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      await setDoc(doc(db, "locations", userId), {
        name: userDisplayName,
        lat: latitude,
        lng: longitude,
        timestamp: Date.now()
      });

      map.setView([latitude, longitude], 15);
    },
    (error) => alert("Error getting location"),
    { enableHighAccuracy: true }
  );
});

// Stop sharing location
stopBtn.addEventListener("click", async () => {
  if (locationWatcher !== null) {
    navigator.geolocation.clearWatch(locationWatcher);
    locationWatcher = null;
    await deleteDoc(doc(db, "locations", userId));
    shareBtn.disabled = false;
    stopBtn.disabled = true;
  }
});

// Show all shared locations
onSnapshot(collection(db, "locations"), (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    const data = change.doc.data();
    const id = change.doc.id;

    if (change.type === "removed") {
      if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    } else {
      const { lat, lng, name } = data;

      if (markers[id]) {
        markers[id].setLatLng([lat, lng]);
        markers[id].bindPopup(name);
      } else {
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(name);
        markers[id] = marker;
      }
    }
  });
});
