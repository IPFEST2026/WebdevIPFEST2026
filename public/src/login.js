// ==== Import Firebase SDK ====
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { AUTH } from "./index.js";
import { emailNotVerified, accountCreated, failedLogin } from "../static/js/alert.js";

// ==== Wait for DOM ====
window.addEventListener("DOMContentLoaded", () => {
  const signupSuccess = localStorage.getItem("signupSuccess");
  if (signupSuccess) {
    accountCreated();
    localStorage.removeItem("signupSuccess");
  }

  const loginForm = document.querySelector("#login-user");
  if (!loginForm) {
    console.error("Login form not found.");
    return;
  }

  // ==== Login event ====
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Ambil input email & password berdasarkan ID (bukan name)
    const userEmail = document.getElementById("email").value.trim();
    const userPassword = document.getElementById("password").value.trim();

    if (!userEmail || !userPassword) {
      failedLogin("Please enter both email and password.");
      return;
    }

    console.log("Attempting login with:", userEmail);

    try {
      const credential = await signInWithEmailAndPassword(AUTH, userEmail, userPassword);
      const user = credential.user;

      console.log("Login successful:", user.email);

      if (!user.emailVerified) {
        emailNotVerified();
        await signOut(AUTH);
        return;
      }

      // ==== Route redirect berdasarkan email ====
      const redirectMap = {
        "officialdelegates.ipfest2025@gmail.com": "./dashboard/delegates-relation.html",
        "treasury.ipfest2025@email.com": "./dashboard/treasury.html",
        "event@ipfest25.com": "./dashboard/event.html",
        "podc.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "mic.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "ppc.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "ordc.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "bcc.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "gdpc.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "wdc.ipfest2025@gmail.com": "./dashboard/compe-manager.html",
        "sc.ipfest2025@gmail.com": "./dashboard/smart-competition/manager.html",
      };

      const destination = redirectMap[user.email] || "./dashboard/delegates.html";
      window.location.href = destination;

    } catch (err) {
      console.error("Login error:", err);

      const knownErrors = [
        "auth/wrong-password",
        "auth/invalid-email",
        "auth/user-not-found",
        "auth/invalid-credential"
      ];

      if (knownErrors.includes(err.code)) {
        failedLogin("Invalid email or password.");
        loginForm.reset();
      } else {
        console.error("Unexpected error:", err);
        window.location.href = "400.html";
      }
    }
  });
});
