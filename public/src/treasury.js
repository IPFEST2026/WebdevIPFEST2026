import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { DB, AUTH } from "./index.js";

// =========================
// INIT
// =========================
console.log("[INIT] treasury.js loaded");

// =========================
// LOGOUT BUTTON
// =========================
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(AUTH);
            alert("Logged out successfully!");
            window.location.href = "../login.html";
        } catch (err) {
            console.error("[AUTH] Logout error:", err);
            alert("Logout failed, check console for details.");
        }
    });
}

// =========================
// AUTH CHECK
// =========================
onAuthStateChanged(AUTH, async (user) => {
    console.log("[AUTH] onAuthStateChanged fired", user);

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    try {
        await user.getIdToken(true);
        const idTokenResult = await user.getIdTokenResult();
        console.log("[AUTH] Token claims:", idTokenResult.claims);
    } catch (err) {
        console.error("[AUTH] Token refresh error:", err);
    }

    if (user.email !== "treasury.ipfest2026@gmail.com") {
        console.warn(`[AUTH] Unauthorized: ${user.email}`);
        window.location.href = "../login.html";
        return;
    }

    console.log("[AUTH] Treasury authorized, loading table...");
    await loadTreasuryTable();
});

// =========================
// ARRAY MENYIMPAN TIM VERIFIED
// =========================
let verifiedTeams = [];

// =========================
// LOAD TEAM DATA
// =========================
async function loadTreasuryTable() {
    console.log("[TABLE] loadTreasuryTable() called");

    const tbody = document.getElementById("treasury-team-list");
    if (!tbody) {
        console.error("[TABLE] tbody not found");
        return;
    }

    tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

    try {
        const teamRef = collection(DB, "Team");
        const teamSnap = await getDocs(teamRef);

        if (teamSnap.empty) {
            tbody.innerHTML = "<tr><td colspan='8'>No data found</td></tr>";
            console.log("[TABLE] No documents found");
            return;
        }

        tbody.innerHTML = "";
        let index = 1;
        let totalRegFee = 0; // total uang registrasi
        let totalTeams = 0;
        let totalVerified = 0;

        teamSnap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const docId = docSnap.id;

            const teamName = data.teamName || "-";
            const university = data.leader?.university || "-";
            const competition = data.competition || "-";
            const payment = data.payment?.uploadedAt
                ? data.payment.uploadedAt.toDate().toLocaleString()
                : "Not Uploaded";
            const earlyBird = data.join_on?.toDate
                ? checkEarlyBird(data.join_on.toDate())
                : "-";
            const proofLink = data.payment?.proofUrl || "-";
            let paymentStatus = data.payment_status || "pending_verification";

            totalTeams++;

            // Simpan tim ke array jika sudah verified
            if (paymentStatus === "verified" && !verifiedTeams.includes(docId)) {
                verifiedTeams.push(docId);
            }

            // Hitung total registrasi hanya untuk tim verified
            if (paymentStatus === "verified") {
                totalVerified++;
                totalRegFee += earlyBird === "Yes" ? 200_000 : 250_000;
            }

            const paymentStatusId = `payment-status-${docId}`;
            const earlyBirdId = `early-bird-${docId}`;
            const paymentStatusHTML = `<span id="${paymentStatusId}" style="cursor:pointer; color:${paymentStatus === 'verified' ? 'green' : 'blue'}">${paymentStatus}</span>`;

            const rowHTML = `
                <tr>
                    <td>${index}</td>
                    <td>${teamName}</td>
                    <td>${university}</td>
                    <td>${competition}</td>
                    <td>${payment}</td>
                    <td id="${earlyBirdId}">${earlyBird}</td>
                    <td>${proofLink !== "-" ? `<a href="${proofLink}" target="_blank">View</a>` : "-"}</td>
                    <td>${paymentStatusHTML}</td>
                </tr>
            `;

            tbody.insertAdjacentHTML("beforeend", rowHTML);

            // Event listener toggle status
            const el = document.getElementById(paymentStatusId);
            el.addEventListener("click", async () => {
                const newStatus = el.innerText === "verified" ? "pending_verification" : "verified";
                const confirmToggle = confirm(`Are you sure you want to change status to "${newStatus}"?`);
                if (!confirmToggle) return;

                try {
                    const teamDocRef = doc(DB, "Team", docId);
                    await updateDoc(teamDocRef, { "payment_status": newStatus });

                    // Update UI
                    el.innerText = newStatus;
                    el.style.color = newStatus === "verified" ? "green" : "blue";

                    // Update array verifiedTeams dan total registrasi
                    const earlyBirdText = document.getElementById(earlyBirdId).innerText;
                    const fee = earlyBirdText === "Yes" ? 200_000 : 250_000;

                    if (newStatus === "verified") {
                        if (!verifiedTeams.includes(docId)) verifiedTeams.push(docId);
                        totalRegFee += fee;
                        totalVerified++;
                    } else {
                        verifiedTeams = verifiedTeams.filter(id => id !== docId);
                        totalRegFee -= fee;
                        totalVerified--;
                    }

                    // Update DOM total
                    document.getElementById("total-reg-fee").innerText = totalRegFee.toLocaleString();
                    document.getElementById("verified-teams").innerText = totalVerified;
                    document.getElementById("unverified-teams").innerText = totalTeams - totalVerified;

                    console.log("Verified teams count:", verifiedTeams.length);
                } catch (err) {
                    console.error("Error updating payment_status:", err);
                    alert("Failed to update payment status. Check console for details.");
                }
            });

            index++;
        });

        // Update DOM saat pertama load
        document.getElementById("total-reg-fee").innerText = totalRegFee.toLocaleString();
        document.getElementById("verified-teams").innerText = totalVerified;
        document.getElementById("unverified-teams").innerText = totalTeams - totalVerified;
        document.getElementById("total-reg").innerText = totalTeams;

        console.log("[TABLE] Table loaded successfully");
        console.log("Initial verified teams count:", verifiedTeams.length);
        console.log("Initial total registration fee:", totalRegFee);
    } catch (err) {
        console.error("[TABLE] Error loading table:", err);
        tbody.innerHTML = "<tr><td colspan='8'>Error loading data</td></tr>";
    }
}

// =========================
// EARLY BIRD CHECK
// =========================
function checkEarlyBird(joinDate) {
    const deadline = new Date("2025-11-16T23:59:59+07:00");
    return joinDate <= deadline ? "Yes" : "No";
}
