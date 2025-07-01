/* Copyright © 2025 All rights reserved.
This file is part of the KeyBlink App.
Author: Ankit */

import { auth, provider, db } from './firebase-init.js';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, signInWithPopup,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc,
  getDocs, query, where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// DOM Elements
const textDisplay = document.getElementById("textDisplay");
const afkMessage = document.getElementById("afkMessage");
const timerDisplay = document.getElementById("timer");
const restartBtn = document.getElementById("restartBtn");
const endBtn = document.getElementById("endBtn");
const results = document.getElementById("results");
const wordButtons = document.querySelectorAll(".length-btn");
const customLength = document.getElementById("customLength");
const greetingText = document.getElementById("greetingText");
const progressBar = document.getElementById("progressBar");
const wordCounter = document.getElementById("wordCounter");
const authModal = document.getElementById("authModal");
const authTitle = document.getElementById("authTitle");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const authActionBtn = document.getElementById("authActionBtn");
const switchAuth = document.getElementById("switchAuth");
const accountBtn = document.getElementById("accountBtn");
const logoutBtn = document.getElementById("logoutBtn");
const closeAuthBtn = document.getElementById("closeAuth");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("userName");
const difficultyLabel = document.getElementById("difficultyLabel");
const tabHistory = document.getElementById("tabHistory");
const authLogin = document.getElementById("authLogin");
const authHistory = document.getElementById("authHistory");
const historyTableBody = document.getElementById("historyTableBody");
const themeToggle = document.getElementById("themeToggle");
const clockIcon = document.getElementById("clockIcon");
const uppercaseToggle = document.getElementById("uppercaseToggle");
const afkOverlay = document.getElementById("afkOverlay");

// App state
let timer = null, startTime = null, started = false, totalChars = 0, correctChars = 0;
let isCountdownRunning = false; // ✅ Prevents duplicate countdowns

let countdownRemaining = 30; // ✅ used to pause/resume countdown correctly

let currentIndex = 0, errorCount = 0, afkTimeout = null, isAfk = false, pausedTime = 0;
let isSigningIn = true, activeUser = null;
let timedMode = false, countdownInterval = null;
let testFinished = false; // Tracks whether test is finished and waiting to restart

let currentWordLength = 30;

// Theme
themeToggle.onclick = () => document.body.classList.toggle("dark");

// Greeting
(function setGreeting() {
  const hour = new Date().getHours();
  greetingText.textContent = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
})();

// Word Sources
const baseWords = ["focus", "type", "speed", "quick", "jump", "brown", "fox", "lazy", "dog", "keyboard", "click", "shift", "space", "backspace", "caps", "lock", "screen", "monitor", "input", "error", "result", "test", "level"];
const numbers = "0123456789".split("");
const symbols = "!@#$%^&*()_-+=[]{},.<>?/\\|".split("");

// Generate random text
function getRandomText(wordCount = 30) {
  const type = document.querySelector('input[name="typeOption"]:checked')?.value || "words";
  const upper = uppercaseToggle.checked;
  const randomWord = () => {
    let word = baseWords[Math.floor(Math.random() * baseWords.length)];
    if (upper) {
      const rand = Math.random();
      if (rand < 0.25) word = word.toUpperCase();
      else if (rand < 0.5) word = word[0].toUpperCase() + word.slice(1);
    }
    return word;
  };

  let words = [];
  if (type === "numbers") {
    for (let i = 0; i < wordCount; i++) words.push(numbers[Math.floor(Math.random() * numbers.length)].repeat(3));
  } else if (type === "symbols") {
    for (let i = 0; i < wordCount; i++) words.push(symbols[Math.floor(Math.random() * symbols.length)]);
  } else if (type === "alphanumeric") {
    let nums = Math.floor(wordCount * 0.4), wordsOnly = wordCount - nums;
    let combined = [];
    for (let i = 0; i < wordsOnly; i++) combined.push(randomWord());
    for (let i = 0; i < nums; i++) combined.push(numbers[Math.floor(Math.random() * numbers.length)].repeat(2));
    words = combined.sort(() => Math.random() - 0.5);
  } else {
    for (let i = 0; i < wordCount; i++) words.push(randomWord());
  }

  return words.join(" ");
}

