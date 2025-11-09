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
		<h3 class="lead fs-2 mt-6" style="color: #bc2300;">Member ${i + 1}</h3>
		<div class="member-entry" style="margin-bottom: 2rem;">
			<!-- [Form fields remain unchanged, trimmed for brevity] -->
		</div>`
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

function earlybirdStatus() {
	const earlybirdDeadline = new Date('Nov 16, 2025 00:00:00').getTime()
	return Date.now() < earlybirdDeadline
}

let payMethod = ""
const paymentForm = document.querySelector("#payment-form")
const rekeningBox = paymentForm ? paymentForm.querySelector(".rekening-info") : null
const proofInput = paymentForm ? paymentForm.querySelector('input[name="payment-proof"]') : null
const paymentMethod = document.querySelectorAll(".payment-method .nav-link")

paymentMethod.forEach(method => method.addEventListener('click', () => {
	payMethod = method.dataset.method
	if (!rekeningBox || !proofInput) return

	const isEarly = earlybirdStatus()
	let indoPrice = isEarly ? "IDR 200.000" : "IDR 250.000"
	let intlPrice = isEarly ? "USD 17" : "USD 20"

	switch (payMethod) {
		case "Bank BCA":
			rekeningBox.innerHTML = `<p>BCA - 2650508800 (Mochammad Rafly Ghazany A)</p><small>${indoPrice}</small>`
			proofInput.required = true
			break
		case "Gopay":
		case "Dana":
			rekeningBox.innerHTML = `<p>085655226900 (Rafly Ghazany)</p><small>${indoPrice}</small>`
			proofInput.required = true
			break
		case "Paypal":
			rekeningBox.innerHTML = `<p><a href="https://www.paypal.me/RaflyGhazany" target="_blank">paypal.me/RaflyGhazany</a></p><small>${intlPrice}</small>`
			proofInput.required = false
			break
	}
}))


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

const registrationForm = document.querySelector("#registration-form")
if (registrationForm) {
	registrationForm.addEventListener('submit', async (e) => {
		e.preventDefault()
		const submitBtn = registrationForm.querySelector("button[type='submit']")
		const overlay = document.querySelector("#overlay")
		if (!submitBtn) return

		submitBtn.disabled = true
		submitBtn.innerText = 'Processing...'

		try {
			if (!passwordIsValid) throw new Error("Password not valid")

			const { user } = await createUserWithEmailAndPassword(AUTH, "example@mail.com", "password123")
			await setDoc(doc(DB, 'Team', user.uid), { join_on: serverTimestamp(), status: "ok" })
			await sendEmailVerification(user)

			submitBtn.innerText = 'Success!'
			window.location.href = 'login.html'
		} catch (err) {
			console.error("Registration failed:", err)
			submitBtn.disabled = false
			submitBtn.innerText = 'Submit'
			if (overlay) overlay.classList.add("d-none")
		}
	})
}
