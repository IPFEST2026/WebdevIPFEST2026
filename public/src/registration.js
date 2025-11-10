import {
	createUserWithEmailAndPassword,
	sendEmailVerification,
	updateProfile,
} from 'firebase/auth'
import {
	serverTimestamp,
	doc, onSnapshot, setDoc,
	updateDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

// Import Firebase SDK initialization
import { AUTH, STORAGE, DB } from './index.js'


// Handle team member
let teamMemberCondition = {
	"plan of development": [4, 5],
	"smart competition": [2, 3],
	"mud inovation": [2, 3],
	"paper and poster": [2, 3],
	"oil rig design": [4, 5],
	"business case": [3],
	"geothermal development plan": [4],
	"well design": [4, 5],
	"hackaton": [3]
}

function generateTeamMemberOption(competition, container) {
	if (!container || !teamMemberCondition[competition]) return
	container.innerHTML = ''
	let optionContainer = ''
	teamMemberCondition[competition].forEach(m => {
		optionContainer += `<option value="${m}">${m} people</option>`
	})
	container.innerHTML = optionContainer
}

function generateMemberEntry(entry, count) {
	if (!entry) return
	entry.innerHTML = ''
	for (let i = 0; i < count - 1; i++) {
		let memberEntry = document.createElement('div')
		memberEntry.innerHTML = `
		 <h3 class="lead fs-2 mt-6" style="color: #f1A087;">Member ${i+1}</h3>
      <div class="member-entry" style="margin-bottom: 2rem;">
         <div class="row my-1">
            <div class="col-md-6">
               <label for="firstName${i+1}" class="form-label">First Name: </label>
               <input type="text" name="firstName${i+1}" id="firstName${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please add your member ${i+1} first name</div>
            </div>
            <div class="col-md-6">
               <label for="lastName${i+1}" class="form-label">Last Name: </label>
               <input type="text" name="lastName${i+1}" id="lastName${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please add your member ${i+1} last name</div>
            </div>
         </div>
         <div class="row my-1">
            <div class="col-md-6">
               <label for="major${i+1}" class="form-label">Major: </label>
               <input type="text" name="major${i+1}" id="major${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please add your member ${i+1} major</div>
            </div>
            <div class="col-md-6 batch-parent">
               <label for="batch${i+1}" class="form-label">Batch: </label>
               <select name="batch${i+1}" id="batch${i+1}" class="form-select student-batch" purpose="batch" required>
                  <option value="2024" selected>2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                  <option value="2020">2020</option>
                  <option value="2019">2019</option>
                  <option value="2018">2018</option>
                  <option value="2017">2017</option>
                  <option value="2016">2016</option>
               </select>
               <div class="invalid-feedback">Please add your member ${i+1} batch</div>
            </div>
         </div>
         <div class="row my-1">
            <div class="col-md-6">
               <label for="idCard${i+1}" class="form-label">ID(NIK/Pasport): </label>
               <input type="text" name="idCard${i+1}" id="idCard${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please add your member ${i+1} ID</div>
            </div>
            <div class="col-md-6">
               <label for="studentId${i+1}" class="form-label">Student ID: </label>
               <input type="text" name="studentId${i+1}" id="studentId${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please add your member ${i+1} student ID</div>
            </div>
         </div>
         <div class="row my-1">
            <div class="col-md-6">
               <label for="email${i+1}" class="form-label">Email: </label>
               <input type="email" name="email${i+1}" id="email${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please provide your member ${i+1} valid email</div>
            </div>
            <div class="col-md-6">
               <label for="phoneNo${i+1}" class="form-label">Phone number: </label>
               <input type="tel" name="phoneNo${i+1}" id="phoneNo${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please add your member ${i+1} phone number</div>
            </div>
         </div>
         <div class="row my-1">
            <div class="col-md-6">
               <label for="gender${i+1}" class="form-label">Gender: </label>
               <select name="gender${i+1}" id="gender${i+1}" class="form-select" required>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
               </select>
            </div>
            <div class="col-md-6">
               <label for="studentCardPhoto${i+1}" class="form-label">Student Card Photo: </label>
               <input type="file" name="studentCardPhoto${i+1}" id="studentCardPhoto${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please upload your member ${i+1} student card photo</div>
            </div>
         </div>
         <div class="row my-1">
            <div class="col-md-6">
               <label for="twibbon${i+1}" class="form-label">Proof for Uploading Twibbon: </label>
               <input type="file" name="twibbon${i+1}" id="twibbon${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please upload your twibbon proof</div>
            </div>
            <div class="col-md-6">
               <label for="follow-ig${i+1}" class="form-label">Proof for Following IPFEST 2025 Instagram: </label>
               <input type="file" name="follow-ig${i+1}" id="follow-ig${i+1}" class="form-control" required>
               <div class="invalid-feedback">Please upload the proof that you are following IPFEST 2025 Instagram</div>
            </div>
         </div>
      </div>
	  `
		entry.append(memberEntry)
	}
}


document.addEventListener("DOMContentLoaded", () => {
	const registrationForm = document.querySelector("#registration-form")
	if (!registrationForm) return console.warn("registration-form not found!")

	const leaderForm = registrationForm.querySelector("#leader")
	const memberForm = registrationForm.querySelector("#member")
	const competitionForm = registrationForm.querySelector("#competition")
	const paymentForm = registrationForm.querySelector("#payment")
	const agreementForm = registrationForm.querySelector("#invalidCheck")
	const compeInput = document.querySelector('#choosen-competition')
	const memberCount = document.getElementById("memberCount")
	const entryContainer = memberForm ? memberForm.querySelector("#entry") : null

	// Pastikan semua elemen ditemukan
	if (!leaderForm || !memberForm || !competitionForm || !paymentForm || !agreementForm) {
		console.warn("Some form sections not found.")
		return
	}

   
	document.querySelectorAll(".card-compe").forEach(card => {
		card.addEventListener("click", () => {
			let selectedCompetition = card.dataset.value || "unknown"
			console.log("Selected competition:", selectedCompetition)

			compeInput.value = selectedCompetition
			leaderForm.classList.remove("d-none")
			memberForm.classList.remove("d-none")
			paymentForm.classList.remove("d-none")
			agreementForm.classList.remove("d-none")

			generateTeamMemberOption(selectedCompetition, memberCount)
			generateMemberEntry(entryContainer, parseInt(memberCount.value || 1, 10))
		})
	})

	// Regenerate form ketika jumlah anggota berubah
	if (memberCount) {
		memberCount.addEventListener('change', () => {
			generateMemberEntry(entryContainer, parseInt(memberCount.value || 1, 10))
		})
	}
})

document.addEventListener("DOMContentLoaded", () => {
  function earlybirdStatus() {
    const earlybirdDeadline = new Date('Nov 16, 2025 00:00:00').getTime();
    return Date.now() < earlybirdDeadline;
  }
 
  let payMethod = "";
  const paymentMethod = document.querySelectorAll(".payment-method .nav-link");
  const tabPanes = document.querySelectorAll(".tab-pane");
 
  paymentMethod.forEach(method => {
    method.addEventListener('click', () => {
      payMethod = method.dataset.method;
 
      // ubah tombol aktif
      paymentMethod.forEach(btn => btn.classList.remove('active'));
      method.classList.add('active');
 
      // sembunyikan semua tab-pane
      tabPanes.forEach(pane => {
        pane.classList.remove('show', 'active');
      });
 
      // ambil target pane (pakai data-bs-target)
      const targetSelector = method.dataset.bsTarget;
      const targetPane = document.querySelector(targetSelector);
 
      if (!targetPane) {
        console.error("Elemen tab tidak ditemukan untuk:", targetSelector);
        return;
      }
 
      targetPane.classList.add('show', 'active');
 
      // ubah isi tab-pane
      const isEarly = earlybirdStatus();
      let indoPrice = isEarly ? "IDR 200.000" : "IDR 250.000";
      let intlPrice = isEarly ? "USD 17" : "USD 20";
 
      switch (payMethod) {
        case "Bank BCA":
          targetPane.innerHTML = `
            <p>BCA - 2650508800 (Mochammad Rafly Ghazany A)</p>
            <small>${indoPrice}</small>
          `;
          break;
 
        case "Gopay":
          targetPane.innerHTML = `
            <p>085655226900 (Rafly Ghazany)</p>
            <small>${indoPrice}</small>
          `;
          break;
 
        case "Paypal":
          targetPane.innerHTML = `
            <p><a href="https://www.paypal.me/RaflyGhazany" target="_blank">paypal.me/RaflyGhazany</a></p>
            <small>${intlPrice}</small>
          `;
          break;
      }
    });
  });
});


const pass = document.querySelector("input[name='password']")
const confirmPass = document.querySelector("input[name='confirmPassword']")
const invalidFeedback = document.querySelector(".not-same-password")
let passwordIsValid = false

function checkPassword(pass, confirmPass, feedback) {
	if (pass !== confirmPass) {
		if (feedback) feedback.classList.remove("d-none")
		return false
	}
	if (feedback) feedback.classList.add("d-none")
	return true
}

if (confirmPass) {
	confirmPass.addEventListener("input", () => {
		passwordIsValid = checkPassword(pass.value, confirmPass.value, invalidFeedback)
	})
}

// Handle competition selection
const competitionCards = document.querySelectorAll('.card-compe')
const choosenCompetition = document.querySelector('#choosen-competition')

competitionCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove active class from all cards
        competitionCards.forEach(c => c.classList.remove('active'))
        // Add active class to clicked card
        card.classList.add('active')
        // Set the chosen competition value
        choosenCompetition.value = card.dataset.value
    })
})

