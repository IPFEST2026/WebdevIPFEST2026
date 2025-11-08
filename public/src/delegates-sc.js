import {
	doc, getDoc, updateDoc,
	serverTimestamp,
} from 'firebase/firestore'

import { onAuthStateChanged, signOut } from 'firebase/auth'

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'
import { setToastAlert } from '../static/js/alert.js'

// Check User ID
let currentUserID
onAuthStateChanged(AUTH, (user) => {
	if (user) {
		currentUserID = user.uid
		fetchUserData()
	} else {
		console.log("No user is signed in")
		currentUserID = null
	}
})

// Sign out user
const logoutBtn = document.querySelector("#logout-btn")

logoutBtn.addEventListener('click', () => {
	signOut(AUTH).then(() => {
		console.log("log out btn clicked")
		window.location.href = '../../login.html'
	})
	.catch((err) => {
		console.log("Cannot loggin out user", err)
	})
})

// Handle User Data
const delCompetition = document.querySelectorAll(".del-team-competition")
const delegateUniv = document.querySelector("#del-univ")
const delegateTeamName = document.querySelector("#del-team-name")
const delegatePaymentStatus = document.querySelector("#del-payment-status")
const delTeamMembers = document.querySelector("#del-team-members")
const delFinalStatusCont = document.getElementById("del-elimination-status")

