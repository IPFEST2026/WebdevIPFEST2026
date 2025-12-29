import { doc, getDoc, updateDoc, serverTimestamp,collection, getDocs, setDoc } from 'firebase/firestore'

import { onAuthStateChanged, signOut } from 'firebase/auth'

import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { showProgressUI, setToastAlert } from '../static/js/alert.js'

// =========================
// AUTH STATE
// =========================
let currentUserID = null;

onAuthStateChanged(AUTH, async (user) => {
	if (!user) {
		window.location.href = '../login.html';
		return;
	}

	currentUserID = user.uid;
	let userData = await fetchUserData();
    let userCompetition = (userData.competitionRaw || "").toLowerCase();
    let paymentStatus = (userData.paymentStatus || null);
    let prelimStatus = (userData.prelimstats || null);
    let PrelimOverdue = (userData.prelim_overdue || null);
    let PrelimSubmittedAt = (userData.prelimSubmittedAt || null);
    let PrelimFileURL = (userData.prelimFileURL || null);
    let finalPaymentStatus = (userData.finalPaymentStatus || null);
    let finalstatus = (userData.finalstatus?? null);

	loadPrelimCase(currentUserID, paymentStatus);
    setupGuidebook(userCompetition);
    setupEditSubmission(prelimStatus);
    submissionSummary(PrelimOverdue, PrelimSubmittedAt, PrelimFileURL);
    setupPrelimTab(paymentStatus);
    setupFinalTab(finalPaymentStatus);
    setupFinalRoundLink(finalstatus,currentUserID);
});



// =========================
// COMPETITION FULL NAME MAP
// =========================
const CompetitionFullName = {
	"business case": "Business Case Competition",
	"geothermal development plan": "Geothermal Development Plan Competition",
	"paper and poster": "Paper and Poster Competition",
	"oil rig design": "Oil Rig Design Competition",
	"smart competition": "Smart Competition",
	"mud inovation": "Mud Innovation Competition",
	"plan of development": "Plan of Development Competition",
	"well design": "Well Design Competition",
	"hackaton": "Hackathon Competition"
};

// =========================
// WA GROUP LINKS
// =========================
const WAGroup = {
	"business case": "https://chat.whatsapp.com/LQIOCCbVfYhJaJyPl5w9XV?mode=wwt",
	"geothermal development plan": "https://chat.whatsapp.com/GIELYdRnXdP09pVcgjqPiB?mode=wwt",
	"paper and poster": "https://chat.whatsapp.com/Hew4NHXzrFgBM3C6QmBRkx?mode=wwt",
	"oil rig design": "https://chat.whatsapp.com/EjGDGrF5ldGFDyLVoz50vO?mode=wwt",
	"smart competition": "https://chat.whatsapp.com/H4ReXpGuRPHHuke5CUIWiu?mode=wwt",
	"mud inovation": "https://chat.whatsapp.com/GIhNevsM6HW2xDUirbLGUo?mode=wwt",
	"plan of development": "https://chat.whatsapp.com/DCYjX4rejsqLKZAdKVqeQi?mode=wwt",
	"well design": "https://chat.whatsapp.com/L96OCbDm3sq7CvvbhNyz7U?mode=wwt",
	"hackaton": "https://chat.whatsapp.com/BxMDdoC9aWG0MKx8cWZTqz?mode=wwt"
};

// =========================
// FETCH USER DATA
// =========================
async function fetchUserData() {
	if (!currentUserID) return;

	try {
		const docRef = doc(DB, "Team", currentUserID);
		const snap = await getDoc(docRef);

		if (!snap.exists()) {
			console.error("Team data not found");
			return;
		}

		const data = snap.data();

		// TEAM LEADER
		document.getElementById("Team-Leader").textContent =
			`${data.leader.firstName} ${data.leader.lastName}`;

		// TEAM NAME
		document.getElementById("Team-Name").textContent =
			data.teamName || "-";

		// =========================
		// COMPETITION (FULL NAME)
		// =========================
		const compKey = (data.competition || "").toLowerCase();
		document.getElementById("Competition-Name").textContent =
			CompetitionFullName[compKey] || data.competition || "-";

		// =========================
		// WA GROUP (DISABLED IF NOT VERIFIED)
		// =========================
		const waEl = document.getElementById("WhatsApp-Group");
		const waLink = WAGroup[compKey] || "#";

		if (data.payment_status?.toLowerCase() === "verified") {
			// PAYMENT VERIFIED → LINK AKTIF
			waEl.href = waLink;
			waEl.textContent = "Join";
			waEl.style.pointerEvents = "auto";
			waEl.style.opacity = "1";
		} else {
			// PAYMENT NOT VERIFIED → LINK DISABLED
			waEl.href = "javascript:void(0)";
			waEl.textContent = "Your payment has not been verified";
			waEl.style.pointerEvents = "none";  // Disable clicking
			waEl.style.opacity = "0.5";         // Make it look disabled
		}
		// =========================
		// MEMBERS LIST (FULL NAMES)
		// =========================
		const members = data.members || [];

		if (members.length > 0) {
			const names = members.map(m => `${m.firstName} ${m.lastName}`);
			document.getElementById("Team-Member").textContent = names.join(", ");
		} else {
			document.getElementById("Team-Member").textContent = "-";
		}

		// PAYMENT STATUS
		let paymentStatusText = data.payment_status === "verified" ? "Verified" : "Pending";
		document.getElementById("Payment-Status").textContent =
			paymentStatusText || "Not Submitted";
        
     // applySubmissionLock expects `undefined` when not submitted
        const prelimStatus = data.sub_preliminary === undefined ? undefined : data.sub_preliminary;
        applySubmissionLock(prelimStatus);

        let prelim_overdue = null;
        if (prelimStatus && prelimStatus.overdue !== undefined) {
            prelim_overdue = prelimStatus.overdue === "yes" ? "Overdue" : "On Time";
        }

        const prelimSubmittedAt = prelimStatus && prelimStatus.submittedAt ? prelimStatus.submittedAt : null;
        const prelimFileURL = prelimStatus && prelimStatus.fileURL ? prelimStatus.fileURL : null;

		const prelimRank = prelimStatus.rank ?? "-";
		document.getElementById("Preliminary-Rank").textContent = prelimRank;

        const finalstatus = prelimStatus.final ?? "-";

        const finalData = data.final_reg || {};
		const finalPaymentStatus = finalData.paymentStatus || null;

        let finalStatusText = "Not Paid"; // default jika null
		if (finalPaymentStatus === "pending") finalStatusText = "Pending";
		else if (finalPaymentStatus === "down_payment_verified") finalStatusText = "Down Payment Verified";
		else if (finalPaymentStatus === "verified") finalStatusText = "Verified";

		document.getElementById("Final-Payment-Status").textContent = finalStatusText;
        return {
            competitionRaw: data.competition || null,
            paymentStatus: data.payment_status || null,
            teamName: data.teamName || null,
            prelimstats : prelimStatus || null,
            prelim_overdue: prelim_overdue,
            prelimSubmittedAt: prelimSubmittedAt,
            prelimFileURL: prelimFileURL,
            finalPaymentStatus : finalPaymentStatus || null,
            finalstatus : finalstatus?? null
        };



	} catch (err) {
		console.error("Failed to fetch data:", err);
	}
}