// Render text
function renderText(content) {
  textDisplay.innerHTML = "";
  totalChars = content.length;
  currentIndex = 0;
  correctChars = 0;
  errorCount = 0;
  wordCounter.textContent = `0 / ${content.trim().split(/\s+/).length}`;
  textDisplay.classList.remove("blurred");

  [...content].forEach((char, i) => {
    const wrap = document.createElement("span");
    wrap.className = "cursor-overlay-wrapper";
    const charSpan = document.createElement("span");
    charSpan.className = "char-span";
    charSpan.textContent = char;
    wrap.appendChild(charSpan);
    if (i === 0) {
      const cursor = document.createElement("span");
      cursor.className = "typing-cursor";
      wrap.appendChild(cursor);
    }
    textDisplay.appendChild(wrap);
  });

  progressBar.style.width = "0%";
  removeEnterOverlay();
  setupTyping();
}

function setupTyping() {
  document.removeEventListener("keydown", handleTyping);
  document.addEventListener("keydown", handleTyping);
  textDisplay.tabIndex = 0;
  textDisplay.focus();
  resetAfkDetection();
}

function handleTyping(e) {
  if (isAfk || currentIndex >= totalChars) return;
  if (!started) {
    started = true;
    if (!timedMode) startTimer();  // ✅ only start normal timer in non-timed mode
  }


  resetAfkDetection(); // <-- This line ensures typing activity resets AFK timer

  const wrappers = document.querySelectorAll(".cursor-overlay-wrapper");
  const key = e.key;
  const wrapper = wrappers[currentIndex];
  const span = wrapper.querySelector(".char-span");

  if (key.length === 1 || key === " " || key === "Enter") {
    if (key === span.textContent) {
      span.classList.add("correct");
      correctChars++;
    } else {
      span.classList.add("incorrect");
      errorCount++;
    }

    wrapper.querySelector(".typing-cursor")?.remove();
    currentIndex++;
    if (currentIndex < wrappers.length) {
      const nextWrapper = wrappers[currentIndex];
      const cursor = document.createElement("span");
      cursor.className = "typing-cursor";
      nextWrapper.insertBefore(cursor, nextWrapper.firstChild);
    }

    const progress = (currentIndex / totalChars) * 100;
    progressBar.style.width = `${progress.toFixed(1)}%`;
    updateWordCounter();

    if (currentIndex >= wrappers.length) finishTest();
  }
}

function updateWordCounter() {
  const typed = [...document.querySelectorAll(".cursor-overlay-wrapper")]
    .slice(0, currentIndex)
    .map(w => w.querySelector(".char-span").textContent)
    .join('').trim();
  const typedWords = typed.split(/\s+/).filter(Boolean).length;
  const totalWords = textDisplay.textContent.trim().split(/\s+/).length;
  wordCounter.textContent = `${typedWords} / ${totalWords}`;
}