const delMembersNameLogo = {
	0: `<svg style="height: 4rem" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
			<path d="M256 112c30.88 0 56-25.12 56-56S286.9 0 256 0S199.1 25.12 199.1 56S225.1 112 256 112zM511.1 197.4c0-5.178-2.509-10.2-7.096-13.26L476.4 168.2c-2.5-1.75-5.497-2.62-8.497-2.62c-5.501 .125-10.63 2.87-13.75 7.245c-9.001 12-23.16 19.13-38.16 19.13c-3.125 0-6.089-.2528-9.089-.8778c-23.13-4.25-38.88-26.25-38.88-49.75C367.1 134 361.1 128 354.6 128h-38.75c-6.001 0-11.63 4-12.88 9.875C298.2 160.1 278.7 176 255.1 176c-22.75 0-42.25-15.88-47-38.12C207.7 132 202.2 128 196.1 128h-38.75C149.1 128 143.1 134 143.1 141.4c0 18.49-13.66 50.62-47.95 50.62c-15.13 0-29.3-7.118-38.3-19.24C54.6 168.4 49.66 165.7 44.15 165.6c-3 0-5.931 .8951-8.432 2.645l-28.63 16C2.509 187.2 0 192.3 0 197.4c0 2.438 .5583 4.901 1.72 7.185L109.9 432h53.13L69.85 236.4C78.35 238.8 87.11 240 95.98 240c2.432 0 56.83 1.503 84.76-52.5C198.1 210.5 226.6 224 255.9 224c29.38 0 57.01-13.38 75.26-36.25C336.1 197.6 360.6 240 416 240c8.751 0 17.5-1.125 26-3.5L349 432h53.13l108.1-227.4C511.4 202.3 511.1 199.8 511.1 197.4zM424 464H87.98c-13.26 0-24 10.75-24 23.1S74.72 512 87.98 512h336c13.26 0 24-10.75 24-23.1S437.3 464 424 464z"/>
		</svg>`,
	1: `<svg style="height: 4rem;" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
			<path d="M360 464H23.1C10.75 464 0 474.7 0 487.1S10.75 512 23.1 512H360C373.3 512 384 501.3 384 488S373.3 464 360 464zM345.1 32h-308C17 32 0 49 0 70v139.4C0 218.8 4 227.5 11 233.6L48 265.8c0 8.885 .0504 17.64 .0504 26.46c0 39.32-1.001 79.96-11.93 139.8h49C94.95 374.3 96.11 333.3 96.11 285.5C96.11 270.7 96 255.1 96 238.2L48 196.5V80h64V128H160V80h64V128h48V80h64v116.5L288 238.2c0 16.77-.1124 32.25-.1124 47.1c0 47.79 1.164 89.15 10.99 146.7h49c-10.92-59.83-11.93-100.6-11.93-139.9C335.9 283.3 336 274.6 336 265.8l37-32.13C380 227.5 384 218.8 384 209.4V70C384 49 367 32 345.1 32zM192 224C174.4 224 160 238.4 160 256v64h64V256C224 238.4 209.6 224 192 224z"/>
		</svg>`,
	2: `<svg style="height: 4rem;" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
			<path d="M44 320.6l14.5 6.5c-17.01 20.24-26.44 45.91-26.44 72.35C32.06 399.7 32.12 432 32.12 432h48v-32c0-24.75 14-47.5 36.13-58.63l38.13-23.37c13.25-6.625 21.75-20.25 21.75-35.13v-58.75l-15.37 9C155.6 235.8 151.9 240.4 150.5 245.9L143 271c-2.25 7.625-8 13.88-15.38 16.75L117.1 292C114 293.3 110.7 293.9 107.4 293.9c-3.626 0-7.263-.7514-10.66-2.254L63.5 276.9C54.12 272.6 48 263.2 48 252.9V140.5c0-5.125 2.125-10.12 5.75-13.88l7.375-7.375L49.5 96C48.5 94.12 48 92 48 89.88C48 84.38 52.38 80 57.88 80h105c86.75 0 156.1 70.38 156.1 157.1V432h48.06l-.0625-194.9C367.9 124 276 32 162.9 32H57.88C25.88 32 0 57.88 0 89.88c0 8.5 1.75 16.88 5.125 24.62C1.75 122.8 0 131.6 0 140.5v112.4C0 282.2 17.25 308.8 44 320.6zM80.12 164c0 11 8.875 20 20 20c11 0 20-9 20-20s-9-20-20-20C89 144 80.12 153 80.12 164zM360 464H23.1C10.75 464 0 474.7 0 487.1S10.75 512 23.1 512H360C373.3 512 384 501.3 384 488S373.3 464 360 464z"/>
		</svg>`,
	3: `<svg style="height: 4rem;" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg">
			<path d="M296 464H23.1C10.75 464 0 474.7 0 487.1S10.75 512 23.1 512h272C309.3 512 320 501.3 320 488S309.3 464 296 464zM0 304c0 51.63 30.12 85.25 64 96v32h48v-67.13l-33.5-10.63C63.75 349.5 48 333.9 48 304c0-84.1 93.2-206.5 112.6-206.5c19.63 0 60.01 67.18 70.28 85.8l-66.13 66.13c-3.125 3.125-4.688 7.219-4.688 11.31S161.6 268.9 164.8 272L176 283.2c3.125 3.125 7.219 4.688 11.31 4.688s8.188-1.562 11.31-4.688L253 229C264.4 256.8 272 283.5 272 304c0 29.88-15.75 45.5-30.5 50.25L208 364.9V432H256v-32c33.88-10.75 64-44.38 64-96c0-73.38-67.75-197.2-120.6-241.5C213.4 59.12 224 47 224 32c0-17.62-14.38-32-32-32H128C110.4 0 96 14.38 96 32c0 15 10.62 27.12 24.62 30.5C67.75 106.8 0 230.6 0 304z"/>
		</svg>`
}

