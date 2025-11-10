import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AUTH, STORAGE, DB } from './index.js';

// Kompetisi dan jumlah anggota
const teamMemberCondition = {
  "plan of development": [4, 5],
  "smart competition": [2, 3],
  "mud inovation": [2, 3],
  "paper and poster": [2, 3],
  "oil rig design": [4, 5],
  "business case": [3],
  "geothermal development plan": [4],
  "well design": [4, 5],
  "hackaton": [3]
};

// =========================
// Utility Functions
// =========================

// Upload file ke Firebase Storage dengan UID user
async function uploadFile(file, folder, userUid) {
  if (!file) return null;
  if (!userUid) throw new Error("User UID is required for file upload");
  const fileRef = ref(STORAGE, `${folder}/${userUid}/${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

// Tampilkan error alert
function showError(message) {
  const alertContainer = document.querySelector("#alertContainer");
  if (!alertContainer) return;
  alertContainer.innerHTML = `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

// Validasi email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =========================
// Form Generators
// =========================

function generateTeamMemberOption(competition, container) {
  if (!container || !teamMemberCondition[competition]) return;
  const selected = container.value || teamMemberCondition[competition][0];
  container.innerHTML = '';
  teamMemberCondition[competition].forEach(m => {
    container.innerHTML += `<option value="${m}" ${m == selected ? 'selected' : ''}>${m} people</option>`;
  });
}

function generateMemberEntry(entry, count) {
  if (!entry) return;
  entry.innerHTML = '';
  for (let i = 1; i < count; i++) {
    const memberEntry = document.createElement('div');
    memberEntry.innerHTML = `
      <h3 class="lead fs-2 mt-6">Member ${i}</h3>
      <div class="member-entry" style="margin-bottom: 2rem;">
        <div class="row my-1">
          <div class="col-md-6">
            <label for="firstName${i}" class="form-label">First Name:</label>
            <input type="text" id="firstName${i}" class="form-control" required>
          </div>
          <div class="col-md-6">
            <label for="lastName${i}" class="form-label">Last Name:</label>
            <input type="text" id="lastName${i}" class="form-control" required>
          </div>
        </div>
        <div class="row my-1">
          <div class="col-md-6">
            <label for="major${i}" class="form-label">Major:</label>
            <input type="text" id="major${i}" class="form-control" required>
          </div>
          <div class="col-md-6 batch-parent">
            <label for="batch${i}" class="form-label">Batch:</label>
            <select id="batch${i}" class="form-select student-batch" required>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="0">Other</option>
            </select>
            <input type="text" id="otherBatch${i}" class="d-none form-control" placeholder="your batch">
          </div>
        </div>
        <div class="row my-1">
          <div class="col-md-6"><label for="idCard${i}" class="form-label">ID(NIK/Pasport):</label><input type="text" id="idCard${i}" class="form-control" required></div>
          <div class="col-md-6"><label for="studentId${i}" class="form-label">Student ID:</label><input type="text" id="studentId${i}" class="form-control" required></div>
        </div>
        <div class="row my-1">
          <div class="col-md-6"><label for="email${i}" class="form-label">Email:</label><input type="email" id="email${i}" class="form-control" required></div>
          <div class="col-md-6"><label for="phoneNo${i}" class="form-label">Phone:</label><input type="tel" id="phoneNo${i}" class="form-control" required></div>
        </div>
        <div class="row my-1">
          <div class="col-md-6"><label for="studentCardPhoto${i}" class="form-label">Student Card Photo:</label><input type="file" id="studentCardPhoto${i}" class="form-control" required></div>
          <div class="col-md-6"><label for="twibbon${i}" class="form-label">Twibbon Proof:</label><input type="file" id="twibbon${i}" class="form-control" required></div>
        </div>
        <div class="row my-1">
          <div class="col-md-6"><label for="follow-ig${i}" class="form-label">Follow IG Proof:</label><input type="file" id="follow-ig${i}" class="form-control" required></div>
        </div>
      </div>
    `;
    entry.appendChild(memberEntry);
  }

  document.querySelectorAll(".student-batch").forEach(select => {
    select.addEventListener("change", function () {
      const otherInput = document.getElementById(`otherBatch${this.id.replace('batch','')}`);
      if (this.value === "0") {
        otherInput.classList.remove("d-none");
        otherInput.required = true;
      } else {
        otherInput.classList.add("d-none");
        otherInput.required = false;
      }
    });
  });
}

// =========================
// Form Submission
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const registrationForm = document.querySelector("#registration-form");
  if (!registrationForm) return;

  const leaderForm = document.querySelector("#leader");
  const memberForm = document.querySelector("#member");
  const paymentForm = document.querySelector("#payment");
  const agreementForm = document.querySelector("#invalidCheck");
  const compeInput = document.querySelector('#choosen-competition');
  const memberCount = document.getElementById("memberCount");
  const entryContainer = document.querySelector("#entry");

  [leaderForm, memberForm, paymentForm].forEach(el => el?.classList.add("d-none"));
  agreementForm?.closest('.col-12')?.classList.add("d-none");

  registrationForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = registrationForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerText = 'Processing...';

    try {
      // ambil password
      const pass = document.querySelector("input[name='password']");
      const confirmPass = document.querySelector("input[name='confirmPassword']");
      const passwordIsValid = pass && confirmPass && pass.value === confirmPass.value && pass.value.length >= 8;
      if (!passwordIsValid) throw new Error("Passwords do not match or less than 8 characters");

      // Ambil data leader
      const leaderEmail = document.getElementById("email")?.value;
      const password = pass.value;
      const firstName = document.getElementById("firstName")?.value;
      const lastName = document.getElementById("lastName")?.value;
      const major = document.getElementById("major")?.value;
      let batch = document.getElementById("batch")?.value;
      if (batch === "0") batch = document.querySelector("#otherBatch")?.value || "";
      const teamName = document.getElementById("teamName")?.value;
      const university = document.getElementById("university")?.value;
      const phoneNo = document.getElementById("phoneNo")?.value;
      const idCard = document.getElementById("idCard")?.value;
      const studentId = document.getElementById("studentId")?.value;

      if (![leaderEmail, password, firstName, lastName, major, batch, teamName, university, phoneNo, idCard, studentId].every(v => v)) {
        throw new Error("All leader fields are required");
      }
      if (!isValidEmail(leaderEmail)) throw new Error("Invalid email address");

      // Auth create user
      const { user } = await createUserWithEmailAndPassword(AUTH, leaderEmail, password);

      // Upload payment
      const paymentFile = document.getElementById("payment-proof")?.files[0];
      const paymentProofUrl = paymentFile ? await uploadFile(paymentFile, 'payments', user.uid) : null;

      // Siapkan data tim
      const teamData = {
        competition: compeInput.value,
        teamName,
        leader: { firstName, lastName, email: leaderEmail, major, batch, university, phoneNo, idCard, studentId },
        members: [],
        join_on: serverTimestamp(),
        status: "pending",
        payment_status: paymentProofUrl ? "pending_verification" : "unpaid",
        payment: paymentProofUrl ? { proofUrl: paymentProofUrl, uploadedAt: serverTimestamp() } : undefined
      };

      // Ambil anggota
      const totalMembers = parseInt(memberCount?.value || "1", 10);
      for (let i = 1; i < totalMembers; i++) {
        const member = {
          firstName: document.getElementById(`firstName${i}`)?.value,
          lastName: document.getElementById(`lastName${i}`)?.value,
          email: document.getElementById(`email${i}`)?.value,
          major: document.getElementById(`major${i}`)?.value,
          batch: document.getElementById(`batch${i}`)?.value,
          idCard: document.getElementById(`idCard${i}`)?.value,
          studentId: document.getElementById(`studentId${i}`)?.value,
          phoneNo: document.getElementById(`phoneNo${i}`)?.value
        };
        if (!Object.values(member).every(v => v)) throw new Error(`Member ${i} data is incomplete`);

        // Upload file anggota
        const studentCard = document.getElementById(`studentCardPhoto${i}`)?.files[0];
        const twibbon = document.getElementById(`twibbon${i}`)?.files[0];
        const followIg = document.getElementById(`follow-ig${i}`)?.files[0];

        if (studentCard) member.studentCardUrl = await uploadFile(studentCard, `team/member/student_card`, user.uid);
        if (twibbon) member.twibbonUrl = await uploadFile(twibbon, `team/member/twibbon`, user.uid);
        if (followIg) member.followIgUrl = await uploadFile(followIg, `team/member/follow_ig`, user.uid);

        teamData.members.push(member);
      }

      // Simpan ke Firestore
      await setDoc(doc(DB, 'Team', user.uid), teamData);
      await sendEmailVerification(user);

      submitBtn.innerText = 'Success!';
      setTimeout(() => window.location.href = 'login.html', 1500);

    } catch (err) {
      console.error("Registration error:", err);
      submitBtn.disabled = false;
      submitBtn.innerText = 'Submit';
      showError(err.message || "Registration failed. Please try again.");
    }
  });
});
