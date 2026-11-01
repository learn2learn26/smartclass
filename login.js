
import { auth, authReady } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");

await authReady;

// If the teacher is already signed in, open the dashboard.
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace("dashboard.html");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  errorMessage.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";

  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    window.location.replace("dashboard.html");

  } catch (error) {
    console.error("Login error:", error);

    const messages = {
      "auth/invalid-credential":
        "Incorrect email or password.",
      "auth/invalid-email":
        "Please enter a valid email address.",
      "auth/too-many-requests":
        "Too many attempts. Please try again later.",
      "auth/network-request-failed":
        "Network error. Check your internet connection."
    };

    errorMessage.textContent =
      messages[error.code] || "Login failed. Please try again.";

    loginButton.disabled = false;
    loginButton.innerHTML = 'Sign In <span>→</span>';
  }
});