function writeTeamMembersName(leader, members) {
	delTeamMembers.innerHTML = ''
	let teamMarkup = ''
	let leaderMarkup = `
		<div class="col-sm-9 col-md-6 col-lg-4">
			<div class="card shadow pt-3 mb-2" data-bs-toggle="tooltip" data-bs-title="Leader">
				<div class="card-body">
					<div class="text-center">
						<svg style="height: 4rem;" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
							<path d="M391.9 464H55.95c-13.25 0-23.1 10.75-23.1 23.1S42.7 512 55.95 512h335.1c13.25 0 23.1-10.75 23.1-23.1S405.2 464 391.9 464zM448 216c0-11.82-3.783-23.51-11.08-33.17c-10.3-14.39-27-22.88-44.73-22.88L247.9 160V104h31.1c13.2 0 24.06-10.8 24.06-24S293.1 56 279.9 56h-31.1V23.1C247.9 10.8 237.2 0 223.1 0S199.9 10.8 199.9 23.1V56H167.9c-13.2 0-23.97 10.8-23.97 24S154.7 104 167.9 104h31.1V160H55.95C24.72 160 0 185.3 0 215.9C0 221.6 .8893 227.4 2.704 233L68.45 432h50.5L48.33 218.4C48.09 217.6 47.98 216.9 47.98 216.1C47.98 212.3 50.93 208 55.95 208h335.9c6.076 0 8.115 5.494 8.115 8.113c0 .6341-.078 1.269-.2405 1.887L328.8 432h50.62l65.1-199.2C447.2 227.3 448 221.7 448 216z"/>
						</svg>
						<p class="lead text-primary mt-3"></p>
						<h4 class="card-title text-primary fs-3"><span id="del-leader-name">${decomposeDelName(leader.first_name, leader.last_name)}</span></h4>
					</div>
				</div>
			</div>
		</div>
	`

	members.forEach((member, index) => {
		teamMarkup += `
			<div class="col-sm-9 col-md-6 col-lg-4">
				<div class="card shadow pt-3 mb-2" data-bs-toggle="tooltip" data-bs-title="Member">
					<div class="card-body">
						<div class="text-center">
							${delMembersNameLogo[(index)]}
							<p class="lead text-primary mt-3"></p>
							<h4 class="card-title text-primary fs-3"><span class="del-member-name">${decomposeDelName(member.first_name, member.last_name)}</span></h4>
						</div>
					</div>
				</div>
			</div>
		`
	})

	delTeamMembers.innerHTML = (leaderMarkup + teamMarkup)
}

function writePaymentStatus(status) {
	delegatePaymentStatus.innerHTML = ''

	if (status) {
		delegatePaymentStatus.innerHTML = `
			<div class="alert alert-success alert-dismissible fade show" role="alert">
				<h4 class="alert-heading">Confirmed</h4>
				<p>Your team final payment has been confirmed! <i class="bi bi-emoji-smile"></i></p>
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
				<hr>
  				<p class="mb-0">Make sure your liaison officer has invited you to the finalist group.</p>
			</div>
		`
	} else {
		delegatePaymentStatus.innerHTML = `
			<div class="alert alert-warning" role="alert">
				<h4 class="alert-heading">Unconfirmed</h4>
				<p>Your team payment has not been confirmed <i class="bi bi-emoji-frown"></i></p>
				<hr>
  				<p class="mb-0">If within 24 hours the status has not changed, please contact us</p>
			</div>
		`
	}
}

function confirmedUserFinalPayment(ref) {
	if (!ref.leaderFinalPayData?.confirmed) {
		return false
	}
	for (let i = 0; i < ref.members.length; i++) {
		if (!ref[`member${i+1}FinalPayData`]?.confirmed) {
			return false
		}
	}
	return true
}

function havepayUserFinalPayment(ref) {
	if (!ref.leaderFinalPayData?.have_pay) {
		return false
	}
	for (let i = 0; i < ref.members.length; i++) {
		if (!ref[`member${i+1}FinalPayData`]?.have_pay) {
			return false
		}
	}
	return true
}

