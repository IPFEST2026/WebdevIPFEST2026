import { doc, getDoc, updateDoc, serverTimestamp,collection, getDocs } from 'firebase/firestore'

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
    let prelimStatus = (userData.prelimstats || null);
    let PrelimOverdue = (userData.prelim_overdue || null);
    let PrelimSubmittedAt = (userData.prelimSubmittedAt || null);
    let PrelimFileURL = (userData.prelimFileURL || null);

	loadPrelimCase(currentUserID);
    setupGuidebook(userCompetition);
    setupEditSubmission(prelimStatus);
    submissionSummary(PrelimOverdue, PrelimSubmittedAt, PrelimFileURL);
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

        return {
            competitionRaw: data.competition || null,
            paymentStatus: data.payment_status || null,
            teamName: data.teamName || null,
            prelimstats : prelimStatus || null,
            prelim_overdue: prelim_overdue,
            prelimSubmittedAt: prelimSubmittedAt,
            prelimFileURL: prelimFileURL
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
    const openDate = new Date("Nov 22, 2025 00:00:00").getTime();
    return Date.now() >= openDate;
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
        }
	} catch (err) {
		console.error("Error in loadPrelimCase:", err);	
	}
}

// =====================================
// COMPETITION GUIDEBOOK SETUP
// =====================================

const competitionGuideBookRaw = {
    "business case": "https://drive.google.com/file/d/1GWaq2BPn5lWvV2VEGAKJyshy6z2T0OiS/view?usp=drive_link",
    "geothermal development plan": "https://drive.google.com/file/d/1nHnoZvb8tnY8_J8kcFz-gvBDfjXkQUZg/view?usp=drive_link",
    "mud inovation": "https://drive.google.com/file/d/1IqLtOQ4xacP-KRwr7EY8J1apluTo8fY6/view?usp=drive_link",
    "oil rig design": "https://drive.google.com/file/d/16lSPng29RjoQm0dfZSU622DV-TnD37v4/view?usp=drive_link",
    "paper and poster": "https://drive.google.com/file/d/1FCF1zc3ZNWW2vB8tq-p1VRZ0RhwforZM/view?usp=drive_link",
    "plan of development": "https://drive.google.com/file/d/1kgsvhtzgEMB0ZC9UpvvayYFHejy3WKp8/view?usp=drive_link",
    "smart competition": "https://drive.google.com/file/d/1vLVrzxBPd0zfIRw1qmLgk1RJMbBHd79s/view?usp=drive_link",
    "well design": "https://drive.google.com/file/d/1U6tb3h5SVQAM3MDOlFs5DofSWPPRVykL/view?usp=drive_link",
    "hackaton": "https://drive.google.com/file/d/17D-JtWdo7Nkv7j68kJx37cW-GHDmIzxY/view?usp=drive_link"
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