function startTimer() {
  startTime = new Date() - pausedTime;
  timer = setInterval(() => {
    const elapsed = Math.floor((new Date() - startTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const sec = String(elapsed % 60).padStart(2, "0");
    timerDisplay.textContent = `${min}:${sec}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
  pausedTime = new Date() - startTime;
}



removeEnterOverlay(); // ✅ Ensure no leftover overlays
function resetTest(length = 30) {
  stopTimer();
  testFinished = false;

  clearInterval(countdownInterval);
  isCountdownRunning = false;

  timedMode = false;
  pausedTime = 0;
  currentWordLength = length;
  timerDisplay.textContent = "00:00";
  timerDisplay.style.color = "";
  started = false;
  results.style.display = "none";
  renderText(getRandomText(length));
  textDisplay.focus();
}

function finishTest() {
  stopTimer();
  clearInterval(countdownInterval);
  clearTimeout(afkTimeout);            // ✅ Fix: Stop AFK
  isAfk = false;
  afkOverlay.style.display = "none";

  const elapsed = (new Date() - startTime) / 1000;
  const wpm = Math.round((correctChars / 5) / (elapsed / 60));
  const accuracy = Math.max(0, Math.round((correctChars / totalChars) * 100));

  results.innerHTML = `
    <div class="horizontal-results">
      <div><strong>WPM:</strong> ${wpm}</div>
      <div><strong>Errors:</strong> ${errorCount}</div>
      <div><strong>Accuracy:</strong> ${accuracy}%</div>
      <button id="historyBtnResult" class="history-btn">History</button>
    </div>`;
  results.style.display = "flex";
  testFinished = true;
  showEnterOverlay();


  if (activeUser) {
    savePerformance(wpm, accuracy, errorCount, elapsed);
    document.getElementById("historyBtnResult").onclick = () => {
      // ✅ Fix: Remove enter overlay to avoid overlap
      removeEnterOverlay();

      authModal.style.display = "flex";
      authLogin.style.display = "none";
      authHistory.style.display = "block";
      loadHistory(activeUser.uid);
    };

  }

  document.onkeydown = e => {
    if (e.key === "Enter") {
      document.onkeydown = null;
      resetTest(currentWordLength);
    }
  };
}

function showEnterOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "enterOverlay";
  overlay.innerHTML = `<span class="finish_continue">Continue..</span>`;
  overlay.className = "enter-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "43%";
  overlay.style.left = "50%";
  overlay.style.transform = "translate(-50%, -50%)";
  overlay.style.zIndex = "999";  // ensure it's on top
  overlay.style.fontSize = "2rem";
  overlay.style.cursor = "pointer";

  const handleContinue = () => {
    removeEnterOverlay(); // ✅ safely removes overlay and cleans up
    resetTest(currentWordLength);
    textDisplay.classList.remove("blurred");
    document.removeEventListener("click", handleContinue); // cleanup
  };

  overlay.addEventListener("click", handleContinue);
  textDisplay.addEventListener("click", handleContinue);

  // Still allow direct overlay click (optional)
  overlay.addEventListener("click", () => {
    removeEnterOverlay();
    resetTest(currentWordLength);
    textDisplay.classList.remove("blurred");
  });


  document.body.appendChild(overlay);
  textDisplay.classList.add("blurred");
}


function removeEnterOverlay() {
  const overlay = document.getElementById("enterOverlay");
  if (overlay) overlay.remove();
  textDisplay.onclick = null; // ✅ remove any lingering click handlers
}

// Auth + Firebase Logic — handled correctly (refer to original for space)
async function savePerformance(wpm, accuracy, errors, duration) {
  try {
    await addDoc(collection(db, "typingHistory"), {
      uid: activeUser.uid,
      wpm,
      accuracy,
      errors,
      duration,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Failed to save:", err);
  }
}

async function loadHistory(uid) {
  const q = query(collection(db, "typingHistory"), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  // Sort entries by timestamp descending, then take only 10 latest
  const entries = snapshot.docs
    .map(doc => doc.data())
    .sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate())
    .slice(0, 10); // Only show 10 latest records

  historyTableBody.innerHTML = "";

  entries.forEach(entry => {
    const { wpm, errors, accuracy, timestamp } = entry;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(timestamp.toDate()).toLocaleString()}</td>
      <td>${wpm}</td>
      <td>${errors}</td>
      <td>${accuracy}%</td>`;
    historyTableBody.appendChild(row);
  });
}


async function calculateDifficulty(uid) {
  const q = query(collection(db, "typingHistory"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  const data = [];

  snapshot.forEach(doc => data.push(doc.data()));
  if (!data.length) {
    difficultyLabel.style.display = "none";
    return;
  }

  const avgWPM = data.reduce((sum, d) => sum + d.wpm, 0) / data.length;
  const avgAcc = data.reduce((sum, d) => sum + d.accuracy, 0) / data.length;
  const totalSec = data.reduce((sum, d) => sum + (d.duration || 0), 0);
  const totalHours = totalSec / 3600;

  let level = "Beginner", color = "green";
  if (avgWPM >= 51 && avgAcc >= 95 && totalHours >= 2) {
    level = "Advanced"; color = "#4169E1";
  } else if (avgWPM >= 26 && avgAcc >= 80 && totalHours >= 1.5) {
    level = "Intermediate"; color = "gold";
  }

  difficultyLabel.textContent = level;
  difficultyLabel.style.backgroundColor = color;
  difficultyLabel.style.color = "white";
  difficultyLabel.style.padding = "4px 8px";
  difficultyLabel.style.borderRadius = "12px";
  difficultyLabel.style.display = "inline-block";
}

// Auth state change
onAuthStateChanged(auth, async (user) => {
  if (user) {
    activeUser = user;
    accountBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    if (user.photoURL) {
      profilePic.src = user.photoURL;
      profilePic.style.display = "inline-block";
    } else {
      profilePic.style.display = "none";  // Don't show photo if email login
    }
    if (user.displayName) {
      // Use only the first part of displayName (first name)
      profileName.textContent = user.displayName.split(" ")[0];
    } else {
      // Use only the part before "@" in email as fallback
      profileName.textContent = user.email.split("@")[0];
    }

    profileName.style.display = "inline-block";
    try {
      await calculateDifficulty(user.uid);
    } catch (err) {
      console.error("Error calculating difficulty:", err);
      difficultyLabel.style.display = "none";
    }
  } else {
    activeUser = null;
    accountBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    profilePic.style.display = "none";
    profileName.style.display = "none";
    difficultyLabel.style.display = "none";
  }
});

// Auth logic
logoutBtn.onclick = () => signOut(auth);

switchAuth.onclick = () => {
  isSigningIn = !isSigningIn;
  authTitle.textContent = isSigningIn ? "Sign In" : "Sign Up";
  authActionBtn.textContent = isSigningIn ? "Sign In" : "Register";
  switchAuth.innerHTML = isSigningIn
    ? `Don't have an account? <a href="#" class="switchLink">Sign Up</a>`
    : `Already have an account? <a href="#" class="switchLink">Sign In</a>`;
};

authActionBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value;
  if (!email || !pass) return alert("Please enter email and password");

  try {
    if (isSigningIn) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length) return alert("Email already in use");
      await createUserWithEmailAndPassword(auth, email, pass);
    }
    authModal.style.display = "none";
  } catch (err) {
    alert(err.message);
  }
};

googleSignInBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, provider);
    authModal.style.display = "none";
  } catch (err) {
    alert(err.message);
  }
};