const registrationForm = document.querySelector("#registration-form")
if (registrationForm) {
	registrationForm.addEventListener('submit', async (e) => {
		e.preventDefault()
		const submitBtn = registrationForm.querySelector("button[type='submit']")
		const overlay = document.querySelector("#overlay")
		if (!submitBtn) return

		// Validate competition selection
		const selectedCompetition = choosenCompetition.value
		if (!selectedCompetition) {
			showError("Please select a competition first")
			return
		}

		submitBtn.disabled = true
		submitBtn.innerText = 'Processing...'

		// Function to show error alert
		const showError = (message) => {
			const alertContainer = document.querySelector("#alertContainer")
			if (alertContainer) {
				alertContainer.innerHTML = `
					<div class="alert alert-danger alert-dismissible fade show" role="alert">
						${message}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				`
			}
		}

		try {
			if (!passwordIsValid) {
				throw new Error("Passwords do not match")
			}
			
			// Get all required form data
			const email = registrationForm.querySelector("input[type='email']").value
			const password = pass.value
			const firstName = registrationForm.querySelector("#firstName")?.value
			const lastName = registrationForm.querySelector("#lastName")?.value
			const major = registrationForm.querySelector("#major")?.value
			const batch = registrationForm.querySelector("#batch")?.value
			const university = registrationForm.querySelector("#university")?.value
			const phone = registrationForm.querySelector("#phone")?.value

			// Validate required fields
			if (!email || !password || !firstName || !lastName || !major || !batch || !university || !phone) {
				throw new Error("All fields are required")
			}

			// Basic email validation
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			if (!emailRegex.test(email)) {
				throw new Error("Please enter a valid email address")
			}

			// Password strength validation
			if (password.length < 8) {
				throw new Error("Password must be at least 8 characters long")
			}

			// Function to upload file and get download URL
			const uploadFile = async (file, path) => {
				if (!file) return null
				const fileRef = ref(STORAGE, path)
				await uploadBytes(fileRef, file)
				return await getDownloadURL(fileRef)
			}

			// Get payment proof file
			const paymentFile = registrationForm.querySelector("#payment-proof")?.files[0]
			
			// Create authentication user
			const { user } = await createUserWithEmailAndPassword(AUTH, email, password)

			// Prepare team data
			const teamData = {
				leader: {
					firstName,
					lastName,
					email,
					major,
					batch,
					university,
					phone
				},
				competition: choosenCompetition.value,
				members: [],
				join_on: serverTimestamp(),
				status: "pending",
				payment_status: "unpaid"
			}

			// Upload payment proof if exists
			if (paymentFile) {
				const fileName = `payments/${user.uid}/${paymentFile.name}`
				const paymentProofUrl = await uploadFile(paymentFile, fileName)
				teamData.payment = {
					proofUrl: paymentProofUrl,
					uploadedAt: serverTimestamp(),
					fileName: paymentFile.name
				}
				teamData.payment_status = "pending_verification"
			}

			// Get and validate member data if exists
			const memberCount = parseInt(registrationForm.querySelector("#member-count")?.value || "0")
			if (memberCount > 1) {
				for (let i = 1; i < memberCount; i++) {
					const memberData = {
						firstName: registrationForm.querySelector(`#firstName${i}`)?.value,
						lastName: registrationForm.querySelector(`#lastName${i}`)?.value,
						email: registrationForm.querySelector(`#email${i}`)?.value,
						major: registrationForm.querySelector(`#major${i}`)?.value,
						batch: registrationForm.querySelector(`#batch${i}`)?.value,
						university: registrationForm.querySelector(`#university${i}`)?.value,
						phone: registrationForm.querySelector(`#phone${i}`)?.value
					}

					// Validate member data
					const missingFields = Object.entries(memberData)
						.filter(([_, value]) => !value)
						.map(([key]) => key)

					if (missingFields.length > 0) {
						throw new Error(`Member ${i} is missing required fields: ${missingFields.join(", ")}`)
					}

					// Upload member files if any
					const memberFiles = registrationForm.querySelector(`#member${i}-files`)?.files
					if (memberFiles?.length > 0) {
						memberData.files = []
						for (let file of memberFiles) {
							const fileName = `team-files/${user.uid}/member${i}/${file.name}`
							const fileUrl = await uploadFile(file, fileName)
							memberData.files.push({
								name: file.name,
								url: fileUrl,
								uploadedAt: serverTimestamp()
							})
						}
					}

					teamData.members.push(memberData)
				}
			}
			
			// Save complete team data to Firestore
			await setDoc(doc(DB, 'Team', user.uid), teamData)
			
			// Send verification email
			await sendEmailVerification(user)

			submitBtn.innerText = 'Success!'
			window.location.href = 'login.html'
		} catch (err) {
			console.error("Registration failed:", err)
			submitBtn.disabled = false
			submitBtn.innerText = 'Submit'
			if (overlay) overlay.classList.add("d-none")

			// Handle specific Firebase Auth errors
			let errorMessage = "Registration failed. "
			if (err.code) {
				switch (err.code) {
					case 'auth/email-already-in-use':
						errorMessage += "This email is already registered. Please try logging in or use a different email."
						break
					case 'auth/invalid-email':
						errorMessage += "Please enter a valid email address."
						break
					case 'auth/operation-not-allowed':
						errorMessage += "Email/password registration is not enabled. Please contact support."
						break
					case 'auth/weak-password':
						errorMessage += "Please choose a stronger password."
						break
					default:
						errorMessage += err.message || "An unexpected error occurred."
				}
			} else {
				errorMessage += err.message || "An unexpected error occurred."
			}
			
			showError(errorMessage)
		}
	})
}