// Write Final Payment Status
// function writePaymentStatus(status) {
// 	delegatePaymentStatus.innerHTML = ''

// 	if (status) {
// 		delegatePaymentStatus.innerHTML = `
// 			<div class="alert alert-success alert-dismissible fade show" role="alert">
// 				<h4 class="alert-heading">Confirmed</h4>
// 				<p>Your team final payment has been confirmed! <i class="bi bi-emoji-smile"></i></p>
// 				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
// 				<hr>
//   				<p class="mb-0">Make sure your liaison officer has invited you to the finalist group.</p>
// 			</div>
// 		`
// 	} else {
// 		delegatePaymentStatus.innerHTML = `
// 			<div class="alert alert-warning" role="alert">
// 				<h4 class="alert-heading">Unconfirmed</h4>
// 				<p>Your team final payment has not been confirmed <i class="bi bi-emoji-frown"></i></p>
// 				<hr>
//   				<p class="mb-0">If within 24 hours the status has not changed, please contact us</p>
// 			</div>
// 		`
// 	}
// }

// function decomposeDelName(firstname, lastname) {
// 	return `${firstname} ${lastname}`
// }


// =====================================
// ELEMENTS
// =====================================
let preliminaryForm = null;
let prelimSubmitBtn = null;
let premFileInput = null;
let deleteFileBtnPrem = null;
let delegateSubmissionSummary = null;
let editFileBtnPrem = null;
let delCasePrelimLink = null;

// central init to run when DOM is ready
function initDomBindings() {
    preliminaryForm = document.getElementById("preliminary-form");
    prelimSubmitBtn = document.getElementById("prelim-submit-btn");
    premFileInput = preliminaryForm ? preliminaryForm.querySelector("input[name='preliminary-submit']") : null;
    deleteFileBtnPrem = document.getElementById("delete-file-prem");
    delegateSubmissionSummary = document.getElementById("del-submission-summary");
    editFileBtnPrem = delegateSubmissionSummary ? delegateSubmissionSummary.querySelector("#del-edit-submission") : null;
    delCasePrelimLink = document.getElementById("del-case-prelim-download");

    // logout button (safe attach)
    const logoutBtn = document.querySelector("#logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(AUTH).then(() => {
                console.log("log out btn clicked");
                window.location.href = '../login.html';
            }).catch((err) => {
                console.log("Cannot loggin out user", err);
            });
        });
    }

    // safe delete file button
    if (deleteFileBtnPrem && premFileInput) {
        deleteFileBtnPrem.addEventListener("click", () => {
            premFileInput.value = "";
        });
    }

    // wire have-read checkbox handlers (moved here)
    const haveReadCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']#have-read"));
    console.log("initDomBindings: preliminaryForm =", preliminaryForm, "prelimSubmitBtn =", prelimSubmitBtn, "premFileInput =", premFileInput);

    haveReadCheckboxes.forEach(cb => {
        const form = cb.closest("form");
        const submitBtn = form ? form.querySelector("button[type='submit'], input[type='submit']") : null;
        if (submitBtn) {
            submitBtn.disabled = true;
            console.log("initDomBindings: submitBtn initially disabled for form", form?.id, "disabled =", submitBtn.disabled);
        }

        function updateSubmitState() {
            console.log("updateSubmitState START:", {
                formId: form?.id,
                checkboxChecked: cb.checked,
                submitBtnDisabledBefore: submitBtn?.disabled
            });

            if (submitBtn) {
                submitBtn.disabled = !cb.checked;
                submitBtn.style.opacity = cb.checked ? "1" : "0.5";
                submitBtn.style.pointerEvents = cb.checked ? "auto" : "none"; // <- pastikan tombol tidak bisa diklik
            }

            if (cb.checkValidity && !cb.checked) {
                cb.classList.add("is-invalid");
            } else {
                cb.classList.remove("is-invalid");
            }

            console.log("updateSubmitState END:", {
                formId: form?.id,
                checkboxChecked: cb.checked,
                submitBtnDisabledAfter: submitBtn?.disabled
            });
        }

        cb.addEventListener("change", (e) => {
            console.log("checkbox CHANGE event triggered for form", form?.id);
            updateSubmitState();
        });

        cb.addEventListener("click", (e) => {
            console.log("checkbox CLICK event triggered for form", form?.id);
            setTimeout(updateSubmitState, 0);
        });

        updateSubmitState();
    });
    // attach preliminary form submit safely
    if (preliminaryForm) {
        preliminaryForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!isSubmissionOpen()) {
                alert("⚠️ Submission will open on 30 November 2025\nPlease wait until then!");
                return;
            }

            // guard button/input
            if (!prelimSubmitBtn || prelimSubmitBtn.disabled) return;
            if (!premFileInput) {
                alert("File input not found.");
                return;
            }

            prelimSubmitBtn.disabled = true;
            const oldText = prelimSubmitBtn.innerText;
            prelimSubmitBtn.innerText = "Processing...";

            try {
                const file = premFileInput.files[0];
                if (!file) {
                    alert("Please choose a file before submitting.");
                    throw new Error("File is null");
                }

                const timeStamp = Date.now();
                const uploadPath = `preliminary_submissions/${file.name}_${timeStamp}`;
                const uploadRef = ref(STORAGE, uploadPath);
                const snap = await uploadBytes(uploadRef, file);
                const downloadURL = await getDownloadURL(snap.ref);

                await updateDoc(doc(DB, "Team", currentUserID), {
                    sub_preliminary: {
                        fileURL: downloadURL,
                        submittedAt: serverTimestamp(),
                        status: true,
                        overdue: overdueStatus(),
                    }
                });

                alert("✅ You're all set — submission complete!\n🔥 Keep up the fire!");
                location.reload();
            } catch (err) {
                console.error(err);
                alert("Cannot upload file! Please contact committee.");
            } finally {
                if (prelimSubmitBtn) {
                    prelimSubmitBtn.disabled = false;
                    prelimSubmitBtn.innerText = oldText || "Submit";
                }
            }
        });
    }
}