// UI Event bindings
document.querySelectorAll('input[name="typeOption"]').forEach(r =>
  r.addEventListener("change", () => resetTest(currentWordLength))
);
uppercaseToggle.addEventListener("change", () => resetTest(currentWordLength));
wordButtons.forEach(btn => btn.onclick = () => resetTest(parseInt(btn.dataset.length)));
customLength.onchange = () => {
  const val = parseInt(customLength.value);
  if (val > 0) resetTest(val);
};

// Clock (timed) mode
clockIcon.onclick = () => {
  timedMode = true;
  countdownRemaining = 30;
  started = false;
  isAfk = false;
  isCountdownRunning = false;
  clearInterval(countdownInterval);
  stopTimer(); // in case non-timed mode timer is running

  timerDisplay.textContent = "00:30";
  timerDisplay.style.color = "green";

  testFinished = false;
  pausedTime = 0;
  results.style.display = "none";

  // ✅ Reset and render fresh text
  renderText(getRandomText(currentWordLength));

  // ✅ Activate timer only when typing starts
  document.removeEventListener("keydown", handleTyping);
  document.addEventListener("keydown", (e) => {
    if (isAfk || currentIndex >= totalChars) return;
    if (!started) {
      started = true;
      if (!isCountdownRunning) {
        isCountdownRunning = true;

        countdownInterval = setInterval(() => {
          if (!isAfk && countdownRemaining > 0) {
            countdownRemaining--;
            timerDisplay.textContent = `00:${String(countdownRemaining).padStart(2, "0")}`;
            timerDisplay.style.color =
              countdownRemaining <= 10 ? "red" :
                countdownRemaining <= 20 ? "orange" : "green";

            if (countdownRemaining <= 0) {
              clearInterval(countdownInterval);
              isCountdownRunning = false;
              timerDisplay.textContent = "00:00";
              timerDisplay.style.color = "black";
              finishTest();
            }
          }
        }, 1000);
      }
    }

    handleTyping(e); // forward event
  });

  resetAfkDetection();
  textDisplay.focus();
};