function showDelegatesFinalStatus(container, status) {
	let alertCont 

	if (status !== undefined) {
		if (status) {	
			alertCont = `
				<div class="alert alert-success" role="alert">
					<h4 class="alert-heading fw-bold">PASSED</h4>
					<p>Aww yeah! Congratulations on advancing to the finals—your hard work and dedication have truly paid off, and we're excited to see you shine in this next stage!</p>
					<hr>
					<p>Get your SC Final Booklet <a href="https://firebasestorage.googleapis.com/v0/b/ipfest25web.appspot.com/o/Case%2FSC%2FSC%20Final%20Booklet%202025.docx%20(1).pdf?alt=media&token=c0888335-cf34-4cb0-87c4-c03b77775df8" class="link-info" target="_blank">here</a>!</p>		 
				</div>
			`
		} else {
			alertCont = `
				<div class="alert alert-danger" role="alert">
					<h4 class="alert-heading fw-bold">FAILED</h4>
					<p>Although you didn't make it to the finals, your effort and dedication have been truly commendable—keep striving, as this is just one step in your journey to success!</p>									 
				</div>
			`
		}
	} else {
		alertCont = ''
	}
	container.innerHTML = alertCont
}

function decomposeDelName(firstname, lastname) {
	return `${firstname} ${lastname}`
}

let competitionName = {
	"SC": ["Smart Competition", "https://drive.google.com/file/d/1MH0raIJYni8wuBYUZMx2t9H3zSNUX1Vn/view?usp=drive_link"]
}

// Final Payment Handle
const paymentStorage = ref(STORAGE, 'Payment')
const finalPaymentCont = document.getElementById("del-final-payment")
const finalPaymentUploadForm = document.getElementById("final-payment-upload")
const finalPayUplBtn = finalPaymentUploadForm.querySelector("button")
const leaderFinalPayForm = document.getElementById("leader-final-pay-form")
const membersFinalPaySec = document.querySelector(".members-final-pay-form")

// Generate form based on how many the team members are
function generateTeamEntry(count, membersData) {
	membersFinalPaySec.innerHTML = ''

	for (let i = 0; i < count; i++) {
		let memberName = `<span class"fs-6" style="color: #bc2300">${membersData[i].first_name} ${membersData[i].last_name}</span>`

		let memberEntry = document.createElement('div')
		memberEntry.id = `member-${i+1}`
		memberEntry.classList.add("member", "mb-3")

		memberEntry.innerHTML = `
			<h4 class="lead fs-5 text-black">Member ${i+1}: ${memberName}</h4>
			<div class="row">
				<div class="col-md-6 col-12">
					<label for="final-member-payment-submit-${i+1}" class="form-label">Upload payment proof</label>
					<input type="file" name="final-member-payment-submit-${i+1}" id="final-member-payment-submit-${i+1}" class="form-control final-member-payment-submit" placeholder="Your Payment Proof" aria-label="Final Payment Proof" required>
					<style>
						#final-member-payment-submit-${i+1}:hover{
							cursor: pointer;
						}
					</style>
				</div>
				<div class="col-md-6 col-12">
					<label for="member-${i+1}-hospitality-type" class="form-label">Hospitality:</label>
					<select name="member-${i+1}-hospitality-type" id="member-${i+1}-hospitality-type" class="form-select member-hospitality-type" required>
						<option value="Full Hospitality">Full Hospitality</option>
						<option value="Excluding Accommodation">Excluding Accommodation</option>
					</select>
				</div>
			</div>
			<div class="row">
				<div class="col-md-6 col-12">
					<label for="member-${i+1}-payment-type" class="form-label mt-3">Payment Scheme:</label>
					<select name="member-${i+1}-payment-type" id="member-${i+1}-payment-type" class="form-select member-payment-type" required disabled>
						<option value="Full" selected>Full Payment</option>
					</select>
					<style>
						#member-${i+1}-payment-type:hover{
							cursor: not-allowed;
						}
					</style>
				</div>
				<div class="col-md-6 col-12">
					<label for="member-${i+1}-payment-method" class="form-label mt-3">Payment Method:</label>
					<select name="member-${i+1}-payment-method" id="member-${i+1}-payment-method" class="form-select member-payment-method" required>
						<option value="Gopay">Gopay</option>
						<option value="Bank Mandiri">Bank Mandiri</option>
						<option value="Paypal">Paypal</option>
					</select>
				</div>
			</div>
			<hr>
		`
		membersFinalPaySec.append(memberEntry)
	}
}