// ensure init runs whether DOMContentLoaded already fired or not
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDomBindings);
} else {
    initDomBindings();
}


// =====================================
// DEADLINE CHECK
// =====================================
function overdueStatus() {
    const deadline = new Date("Dec 22, 2025 00:00:00").getTime();
    if (Date.now() > deadline) {
        return "yes"
    } else {
        return "no"
    }
}

// =====================================
// SUBMISSION OPENING DATE
// =====================================
function isSubmissionOpen() {
    const openDate = new Date("Nov 30, 2025 00:00:00").getTime();
    return Date.now() >= openDate;
}

// =====================================
// Verified Status Check
// =====================================


function setupPrelimTab(paymentStatus) {
    const prelimTab = document.getElementById("nav-profile-tab");

    if (paymentStatus !== "verified") {
  
        prelimTab.removeAttribute("data-bs-toggle");

        prelimTab.addEventListener("click", function (e) {
            e.preventDefault();
            alert("⚠️ Your payment has not been verified. Please complete the payment to access the Preliminary Case.");
        });

    } else {
 
        prelimTab.setAttribute("data-bs-toggle", "tab");
    }
}


// =====================================
// LOAD PRELIM CASE
// =====================================
export async function loadPrelimCase(currentUserID) {
    try {
        console.log("Starting loadPrelimCase...");
        console.log("Current user ID:", currentUserID);

        const teamRef = doc(DB, "Team", currentUserID);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
            console.log("Team doc not found");
            return;
        }
        // Ambil nama competition dari Team
        const rawCompetition = teamSnap.data().competition;
        console.log("competition from Team:", rawCompetition);

        const userCompetition = rawCompetition?.trim().toLowerCase();

        if (!userCompetition) {
            alert("Your competition data is missing!");
            return;
        }

        if (!isSubmissionOpen()) {
            console.log("Prelim case is still locked.");

            if (delCasePrelimLink) {
                delCasePrelimLink.href = "javascript:void(0)";
                delCasePrelimLink.innerText = "Case Locked";

                delCasePrelimLink.style.color = "gray";
                delCasePrelimLink.style.pointerEvents = "auto";

                delCasePrelimLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    alert("⚠️ The Preliminary Case is not yet accessible. It will be available for download on 30 November 2025");
                });
            }

            return; // stop di sini
        }

        console.log("✅ Prelim case unlocked — continuing load...");

        console.log("Normalized user competition:", userCompetition);

        // Ambil seluruh dokumen Information
        const infoRef = collection(DB, "Information");
        const infoSnap = await getDocs(infoRef);

        console.log("Total documents in Information:", infoSnap.size);

        if (infoSnap.empty) {
            alert("⚠️ No case available yet!");
            return;
        }

        // Loop dan cari yang nama kompetisinya cocok
        let matchedCase = null;

        infoSnap.forEach(docItem => {
            const data = docItem.data();
            const compName = data.competition_name?.trim().toLowerCase();

            console.log("🔸 Checking:", compName);

            if (compName === userCompetition) {
                console.log("✅ MATCH FOUND:", data);
                matchedCase = data;
            }
        });

        // Tidak ditemukan case
        if (!matchedCase) {
            console.log("❌ No matched competition name in Information");

            // Pastikan elemen ada
            if (delCasePrelimLink) {
                // Hindari navigasi
                delCasePrelimLink.href = "javascript:void(0)";
                // Gunakan event listener yang jelas
                delCasePrelimLink.addEventListener("click", function (e) {
                    e.preventDefault();
                    alert("⚠️ Case is not available yet for your competition.");
                });

                // Tampilkan sebagai disabled/gray
                delCasePrelimLink.style.color = "gray";
                delCasePrelimLink.style.pointerEvents = "auto"; // biarkan klik supaya handler berjalan
                delCasePrelimLink.innerText = "Case Not Available";
            } else {
                console.warn("#del-case-prelim-download element not found");
            }

            // KELUAR supaya kode di bawah yang memakai matchedCase tidak dieksekusi
            return;
        } else {
            // Set link jika cocok
            delCasePrelimLink.href = matchedCase.prelim_case_link;
            delCasePrelimLink.innerText = "Download Case";
            delCasePrelimLink.style.pointerEvents = "auto";
            delCasePrelimLink.style.color = "#0dcaf0";

            console.log("📎 Case link assigned:", matchedCase.prelim_case_link);

            // --- FINAL CASE LINK ---
            try {
                const delCaseFinalLink = document.getElementById("del-case-final-download");
                if (delCaseFinalLink) {
                    // try multiple shapes for stored final link
                    const finalCaseUrl = matchedCase.final_case_link || (matchedCase.final && (matchedCase.final.case_link || matchedCase.final.final_case_link)) || null;
                    if (finalCaseUrl) {
                        delCaseFinalLink.href = finalCaseUrl;
                        delCaseFinalLink.innerText = "Download Case";
                        delCaseFinalLink.style.pointerEvents = "auto";
                        delCaseFinalLink.style.color = "#0dcaf0";
                        console.log("📎 Final case link assigned:", finalCaseUrl);
                    } else {
                        delCaseFinalLink.href = "javascript:void(0)";
                        delCaseFinalLink.innerText = "Case Not Available";
                        delCaseFinalLink.style.color = "gray";
                        delCaseFinalLink.addEventListener("click", (e) => {
                            e.preventDefault();
                            alert("⚠️ Final case is not available yet for your competition.");
                        });
                    }
                }
            } catch (err) {
                console.error("Error assigning final case link:", err);
            }
        }
	} catch (err) {
		console.error("Error in loadPrelimCase:", err);	
	}
}

// =====================================
// COMPETITION GUIDEBOOK SETUP
// =====================================

const competitionGuideBookRaw = {
    "business case": "https://drive.google.com/drive/folders/1eG9MgKhfW0E_aQrsW14aN29GLMXDGfCm?usp=drive_link",
    "geothermal development plan": "https://drive.google.com/drive/folders/12m5cj1cZVBADe5EpgcRTrieLi4n7s8Sx?usp=drive_link",
    "mud inovation": "https://drive.google.com/drive/folders/1noM7qGBFAVzUF6rX-tw8SJtLKZur0oxy?usp=drive_link",
    "oil rig design": "https://drive.google.com/drive/folders/11cJQVMsE95aGnZRe_N5PZ-tfmHcoA15V?usp=drive_link",
    "paper and poster": "https://drive.google.com/drive/folders/17P023GNrW9ksEgIVyvJ7_N459IV-u0jw?usp=drive_link",
    "plan of development": "https://drive.google.com/drive/folders/1BPNsjzrBkBcNTNhe8sp68B_RfZTy20Ve?usp=drive_link",
    "smart competition": "https://drive.google.com/drive/folders/1dxNlkauTNd-Oa0sN46ShO0oQCv-EoMDe?usp=drive_link",
    "well design": "https://drive.google.com/drive/folders/1nsiXXuDWnsf-5o62yt758k6WZYPaNqjI?usp=drive_link",
    "hackaton": "https://drive.google.com/drive/folders/1HorhBttwNfCOY2dB9VqOR_GxXjujtXDI?usp=drive_link"
};

