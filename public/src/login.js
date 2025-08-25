// import from firebase sdk
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// import initialization from index.js
import { AUTH } from './index.js'

// import UI logic from ../static/js
import { emailNotVerified, accountCreated, failedLogin } from '../static/js/alert.js'

window.addEventListener('DOMContentLoaded', (e) => {
	const signupSuccess = localStorage.getItem('signupSuccess')

	if (signupSuccess){
		accountCreated()
		localStorage.removeItem('signupSuccess')
	}
})

// Handle user login
const loginForm = document.querySelector("#login-user")
loginForm.addEventListener('submit', (e) => {
   e.preventDefault()

   const userEmail = loginForm.email.value
   const userPassword = loginForm.password.value

   signInWithEmailAndPassword(AUTH, userEmail, userPassword)
	.then((credential) => {
		const user = credential.user

		if (user && user.email) {
			switch (user.email) {
				case "officialdelegates.ipfest2025@gmail.com":
					window.location.href = './dashboard/delegates-relation.html'
					break
				case "treasury.ipfest2025@email.com":
					window.location.href = './dashboard/treasury.html'
					break
				case "event@ipfest25.com":
					window.location.href = './dashboard/event.html'
					break
				case "podc.ipfest2025@gmail.com":
				case "mic.ipfest2025@gmail.com":
				case "ppc.ipfest2025@gmail.com":
				case "ordc.ipfest2025@gmail.com":
				case "bcc.ipfest2025@gmail.com":
				case "gdpc.ipfest2025@gmail.com":
				case "wdc.ipfest2025@gmail.com":
					window.location.href = './dashboard/compe-manager.html'
					break
				case "sc.ipfest2025@gmail.com":
					window.location.href = './dashboard/smart-competition/manager.html'
					break
				default:
					window.location.href = './dashboard/delegates.html'
			}
		}
	})
	.catch((err) => {
		const errorCode = err.code

		if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-email' || errorCode === 'auth/invalid-credential'){
			loginForm.reset()
			failedLogin()
		}else{
			window.location.href = '400.html'
		}
	})
})