// Get payment data
let leaderPayIMG 
let leaderData
let members
let membersPayIMG
let membersPayIMGArchieve
let membersData

async function getTeamFinalPaymentData() {
	leaderPayIMG = leaderFinalPayForm.querySelector('input[name="final-leader-payment-submit"]').files[0]
	leaderData = {
		have_pay:true,
		confirmed: false,
		hospitality: leaderFinalPayForm.querySelector('select[name="leader-hospitality-type"]').value,
		pay_scheme: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value,
		pay_method: leaderFinalPayForm.querySelector('select[name="leader-payment-method"]').value,
		pay_dp_category: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value == 'Full' ? 'Non-DP' : leaderFinalPayForm.querySelector('select[name="leader-down-payment-category"]').value,
		final_pay_status: leaderFinalPayForm.querySelector('select[name="leader-payment-type"]').value == 'Full',
	}

	membersPayIMG = []
	membersPayIMGArchieve = []
	membersData = []
	members = membersFinalPaySec.querySelectorAll('.member')
	members.forEach((member, i) => {
		let mpi = member.querySelector(`input[name="final-member-payment-submit-${i+1}"]`).files[0]
		let validMPI = mpi === undefined ? '' : mpi

		membersPayIMG.push(validMPI)

		let memberData = {
			have_pay:true,
			confirmed: false,
			hospitality: member.querySelector(`select[name="member-${i+1}-hospitality-type"]`).value,
			pay_scheme: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value,
			pay_method: member.querySelector(`select[name="member-${i+1}-payment-method"]`).value,
			pay_dp_category: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value == 'Full' ? 'Non-DP': member.querySelector(`select[name="member-${i+1}-down-payment-category"]`).value,
			final_pay_status: member.querySelector(`select[name="member-${i+1}-payment-type"]`).value == 'Full'
		}
		membersData.push(memberData)
	})
}

// Final Payment Form Upload
async function uploadFile(storageRef, file) {
	try {
		const snap = await uploadBytes(storageRef, file)
		return await getDownloadURL(snap.ref)
	} catch(err) {
		console.log(`Failed to upload following file: ${file.name}`)
		setToastAlert('danger', `Failed to upload ${file.name}. Please try again or contact us!`)
		throw err
	}
}