function setupGuidebook(userCompetition) {
    console.log("setupGuidebook: lookup key =", userCompetition);

    if (!userCompetition) {
        console.warn("setupGuidebook: userCompetition kosong");
        return;
    }

    const lookupKey = userCompetition;
    const guidebookURL = competitionGuideBookRaw[lookupKey] || null;

    console.log("setupGuidebook: found guidebook entry =", guidebookURL);

    const guidebookAnchor = document.getElementById("competition-guide-book");

    if (!guidebookAnchor) {
        console.error("setupGuidebook: Elemen #competition-guide-book tidak ditemukan!");
        return;
    }

    // ======================================================
    // CASE: SUBMISSION BELUM OPEN → kasih alert saat diklik
    // ======================================================
    if (!isSubmissionOpen()) {
        guidebookAnchor.href = "#"; // tidak membuka apa pun

        guidebookAnchor.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Guidebook can be accessed during the submission period.");
        });

        console.log("setupGuidebook: guidebook locked — alert mode aktif");
        return;
    }

    // ======================================================
    // CASE: SUBMISSION SUDAH OPEN → normal
    // ======================================================
    if (!guidebookURL) {
        guidebookAnchor.href = "#";
        guidebookAnchor.innerText = "Guidebook Not Available";
        return;
    }

    // Normal mode
    guidebookAnchor.href = guidebookURL;
    guidebookAnchor.innerText = "Guide Book";
    guidebookAnchor.classList.remove("disabled");

    console.log("setupGuidebook: guidebook link applied");
}

// =====================================
// SUBMISSION LOCKING
// =====================================

function applySubmissionLock(submissionData) {
    const downloadCaseRow = document.querySelector(".row.my-2");
    const formRow = document.querySelector("#preliminary-form")?.closest(".row");

    if (submissionData !== undefined) {
        prelimSubmitBtn.disabled = true;
        prelimSubmitBtn.innerText = "Already Submitted";

        // Hide "Download Case"
        if (downloadCaseRow) downloadCaseRow.style.display = "none";

        // Hide entire form block
        if (formRow) formRow.style.display = "none";
    } else {
        // Normal (not submitted)
        prelimSubmitBtn.disabled = false;
        prelimSubmitBtn.innerText = "Submit";

        if (downloadCaseRow) downloadCaseRow.style.display = "block";
        if (formRow) formRow.style.display = "block";
    }
}


// =====================================
// EDIT SUBMISSION SETUP
// =====================================
function setupEditSubmission(prelimstats) {
    // Nonactive for no submission
    if (!prelimstats) {
        const editBtn = document.getElementById("del-edit-submission");
        if (editBtn) editBtn.style.display = "none";
        return;
    }
}

// Edit submission button handler
document.addEventListener("DOMContentLoaded", () => {

    editFileBtnPrem.addEventListener("click", () => {
        const editModal = new bootstrap.Modal(document.getElementById("editConfirmModal"));
        editModal.show();
    });

    document.getElementById("confirmEditBtn").addEventListener("click", () => {
        unlockSubmissionForm();

        document.getElementById("del-edit-submission").style.display = "none";

        const modalInstance = bootstrap.Modal.getInstance(
            document.getElementById("editConfirmModal")
        );
        modalInstance.hide();
    });

});

function unlockSubmissionForm() {

    applySubmissionLock(undefined);
    const downloadCaseRow = document.querySelector(".row.my-2");
    const formRow = document.querySelector("#preliminary-form")?.closest(".row");

    // Show everything again
    if (downloadCaseRow) downloadCaseRow.style.display = "block";
    if (formRow) formRow.style.display = "block";

    // Restore inner form elements
    preliminaryForm.querySelectorAll("*").forEach(el => {
        el.style.display = ""; 
    });

    // Restore submit button
    prelimSubmitBtn.disabled = false;
    prelimSubmitBtn.innerText = "Submit";
}


function submissionSummary (PrelimOverdue, PrelimSubmittedAt, PrelimFileURL) {
    if (!delegateSubmissionSummary) return;

    const delLastSubmission = delegateSubmissionSummary.querySelector("#file-time-sub");
    const delSubmissionStatus = delegateSubmissionSummary.querySelector("#file-time-status");
    const delFileURL = delegateSubmissionSummary.querySelector("#file-url");

    // submittedAt may be a Firestore Timestamp or a Date or null
    let submittedText = "No submission yet";
    if (PrelimSubmittedAt) {
        try {
            const dt = typeof PrelimSubmittedAt.toDate === "function"
                ? PrelimSubmittedAt.toDate()
                : new Date(PrelimSubmittedAt);
            submittedText = isNaN(dt) ? "No submission yet" : dt.toLocaleString();
        } catch {
            submittedText = "No submission yet";
        }
    }
    if (delLastSubmission) delLastSubmission.textContent = submittedText;
    if (delSubmissionStatus) delSubmissionStatus.textContent = PrelimOverdue || "No submission yet";

    if (delFileURL) {
        if (PrelimFileURL) {
            delFileURL.innerHTML = `<a href="${PrelimFileURL}" target="_blank" class="text-primary text-decoration-underline">Open File</a>`;
        } else {
            delFileURL.textContent = "No file uploaded";
        }
    }
}

// =====================================
// FINAL TAB ACCESS CONTROL
// =====================================
console.log("SCRIPT LOADED");