// Restart / End
restartBtn.onclick = () => resetTest(currentWordLength);
accountBtn.onclick = () => {
  removeEnterOverlay(); // ✅ Hides the "Press to continue..." overlay
  authModal.style.display = "flex";
  authLogin.style.display = "block";
  authHistory.style.display = "none";
};

endBtn.onclick = () => {
  if (started) finishTest();
  textDisplay.blur();
};

// Fix for closing the auth modal
closeAuthBtn.onclick = () => {
  authModal.style.display = "none";
  if (testFinished) showEnterOverlay();
};

//AFK Detection
function resetAfkDetection() {
  clearTimeout(afkTimeout);
  afkTimeout = setTimeout(() => {
    if (started && currentIndex < totalChars) {
      isAfk = true;
      if (timedMode) {
        clearInterval(countdownInterval); // stop countdown timer
        isCountdownRunning = false; // <--- ADD THIS LINE
      } else {
        stopTimer(); // stop normal timer
      }
      afkOverlay.style.display = "flex";
      afkMessage.style.display = "block";
      textDisplay.classList.add("blurred");  // ✅ Apply blur

      const clearAFK = () => {
        afkOverlay.style.display = "none";
        afkMessage.style.display = "none";
        textDisplay.classList.remove("blurred"); // ✅ Remove blur
        isAfk = false;

        if (timedMode) {
          // ✅ Fix: prevent duplicate timers by setting flag before starting interval
          if (!isCountdownRunning) {
            isCountdownRunning = true; // ✅ moved this BEFORE setInterval

            timerDisplay.textContent = `00:${String(countdownRemaining).padStart(2, "0")}`;
            timerDisplay.style.color =
              countdownRemaining <= 10 ? "red" :
                countdownRemaining <= 20 ? "orange" : "green";

            countdownInterval = setInterval(() => {
              countdownRemaining--;

              if (countdownRemaining <= 0) {
                clearInterval(countdownInterval);
                isCountdownRunning = false;
                timerDisplay.textContent = "00:00";
                timerDisplay.style.color = "black";
                finishTest();
              } else {
                timerDisplay.textContent = `00:${String(countdownRemaining).padStart(2, "0")}`;
                timerDisplay.style.color =
                  countdownRemaining <= 10 ? "red" :
                    countdownRemaining <= 20 ? "orange" : "green";
              }
            }, 1000);
          }
        } else {
          startTimer(); // safe to resume normal timer
        }

        resetAfkDetection();
        document.removeEventListener("keydown", clearAFK);
        document.removeEventListener("click", clearAFK);
      };

      document.addEventListener("keydown", clearAFK);
      document.addEventListener("click", clearAFK);
    }
  }, 5000);
}

// Initialize
resetTest(currentWordLength);