finalPaymentUploadForm.addEventListener("submit", async (e) => {
	e.preventDefault()

	if (finalPayUplBtn.disabled) return

	finalPayUplBtn.disabled = true
	finalPayUplBtn.innerText = 'Processing...'

	let bePatient = setTimeout(() => {
		finalPayUplBtn.innerText = 'This may take a few minutes...'
	}, 10000)

	if (finalPaymentUploadForm.checkValidity()) {
		const categorizeFile = (cat, url) => cat === 'Last' ? { last_pay: url } : { first_pay: url }

		try {
			await getTeamFinalPaymentData()

			// Handle leader payment
			let leaderPayObj = {}
			if (leaderPayIMG) {
				const leaderRef = ref(paymentStorage, `${Date.now()}_${leaderPayIMG.name}`)
				const leaderDownloadUrl = await uploadFile(leaderRef, leaderPayIMG)
				leaderPayObj = categorizeFile(leaderData.pay_dp_category, leaderDownloadUrl)
			} else {
				leaderPayObj = { last_pay: "" }
			}

			// Handle members payment
			let failedFiles = []
			let uploadPromises = membersPayIMG.map(async (img, i) => {
				if (!img) {
					return { last_pay: '' }
				}

				try {
					const imgRef = ref(paymentStorage, `${Date.now()}_${img.name}`)
					const downloadUrl = await uploadFile(imgRef, img)

					return categorizeFile(membersData[i].pay_dp_category, downloadUrl)
				} catch (err) {
					failedFiles.push(img.name)
					return null
				}
			})

			membersPayIMGArchieve = (await Promise.allSettled(uploadPromises))
			.filter(r => r.status === 'fulfilled' && r.value !== null)
			.map(r => r.value)

			let individualMemberData = {}
			membersData.forEach((member, index) => {
				individualMemberData[`member${index + 1}FinalPayData`] = member
			})

			// Merged old data with the new one
			const teamDocRef = doc(DB, 'Team', currentUserID)
			const teamData = (await getDoc(teamDocRef)).data() || {}

			const updatedLeaderFinalPayIMG = {
			...(teamData.leaderFinalPayIMG || {}), 
			...leaderPayObj                  
			}

			const updatedMembersFinalPayIMG = (teamData.membersFinalPayIMG || []).map((img, index) => {
				if (index < membersPayIMGArchieve.length) {
					return {
						...img, 
						...membersPayIMGArchieve[index]
					 };
				}
				return img
			 })

			console.log("Data to update Firestore:", {
				leaderFinalPayIMG: updatedLeaderFinalPayIMG,
				leaderFinalPayData: leaderData,
				membersFinalPayIMG: updatedMembersFinalPayIMG,
				...individualMemberData,
			})

			await updateDoc(teamDocRef, {
				leaderFinalPayIMG: updatedLeaderFinalPayIMG,
				leaderFinalPayData: leaderData,
				membersFinalPayIMG: updatedMembersFinalPayIMG,
				...individualMemberData
			})

			if (failedFiles.length) {
				setToastAlert('danger', `Failed to upload the following files: ${failedFiles.join(', ')}`)
			} else {
				setToastAlert('success', 'Success sending your payment')
			}
			delegatePaymentStatus.classList.remove('d-none')

		} catch(err) {
			console.error("Error during payment upload:", err)
			setToastAlert('danger', 'Cannot sending your files! Please contact us!')
		} finally {
			clearTimeout(bePatient);
			finalPayUplBtn.innerText = 'Submit'
			finalPayUplBtn.disabled = false
		}
	} else {
		clearTimeout(bePatient)
		finalPayUplBtn.disabled = false
		finalPayUplBtn.innerText = 'Submit'
		setToastAlert('warning', 'Please complete the form before submitting!')
	}
})

async function fetchUserData() {

	if (currentUserID) {
		const userRef = doc(DB, "Team", currentUserID)
		const userSelection = doc(DB, 'SC_Selection', currentUserID)

		try{
			const userSnap = await getDoc(userRef)
			const selectionSnap = await getDoc(userSelection)

			if (userSnap.exists() && selectionSnap.exists()) {
				const userData = userSnap.data()
				const selectionData = selectionSnap.data()

				// writeRoundStatus()
				delegateTeamName.textContent = userData.team_name
				delCompetition.forEach(del => {
					del.textContent = 'Smart Competition'
				})
				delegateUniv.textContent = userData.university
				
				// Show or hide del payment status
				if (havepayUserFinalPayment(userData)) {
					delegatePaymentStatus.classList.remove('d-none')
				} else {
					delegatePaymentStatus.classList.add('d-none')
				}

				// Write final payment status
				if (confirmedUserFinalPayment(userData)) {
					writePaymentStatus(true)
				} else {
					writePaymentStatus(false)
				}

				writeTeamMembersName(userData.leader, userData.members)

				showDelegatesFinalStatus(delFinalStatusCont, selectionData.elimination)

				if (selectionData.elimination) {
					generateTeamEntry(userData.members.length, userData.members)
					finalPaymentCont.classList.remove('d-none')
				} else {
					finalPaymentCont.classList.add('d-none')
					delegatePaymentStatus.classList.add("d-none")
				}
			} else {
				console.log("User tidak ditemukan")
				window.location.href = '../../login.html'
			}
		}catch(err){
			console.log("Something wrong during fetching user data", err)
		}
	} else {
		console.log("There is no user logged in")
	}
}