// =====================================
// FINAL ROUND LINK SETUP (FIXED BOOLEAN LOGIC)
// =====================================
async function setupFinalRoundLink(finalStatusRaw, currentUserID) {
    // 1. Ambil Elemen
    let finalLink = document.getElementById("Final-Round-Registration");
    const rankDisplay = document.getElementById("Preliminary-Rank"); // Elemen Rank di Card 1
    const paymentDisplay = document.getElementById("Final-Payment-Status"); // Elemen Payment di Card 3

    if (!finalLink) return;

    // 2. Reset Listener (Clone Node untuk hapus event lama agar tidak menumpuk)
    finalLink.replaceWith(finalLink.cloneNode(true));
    finalLink = document.getElementById("Final-Round-Registration"); 

    // -----------------------------------------------------------
    // LOGIKA BARU SESUAI DATABASE (BOOLEAN)
    // finalStatusRaw: true (Lolos), false (Gagal), null/"-" (Pending)
    // -----------------------------------------------------------

    if (finalStatusRaw === true) {
        // ============================
        // SKENARIO 1: LOLOS (PASSED) -> Tampilkan Tombol Regist
        // ============================
        
        finalLink.textContent = "Regist";
        finalLink.style.pointerEvents = "auto";
        finalLink.style.opacity = "1";
        
        // Reset style tombol ke default CSS (jika sebelumnya diubah jadi abu-abu)
        finalLink.style.backgroundColor = ""; 
        finalLink.style.borderColor = "";
        finalLink.style.color = "";
        finalLink.removeAttribute("href"); // Pastikan tidak ada href aneh

        // Event Klik: Buka Modal Pembayaran
        finalLink.addEventListener("click", async (e) => {
            e.preventDefault();

            const docRef = doc(DB, "Team", currentUserID);
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                alert("Team data not found.");
                return;
            }

            const teamData = snap.data();
            generateFinalModal(teamData); // Fungsi generate modal Anda

            const finalModal = new bootstrap.Modal(document.getElementById("finalPaymentModal"));
            finalModal.show();
        });

    } else if (finalStatusRaw === false) {
        // ============================
        // SKENARIO 2: TIDAK LOLOS -> TOMBOL PESAN SEMANGAT
        // ============================

        // A. RANK (Biarkan normal/putih, jangan merah)
        if (rankDisplay) {
            rankDisplay.style.color = ""; 
            rankDisplay.style.textShadow = "";
        }

        // B. UBAH TOMBOL JADI "SURAT CINTA"
        finalLink.textContent = "A Message For You"; 
        
        // Aktifkan klik (PENTING)
        finalLink.style.pointerEvents = "auto"; 
        finalLink.style.cursor = "pointer";

        // Style tombol: Outline putih transparan (elegan & rendah hati)
        finalLink.style.backgroundColor = "transparent"; 
        finalLink.style.borderColor = "rgba(255, 255, 255, 0.6)";
        finalLink.style.color = "#ffffff"; 
        finalLink.style.opacity = "1"; 
        finalLink.style.boxShadow = "none";
        finalLink.removeAttribute("href");

        // C. EVENT LISTENER: BUKA MODAL SEMANGAT
        finalLink.addEventListener("click", async (e) => {
            e.preventDefault();

            // Kita ambil nama tim dulu biar personal
            const docRef = doc(DB, "Team", currentUserID);
            const snap = await getDoc(docRef);
            const teamName = snap.exists() ? snap.data().teamName : "Champion";

            // Generate isi modal semangat
            generateEncouragementModal(teamName);

            // Tampilkan modal yang sama (finalPaymentModal)
            const finalModal = new bootstrap.Modal(document.getElementById("finalPaymentModal"));
            finalModal.show();
        });

        // D. Kosongkan Status Payment
        if (paymentDisplay) {
            paymentDisplay.textContent = "-";
            
            // Opsional: Bikin agak samar biar user tidak fokus ke situ
            paymentDisplay.style.opacity = "0.5"; 
        }
        
    } else {
        // ============================
        // SKENARIO 3: PENDING (null atau "-") -> Tampilan Default
        // ============================
        
        finalLink.textContent = "Pending";
        finalLink.style.pointerEvents = "none";
        finalLink.style.opacity = "0.5";
        
        // Pastikan rank tetap menampilkan strip atau nilai aslinya jika pending
        if (rankDisplay && rankDisplay.textContent === "NOT PASSED") {
             rankDisplay.textContent = "Pending";
             rankDisplay.style.color = ""; // Reset warna
        }

        paymentDisplay.textContent = "Pending";
    }
}

// =====================================
// GENERATE MODAL SEMANGAT (HTML)
// =====================================
function generateEncouragementModal(teamName) {
    const wrapper = document.getElementById("final-payment-wrapper");

    // HTML Pesan Semangat
    wrapper.innerHTML = `
        <div class="modal-header border-0">
            <h5 class="modal-title fw-bold text-secondary">A Message from Committee</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body text-center p-5">
            <div class="mb-4" style="font-size: 4rem;">
                ✨
            </div>

            <h2 class="fw-bold mb-3" style="color: #671c84;">Dear ${teamName},</h2>
            
            <p class="lead text-muted mb-4">
                Thank you for being a part of this incredible journey. 
                We have reviewed your submission, and although you did not proceed to the final round this time, 
                your effort and dedication truly stood out.
            </p>

            <div class="card bg-light border-0 p-3 mb-4 text-start">
                <p class="mb-0 fst-italic text-secondary">
                    "Success is not final, failure is not fatal: it is the courage to continue that counts."
                    <br><span class="fw-bold">— Winston Churchill</span>
                </p>
            </div>

            <p class="text-secondary">
                Please don't let this stop you. Keep learning, keep growing, and we hope to see you shine even brighter next year!
            </p>
        </div>

        <div class="modal-footer border-0 justify-content-center">
            <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal">Close</button>
        </div>
    `;
}


