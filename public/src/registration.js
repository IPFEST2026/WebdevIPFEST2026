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
   "PODC": [4, 5],
   "SC": [2, 3],
   "MIC": [2, 3],
   "PPC": [2, 3],
   "ORDC": [4, 5],
   "BCC": [3],
   "GDPC": [4],
   "WDC": [4, 5]
}

function generateTeamMemberOption(competition, container){
   container.innerHTML = ''
   let optionContainer = ''

   teamMemberCondition[competition].forEach(m => {
      optionContainer += `<option value="${m}">${m} people</option>`
   })

   container.innerHTML = optionContainer
}

function generateMemberEntry(entry, count){
   entry.innerHTML = ''

   for (let i = 0; i < count - 1; i++){
      let memberEntry = document.createElement('div')
      memberEntry.innerHTML = `
      <h3 class="lead fs-2 mt-6" style="color: #bc2300;">Member ${i+1}</h3>
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

// Handle user registration : submit
const studentCard = ref(STORAGE, 'Student Card')
const paymentStorage = ref(STORAGE, 'Payment')

const registrationForm = document.querySelector("#registration-form")
const submitBtn = document.getElementById("submit-btn-ipfest")
const leaderForm = registrationForm.querySelector("#leader")
const memberForm = registrationForm.querySelector("#member")
const competitionForm = registrationForm.querySelector("#competition")
const paymentForm = registrationForm.querySelector("#payment")
const agreementForm = registrationForm.querySelector("#check-agreement")
const paymentMethod = paymentForm.querySelector(".payment-method").querySelectorAll("button")

const entryContainer = memberForm.querySelector("#entry")
const memberCount = leaderForm.querySelector('select[name="memberCount"]')

const overlay = document.querySelector(".overlay")

document.querySelectorAll(".card").forEach(card => card.addEventListener("click", () => {
   let selectedCompetition = competitionForm.querySelector('input[name="compe"]').value
   leaderForm.classList.remove("d-none")
   memberForm.classList.remove("d-none")
   paymentForm.classList.remove("d-none")
   agreementForm.classList.remove("d-none")
   generateTeamMemberOption(selectedCompetition, memberCount)
   generateMemberEntry(entryContainer, parseInt(memberCount.value, 10))
}))

generateMemberEntry(entryContainer, parseInt(memberCount.value, 10))

memberCount.addEventListener('change', () => {
   generateMemberEntry(entryContainer, parseInt(memberCount.value, 10))
})

let payMethod = "Bank Mandiri"
paymentMethod.forEach(method => method.addEventListener('click', () => {
   payMethod = method.textContent
   console.log(payMethod)
   
   if (method.textContent == "Paypal"){
      paymentForm.querySelector('input[name="payment-proof"]').removeAttribute('required')
   }else{
      paymentForm.querySelector('input[name="payment-proof"]').setAttribute('required', 'true')
   }
}))

function earlybirdStatus() {
   let earlybirdDeadline = new Date('Nov 15, 2024 00:00:00').getTime()
   let now = new Date().getTime()
   let distance = earlybirdDeadline - now

   if (distance > 0) {
      return true
   } else {
      return false
   }
}

// Check password
const pass = document.querySelector("input[name='password']")
const confirmPass = document.querySelector("input[name='confirmPassword']")
const invalidFeedback = document.querySelector(".not-same-password")
let passwordIsValid

function checkPassword(pass, confirmPass, feedback) {
   if (pass !== confirmPass) {
      feedback.classList.remove("d-none")
      return false
   }

   feedback.classList.add("d-none")
   return true
}

confirmPass.addEventListener("input", () => {
   passwordIsValid = checkPassword(pass.value, confirmPass.value, invalidFeedback)
})

// Create Team DB Ref object
let leaderIMG 
let leaderBatch 
let leaderGender
let leaderData 
let leaderCred 
let team_data 
let memberIMG 
let memberCred 
let members
let memberIMGArchieve
let paymentIMG

async function getDelegatesData() {
   leaderIMG = leaderForm.querySelector('input[name="studentCardPhoto"]').files[0];
   leaderBatch = leaderForm.querySelector('select[name="batch"]').value
   leaderGender = leaderForm.querySelector('select[name="gender"]').value
   leaderData = {
      email: leaderForm.querySelector('input[name="email"]').value,
      first_name: leaderForm.querySelector('input[name="firstName"]').value,
      last_name: leaderForm.querySelector('input[name="lastName"]').value,
      major: leaderForm.querySelector('input[name="major"]').value,
      batch: leaderBatch,
      gender: leaderGender,
      person_id: leaderForm.querySelector('input[name="idCard"]').value,
      student_id: leaderForm.querySelector('input[name="studentId"]').value,
      phone: leaderForm.querySelector('input[name="phoneNo"]').value
   }
   leaderCred = {
      email: leaderData.email,
      password: leaderForm.querySelector('input[name="password"]').value
   }

   team_data = {
      university: leaderForm.querySelector('input[name="university"]').value,
      team_name: leaderForm.querySelector('input[name="teamName"]').value,
      competition: competitionForm.querySelector('input[name="compe"]').value,
      join_on: serverTimestamp(),
      leader: leaderData,
      members: [],
      confirmed: false,
      early_bird: earlybirdStatus(),
      "USR/IDR": "IDR",
      nominal: earlybirdStatus() ? 200000 : 250000,
      method: payMethod
   }

   memberIMG = []
   memberIMGArchieve = []
   memberCred = []
   members = memberForm.querySelectorAll('.member-entry')
   members.forEach((member, i) => {
      let memberData = {
         email: member.querySelector(`input[name='email${i+1}']`).value,
         first_name: member.querySelector(`input[name='firstName${i+1}']`).value,
         last_name: member.querySelector(`input[name='lastName${i+1}']`).value,
         major: member.querySelector(`input[name='major${i+1}']`).value,
         batch: member.querySelector(`select[name='batch${i+1}']`).value,
         gender: member.querySelector(`select[name='gender${i+1}']`).value,
         person_id: member.querySelector(`input[name='idCard${i+1}']`).value,
         student_id: member.querySelector(`input[name='studentId${i+1}']`).value,
         phone: member.querySelector(`input[name='phoneNo${i+1}']`).value,
      }
      team_data.members.push(memberData)
      memberIMG.push(member.querySelector(`input[name='studentCardPhoto${i+1}']`).files[0])
      memberCred.push({
         email: memberData.email
      })
   })

   paymentIMG = paymentForm.querySelector('input[name="payment-proof"]').files[0]
}

registrationForm.addEventListener('submit', async (e) => {
   e.preventDefault()

   submitBtn.disabled = true
   submitBtn.innerText = 'Processing...'

   await getDelegatesData()

   if (registrationForm.checkValidity() && passwordIsValid){
      let isValidDoc = true
      const { user } = await createUserWithEmailAndPassword(AUTH, leaderCred.email, leaderCred.password)
      overlay.classList.remove("d-none")

      // Add team data to Team DB
      await setDoc(doc(DB, 'Team', user.uid), team_data)
         .catch((err) =>  {
            submitBtn.disabled = false
            submitBtn.innerText = 'Submit'
            console.log("Cannot adding data to Team col:", err.message)
            isValidDoc = false
            overlay.classList.add("d-none")
         })
      await setDoc(doc(DB, 'Submission_Status', user.uid), {
         case: "",
         competition: team_data.competition,
         team_name: team_data.team_name,
         university: team_data.university,
         sub_preliminary: {
            fileURL: "",
            status: false
         }
      }).catch((err) => {
         submitBtn.disabled = false
         submitBtn.innerText = 'Submit'
         console.log("Cannot adding data to Team col:", err.message)
         isValidDoc = false
         overlay.classList.add("d-none")
      })

      if (isValidDoc){
         // Add student card and payment proof picture to bucket
         try{
            const studentCard_leader = ref(studentCard, `${team_data.team_name}/${leaderIMG.name}`)
            const leaderSnap = await uploadBytes(studentCard_leader, leaderIMG)
            const leaderDownloadUrl = await getDownloadURL(leaderSnap.ref)
            await updateDoc(doc(DB, 'Team', user.uid), { leaderIMG: leaderDownloadUrl })
   
            let memberUpload = memberIMG.map(async (img) => {
               const studentCard_member = ref(studentCard, `${team_data.team_name}/${img.name}`)
               const snap = await uploadBytes(studentCard_member, img)
               const downloadUrl = await getDownloadURL(snap.ref)
            
               return downloadUrl
            })
            memberIMGArchieve = await Promise.all(memberUpload)
            await updateDoc(doc(DB, 'Team', user.uid), { memberIMG: memberIMGArchieve })

            const paymentProof = ref(paymentStorage,`${user.uid}_${Date.now()}_${paymentIMG.name}`)
            const paymentSnap = await uploadBytes(paymentProof, paymentIMG);
            const paymentDownloadUrl = await getDownloadURL(paymentSnap.ref);
            await updateDoc(doc(DB, 'Team', user.uid), { p_url: paymentDownloadUrl })

            localStorage.setItem('signupSuccess', 'true')

            submitBtn.disabled = false
            submitBtn.innerText = 'Success'

            // overlay.classList.add("d-none")
            window.location.href = 'login.html'
         } catch(err) {
            submitBtn.disabled = false
            submitBtn.innerText = 'Submit'

            console.log("SOMETHING WRONG WHILE ADDING TO STORAGE")
            console.log(err.message)

            overlay.classList.add("d-none")
         }
      }
   } else {
      submitBtn.disabled = false
      submitBtn.innerText = 'Submit'
      console.log("Form is not valid", registrationForm.reportValidity())
   }
})