function generateFinalModal(teamData) {
    const wrapper = document.getElementById("final-payment-wrapper");

    // Cegah overwrite kalau sudah ada isi
    if (wrapper.innerHTML.trim() !== "") return;

    // Leader info
    const leaderfirstname = teamData.leader.firstName;
    const leaderlastname = teamData.leader.lastName;

    // Generate form member
    // Generate form member
    let memberFormsHTML = "";
    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            memberFormsHTML += `
                <div class="member-final-pay-form mt-3 p-3 border rounded">
                    <h5 class="text-secondary" id="member-name-${i}">${member.firstName} ${member.lastName}</h5>

                    <!-- Price & Payment Info -->
                    <span class="fw-bold d-block mt-2" id="member-price-${i}">Price</span>
                    <div id="member-payment-method-info-${i}" class="mt-2"></div>

                    <!-- Row 1: Upload payment proof -->
                    <div class="row mt-2">
                        <div class="col-12">
                            <label class="form-label" for="member-payment-submit-${i}">Upload payment proof</label>
                            <input type="file" class="form-control" id="member-payment-submit-${i}" name="member-payment-submit-${i}">
                        </div>
                    </div>

                    <!-- Row 2: Hospitality -->
                    <div class="row mt-2">
                        <div class="col-12">
                            <label class="form-label" for="member-hospitality-type-${i}">Hospitality</label>
                            <select class="form-select" id="member-hospitality-type-${i}" name="member-hospitality-type-${i}" required>
                                <option value="Full Hospitality">Full Hospitality</option>
                                <option value="Excluding Accommodation">Excluding Accommodation</option>
                            </select>
                        </div>
                    </div>

                    <!-- Row 3: Payment method -->
                    <div class="row mt-2">
                        <div class="col-12">
                            <label class="form-label" for="member-payment-method-${i}">Payment Method</label>
                            <select class="form-select" id="member-payment-method-${i}" name="member-payment-method-${i}" required>
                                <option value="Gopay">Gopay</option>
                                <option value="Bank BCA">Bank BCA</option>
                                <option value="Paypal">Paypal</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        });
    }



    wrapper.innerHTML = `
        <div class="modal-header">
            <h5 class="modal-title fw-bold text-primary" style="color:#671c84">Final Round Registration</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
            <div id="del-final-status"></div>
            <div id="del-payment-status"></div>

            <div id="del-final-payment" class="p-3">
                <form id="final-payment-upload">
                    <div id="leader-final-pay-form" class="p-3 border rounded mb-3">
                        <h5 class="text-secondary">${leaderfirstname+" "+leaderlastname}</h5>
                        <span id="final-payment-price" class="fw-bold d-block mt-2">Price</span>
                        <div id="final-payment-method-info" class="mt-2"></div>
                        <div class="row">
                            <div class="col-md-6 col-12">
                                <label for="final-leader-payment-submit" class="form-label">Upload payment proof</label>
                                <input type="file" id="final-leader-payment-submit" name="final-leader-payment-submit" class="form-control">
                            </div>
                            <div class="col-md-6 col-12">
                                <label for="leader-hospitality-type" class="form-label">Hospitality:</label>
                                <select id="leader-hospitality-type" name="leader-hospitality-type" class="form-select" required>
                                    <option value="Full Hospitality">Full Hospitality</option>
                                    <option value="Excluding Accommodation">Excluding Accommodation</option>
                                </select>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-md-4 col-12">
                                <label for="leader-payment-type" class="form-label">Payment Scheme:</label>
                                <select id="leader-payment-type" name="leader-payment-type" class="form-select" required>
                                    <option value="Full">Full Payment</option>
                                    <option value="DP" selected>Down Payment</option>
                                </select>
                            </div>
                            <div class="col-md-4 col-12">
                                <label for="leader-payment-method" class="form-label">Payment Method:</label>
                                <select id="leader-payment-method" name="leader-payment-method" class="form-select" required>
                                    <option value="Gopay">Gopay</option>
                                    <option value="Bank BCA">Bank BCA</option>
                                    <option value="Paypal">Paypal</option>
                                </select>
                            </div>
                            <div class="col-md-4 col-12" id="down-payment-category-col">
                                <label for="leader-down-payment-category" class="form-label">Category:</label>
                                <select id="leader-down-payment-category" name="leader-down-payment-category" class="form-select">
                                    <option value="First">First Payment</option>
                                    <option value="Last">Last Payment</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Member Forms -->
                    ${memberFormsHTML}

                    <div class="form-check mt-3">
                        <input class="form-check-input" type="checkbox" id="final-rules-check" required>
                        <label class="form-check-label" for="final-rules-check">
                            We have read the 
                            <a href="https://drive.google.com/file/d/1D-Yj2-X-7yXGZNcrtEVnxp4ztn8v52CG/view?usp=sharing" target="_blank" class="link-secondary" style="text-decoration: underline;">Finalist Payment Rules</a>.
                        </label>
                        <div class="invalid-feedback">You must agree before submitting.</div>
                    </div>
                </form>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-danger" data-bs-dismiss="modal">Cancel</button>
            <button id="final-payment-submit-btn" type="submit" form="final-payment-upload" class="btn btn-primary">Submit</button>
        </div>
    `;
    // Ambil elemen
    const paymentTypeSelect = document.getElementById("leader-payment-type");
    const downPaymentCategoryCol = document.getElementById("down-payment-category-col");
    const downPaymentCategorySelect = document.getElementById("leader-down-payment-category");

    // Fungsi untuk toggle visibility dan set default
    function updateCategoryVisibility() {
        if (paymentTypeSelect.value === "DP") {
            downPaymentCategoryCol.style.display = "block"; // muncul
            downPaymentCategorySelect.disabled = false;
            downPaymentCategorySelect.value = "First"; // default First Payment
        } else {
            downPaymentCategoryCol.style.display = "none"; // sembunyi
            downPaymentCategorySelect.disabled = true;
        }
    }

    // Event listener
    paymentTypeSelect.addEventListener("change", updateCategoryVisibility);
    updateCategoryVisibility(); // panggil sekali untuk inisialisasi

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initFinalPaymentBindings(teamData);

            const finalPaymentSubmitBtn = document.getElementById("final-payment-submit-btn");

            if (!finalPaymentSubmitBtn) {
                console.warn("Submit button not found, modal might not be generated yet.");
                return;
            }

            finalPaymentSubmitBtn.addEventListener("click", async (e) => {
                e.preventDefault();

                // 1. VALIDASI CHECKBOX (Rules Agreement)
                const checkboxRead = document.getElementById("final-rules-check");
                    
                if (!checkboxRead || !checkboxRead.checked) {
                    alert("⚠️ Please read and check the Finalist Payment Rules agreement.");
                    checkboxRead.focus();
                    return;
                }

                // 2. VALIDASI LEADER
                const leaderFileInput = document.getElementById("final-leader-payment-submit");
                if (!leaderFileInput || leaderFileInput.files.length === 0) {
                    alert("⚠️ Leader must upload payment proof first.");
                    leaderFileInput.focus();
                    return;
                }

                // 3. VALIDASI MEMBER
                if (teamData.members && teamData.members.length > 0) {
                    for (let i = 0; i < teamData.members.length; i++) {
                        const memberFileInput = document.getElementById(`member-payment-submit-${i}`);
                        if (!memberFileInput || memberFileInput.files.length === 0) {
                            alert(`⚠️ ${teamData.members[i].firstName} must upload payment proof.`);
                            memberFileInput.focus();
                            return;
                        }
                    }
                }

                // --- PROSES SUBMIT ---
                const originalText = finalPaymentSubmitBtn.innerText;
                finalPaymentSubmitBtn.innerText = "Processing...";
                finalPaymentSubmitBtn.disabled = true;

                try {
                    const formData = collectFinalFormData(teamData);
                    await submitFinalRegistration(currentUserID, formData, teamData);
                    
                    alert("Payment submitted! Great job on making it this far. See you at the Final Round, Champions! 🚀");
                    
                    window.location.reload(); 
                } catch (err) {
                    console.error(err);
                    alert("Failed to save data! Please check your connection.");
                    finalPaymentSubmitBtn.innerText = originalText;
                    finalPaymentSubmitBtn.disabled = false;
                }
            });
        });
    } else {
        initFinalPaymentBindings(teamData);

        const finalPaymentSubmitBtn = document.getElementById("final-payment-submit-btn");

        if (!finalPaymentSubmitBtn) {
            console.warn("Submit button not found, modal might not be generated yet.");
            return;
        }

        finalPaymentSubmitBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            // 1. VALIDASI CHECKBOX (Rules Agreement)
            const checkboxRead = document.getElementById("final-rules-check");
                
            if (!checkboxRead || !checkboxRead.checked) {
                alert("⚠️ Please read and check the Finalist Payment Rules agreement.");
                checkboxRead.focus();
                return;
            }

            // 2. VALIDASI LEADER
            const leaderFileInput = document.getElementById("final-leader-payment-submit");
            if (!leaderFileInput || leaderFileInput.files.length === 0) {
                alert("⚠️ Leader must upload payment proof first.");
                leaderFileInput.focus();
                return;
            }

            // 3. VALIDASI MEMBER
            if (teamData.members && teamData.members.length > 0) {
                for (let i = 0; i < teamData.members.length; i++) {
                    const memberFileInput = document.getElementById(`member-payment-submit-${i}`);
                    if (!memberFileInput || memberFileInput.files.length === 0) {
                        alert(`⚠️ ${teamData.members[i].firstName} must upload payment proof.`);
                        memberFileInput.focus();
                        return;
                    }
                }
            }

            // --- PROSES SUBMIT ---
            const originalText = finalPaymentSubmitBtn.innerText;
            finalPaymentSubmitBtn.innerText = "Processing...";
            finalPaymentSubmitBtn.disabled = true;

            try {
                const formData = collectFinalFormData(teamData);
                await submitFinalRegistration(currentUserID, formData, teamData);
                
                alert("Payment submitted! Great job on making it this far. See you at the Final Round, Champions! 🚀");
                
                window.location.reload(); 
            } catch (err) {
                console.error(err);
                alert("Failed to save data! Please check your connection.");
                finalPaymentSubmitBtn.innerText = originalText;
                finalPaymentSubmitBtn.disabled = false;
            }
        });



    }
}

// PRICE TABLE
const PRICE_TABLE = {
    "Full Hospitality": {
        Full: {
            "Bank BCA": 700000,
            "Gopay": 700000,
            "Paypal": 700000 / 16000
        },
        DP: {
            First: {
                "Bank BCA": 400000,
                "Gopay": 400000,
                "Paypal": 400000 / 16000
            },
            Last: {
                "Bank BCA": 300000,
                "Gopay": 300000,
                "Paypal": 300000 / 16000
            }
        }
    },
    "Excluding Accommodation": {
        Full: {
            "Bank BCA": 450000,
            "Gopay": 450000,
            "Paypal": 450000 / 16000
        },
        DP: {
            First: {
                "Bank BCA": 300000,
                "Gopay": 300000,
                "Paypal": 300000 / 16000
            },
            Last: {
                "Bank BCA": 150000,
                "Gopay": 150000,
                "Paypal": 150000 / 16000
            }
        }
    }
};


function initFinalPaymentBindings(teamData) {
    console.log("initFinalPaymentBindings: running");

    const leaderHospitality = document.getElementById("leader-hospitality-type");
    const leaderPaymentScheme = document.getElementById("leader-payment-type");
    const leaderPaymentMethod = document.getElementById("leader-payment-method");
    const leaderCategory = document.getElementById("leader-down-payment-category");
    const leaderPriceSpan = document.getElementById("final-payment-price");
    const leaderInfoBox = document.getElementById("final-payment-method-info");

    // Ambil harga sesuai tabel, tanpa konversi Paypal tambahan
    function getPrice(hosp, scheme, method, category = null) {
        if (scheme === "Full") {
            return PRICE_TABLE[hosp].Full[method];
        } else { // DP
            return PRICE_TABLE[hosp].DP[category][method];
        }
    }

    function updatePaymentMethodInfo(infoBox, method) {
        switch (method) {
            case "Bank BCA":
                infoBox.innerHTML = `<p class="mt-2"><strong>BCA</strong> — 2650508800 (Mochammad Rafly Ghazany A)</p>`;
                break;
            case "Gopay":
                infoBox.innerHTML = `<p class="mt-2">085655226900 (Rafly Ghazany)</p>`;
                break;
            case "Paypal":
                infoBox.innerHTML = `<p class="mt-2"><a href="https://www.paypal.me/RaflyGhazany" target="_blank">paypal.me/RaflyGhazany</a></p>`;
                break;
            default:
                infoBox.innerHTML = "";
        }
    }

    function updateLeaderPrice() {
        const hosp = leaderHospitality.value;
        const scheme = leaderPaymentScheme.value;
        const method = leaderPaymentMethod.value;
        const category = leaderCategory.value;

        const price = getPrice(hosp, scheme, method, category);
        leaderPriceSpan.textContent = method === "Paypal" 
            ? `$${price.toFixed(2)}` 
            : `IDR ${price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        updatePaymentMethodInfo(leaderInfoBox, method);
    }

    leaderHospitality.addEventListener("change", updateLeaderPrice);
    leaderPaymentScheme.addEventListener("change", updateLeaderPrice);
    leaderPaymentMethod.addEventListener("change", updateLeaderPrice);
    leaderCategory.addEventListener("change", updateLeaderPrice);

    updateLeaderPrice(); // inisialisasi leader

    // --- Member bindings ---
    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            const hosp = document.getElementById(`member-hospitality-type-${i}`);
            const method = document.getElementById(`member-payment-method-${i}`);
            const priceSpan = document.getElementById(`member-price-${i}`);
            const infoBox = document.getElementById(`member-payment-method-info-${i}`);

            function updateMemberPrice() {
                const hospVal = hosp.value;
                const methodVal = method.value;
                const scheme = leaderPaymentScheme.value;
                const category = leaderCategory.value;

                const price = getPrice(hospVal, scheme, methodVal, category);
                priceSpan.textContent = methodVal === "Paypal" 
                    ? `$${price.toFixed(2)}` 
                    : `IDR ${price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


                updatePaymentMethodInfo(infoBox, methodVal);
            }

            hosp.addEventListener("change", updateMemberPrice);
            method.addEventListener("change", updateMemberPrice);
            leaderPaymentScheme.addEventListener("change", updateMemberPrice);
            leaderCategory.addEventListener("change", updateMemberPrice);

            updateMemberPrice();
        });
    }
}

function collectFinalFormData(teamData) {
    const leaderPaymentType = document.getElementById("leader-payment-type").value;
    const leaderPaymentCategory = document.getElementById("leader-down-payment-category").value;
    const leaderPaymentMethod = document.getElementById("leader-payment-method").value;
    const leaderHospitality = document.getElementById("leader-hospitality-type").value;
    const leaderFile = document.getElementById("final-leader-payment-submit").files[0];

    const membersData = [];

    if (teamData.members && teamData.members.length > 0) {
        teamData.members.forEach((member, i) => {
            const fileInput = document.getElementById(`member-payment-submit-${i}`);
            const hospitalityInput = document.getElementById(`member-hospitality-type-${i}`);
            const methodInput = document.getElementById(`member-payment-method-${i}`);

            membersData.push({
                hospitality: hospitalityInput.value,
                paymentMethod: methodInput.value,
                file: fileInput.files[0] || null,
            });
        });
    }

    return {
        leader: {
            hospitality: leaderHospitality,
            paymentMethod: leaderPaymentMethod,
            file: leaderFile,
        },

        members: membersData,

        // digunakan untuk determinasi CASE di submitFinalRegistration()
        paymentScheme: leaderPaymentType,
        dpCategory: leaderPaymentCategory,
    };
}


async function submitFinalRegistration(currentUID, formData, teamData) {
    const teamRef = doc(DB, "Team", currentUID);
    const snap = await getDoc(teamRef);
    const timeStamp = Date.now();

    // ==============================
    // UPLOAD LEADER FILE
    // ==============================
    let leaderURL = null;
    if (formData.leader.file) {
        const leaderPath = `finalreg_submissions/${currentUID}/leader_${timeStamp}`;
        const leaderRef = ref(STORAGE, leaderPath);
        const uploadLeader = await uploadBytes(leaderRef, formData.leader.file);
        leaderURL = await getDownloadURL(uploadLeader.ref);
    }

    // ==============================
    // UPLOAD MEMBER FILES
    // ==============================
    const memberPaymentURLs = [];
    for (let i = 0; i < formData.members.length; i++) {
        const mem = formData.members[i];

        if (!mem.file) {
            memberPaymentURLs.push(null);
            continue;
        }

        const memPath = `finalreg_submissions/${currentUID}/member_${i}_${timeStamp}`;
        const memRef = ref(STORAGE, memPath);
        const memSnap = await uploadBytes(memRef, mem.file);
        const memURL = await getDownloadURL(memSnap.ref);
        memberPaymentURLs.push(memURL);
    }

    const existing = snap.exists() ? snap.data().final_reg : null;

    // ======================================================
    // CASE 1: BELUM ADA FINAL REG
    // ======================================================
    if (!existing) {
        return updateDoc(teamRef, {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || "-",
                    lastPayment: "-",           // <── khusus leader
                },

                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberPaymentURLs[i] || "-",
                    lastPayment: "-",           // <── khusus member
                })),

                paymentScheme: formData.paymentScheme,
                dpCategory: formData.dpCategory ?? "-",
                createdAt: serverTimestamp(),
                paymentStatus: "pending"
            }
        });
    }

    // ======================================================
    // CASE 2: FULL PAYMENT — overwrite semua
    // ======================================================
    if (formData.paymentScheme === "Full") {
        return updateDoc(teamRef, {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || "-",
                    lastPayment: "-", // reset
                },

                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberPaymentURLs[i] || "-",
                    lastPayment: "-", // reset
                })),

                paymentScheme: "Full",
                dpCategory: "-",
                updatedAt: serverTimestamp(),
                paymentStatus : "pending"
            }
        });
    }

    // ======================================================
    // CASE 3: DP LAST PAYMENT — SELURUH TIM SUBMIT SEKALIGUS
    // ======================================================
    if (formData.paymentScheme === "DP" && formData.dpCategory === "Last") {
        const updatedMembers = existing.members.map((member, i) => {
            return {
                ...member,
                lastPayment: memberPaymentURLs[i] || member.lastPayment || "-"
            };
        });
        const updatedLeader = {
            ...existing.leader,
            lastPayment: leaderURL || existing.leader.lastPayment || "-"
        };
        return updateDoc(teamRef, {
            "final_reg.leader": updatedLeader,
            "final_reg.members": updatedMembers,  
            "final_reg.dpCategory": "Last",
            "final_reg.lastPaymentAt": serverTimestamp(),
            "final_reg.paymentStatus": "pending"
        });
    }


    // ======================================================
    // CASE 4: DP FIRST PAYMENT OVERWRITE (kecuali lastPayment)
    // ======================================================
    if (formData.paymentScheme === "DP" && formData.dpCategory === "First") {
        return updateDoc(teamRef, {
            final_reg: {
                leader: {
                    hospitality: formData.leader.hospitality,
                    paymentMethod: formData.leader.paymentMethod,
                    paymentProof: leaderURL || existing?.leader?.paymentProof || "-",
                    lastPayment: existing?.leader?.lastPayment ?? "-", // pertahankan
                },

                members: formData.members.map((m, i) => ({
                    hospitality: m.hospitality,
                    paymentMethod: m.paymentMethod,
                    paymentProof: memberPaymentURLs[i] || existing?.members?.[i]?.paymentProof || "-",
                    lastPayment: existing?.members?.[i]?.lastPayment ?? "-", // pertahankan
                })),

                paymentScheme: "DP",
                dpCategory: "First",
                updatedAt: serverTimestamp(),
                paymentStatus : "pending"
            }
        });
    }

    console.warn("No case matched, check formData.");
}




function setupFinalTab(finalStatus) {
    const finalTab = document.getElementById("nav-contact-tab");

    if (!finalTab) return;

    // Hanya enable tab jika status "verified" atau "down_payment_verified"
    if (finalStatus === "verified" || finalStatus === "down_payment_verified") {
        finalTab.style.pointerEvents = "auto";
        finalTab.style.opacity = "1";
        finalTab.style.cursor = "pointer";
    } else {
        // Disable tab untuk status lain
        finalTab.style.pointerEvents = "none";
        finalTab.style.opacity = "0.5";
        finalTab.style.cursor = "not-allowed";

        finalTab.addEventListener("click", function (e) {
            e.preventDefault();
            alert("⚠️ Your final payment is not verified yet.");
        });
    }
}



