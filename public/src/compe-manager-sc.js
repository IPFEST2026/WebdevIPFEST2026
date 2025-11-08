import { onAuthStateChanged, signOut } from "firebase/auth";

import {
	collection, doc, onSnapshot,
	query, updateDoc, where, deleteField,
	serverTimestamp,
	getDocs
} from 'firebase/firestore'

import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

const managerName = document.querySelector("#manager-name")
const managerCompetition = document.querySelector("#manager-competition")

// Check user auth
onAuthStateChanged(AUTH, (user) => {
	if (user) {
		if (user.email !== 'sc.ipfest2026@gmail.com' || user.uid !== 'z9BeNeMCDvMqi6DJRYsDnp1g0Tx2') {
			window.location.href = '../../login.html'
		} else {
			managerName.textContent = 'Daniel Matthew Christian Sagala'
			managerCompetition.textContent = 'Smart Competition'
		}
	} else {
		window.location.href = '../../login.html'
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

// Database Section
const SCTeam = query(collection(DB, 'Team'), where('competition', '==', 'SC'))
const delRelList = document.getElementById("delrel-team-list")

onSnapshot(SCTeam, (snap) => {
	let teamDocs = snap.docs

	delRelList.innerHTML = ''
	teamDocs.forEach((team, index) => {
		let teamData = team.data()
		createTeamList(
			index+1,
			teamData.team_name,
			teamData.university,
			teamData.competition,
			teamData.leader,
			teamData.members
		)
	})
})

function createTeamList(rowNo, teamName, univ, compe, teamLeader, teamMember) {
	let teamLeaderRow = document.createElement("tr")

	teamLeaderRow.innerHTML = `
		<td rowspan="${teamMember.length + 1}">${rowNo}</td>
		<td rowspan="${teamMember.length + 1}">${teamName}</td>
		<td rowspan="${teamMember.length + 1}">${univ}</td>
		<td rowspan="${teamMember.length + 1}">${compe}</td>
		<td rowspan="${teamMember.length + 1}">${teamMember.length + 1}</td>
		<td class="text-secondary">${teamLeader.first_name}</td>
		<td class="text-secondary">${teamLeader.last_name}</td>
		<td>${teamLeader.major}</td>
		<td>${teamLeader.gender}</td>
		<td>${teamLeader.batch}</td>
		<td>${teamLeader.person_id}</td>
		<td>${teamLeader.student_id}</td>
		<td>${teamLeader.phone}</td>
		<td>${teamLeader.email}</td>
	`;

	delRelList.appendChild(teamLeaderRow)

	teamMember.forEach((member, index) => {
		let teamMemberRow = document.createElement("tr")

		teamMemberRow.innerHTML = `
			<td>${member.first_name}</td>
			<td>${member.last_name}</td>
			<td>${member.major}</td>
			<td>${member.gender}</td>
			<td>${member.batch}</td>
			<td>${member.person_id}</td>
			<td>${member.student_id}</td>
			<td>${member.phone}</td>
			<td>${member.email}</td>
		`

		delRelList.appendChild(teamMemberRow)
	})
}

// Download Database as .xlsx
const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
	const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })

	XLSX.writeFile(workbook, "Delegates_DB.xlsx")
})

// Selection Section
const SCSelection = collection(DB, 'SC_Selection')
// Preliminary Round
const selectionFormPrelim = document.getElementById("compe-manager-privilage-prelim")
const selectionTablePrelim = document.getElementById("del-selection-list-prelim")
// Final Booklet
const caseStorage = ref(STORAGE, 'Case')

const finalBookletDist = document.getElementById('final-booklet-distribution')
const bookletFile = finalBookletDist.querySelector('input')
const deleteBookletBtn = finalBookletDist.querySelector('#delete-booklet-final')
const submitBookletBtn = finalBookletDist.querySelector('#submit-final-booklet')

deleteBookletBtn.addEventListener('click', () => { bookletFile.value = '' })

finalBookletDist.addEventListener('submit', (e) => {
	e.preventDefault()

	if (submitBookletBtn.disabled) return

	if (!finalBookletDist.checkValidity()) {
		setToastAlert('warning', 'Please fill the form correctly')
		return
	}

	const docRef = doc(DB, 'Information', '13HEVsAZhaWYqJiEowyz')

	try {
		submitBookletBtn.disabled = true
		submitBookletBtn.innerText = 'Processing...'

		const file  = bookletFile.files[0]
		const folderRef = ref(caseStorage, 'SC')
		const fileRef = ref(folderRef, `${file.name}`)
		const uploadTask = uploadBytesResumable(fileRef, file)

		uploadTask.on('state_changed', 
			(snapshot) => {
				const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
				console.log(progress)
			},
			(err) => {
				switch (err.code) {
					case 'storage/unauthorized':
						setToastAlert('danger', 'You do not have permission to upload the file!')
						break
					case 'storage/unknown':
						setToastAlert('danger', 'An unknown error occurred!')
						break
				}
				console.error(err)
			},
			() => {
				getDownloadURL(uploadTask.snapshot.ref)
				.then((url) => {
					return updateDoc(docRef, {
						final_booklet_link: url,
						sent_on: serverTimestamp()
					})
				})
				.then(() => {
					setToastAlert('success', 'Success uploading the booklet!')
				})
				.catch((err) => {
					console.error(err)
					setToastAlert('danger', 'Something went wrong!')
				})
				.finally(() => {
					submitBookletBtn.disabled = false
					submitBookletBtn.innerText = 'Send'
				})
			}
		)
	} catch (err) {
		console.error(err)
		setToastAlert('danger', 'Something went wrong!')
		submitBookletBtn.disabled = false
		submitBookletBtn.innerText = 'Send'
	}
})

onSnapshot(SCSelection, (snap) => {
	// Preliminary Table
	let SCData = snap.docs

	selectionTablePrelim.innerHTML = ''
	SCData.forEach((data, index) => {
		let team = data.data()
		createSelectionTable(
			selectionTablePrelim,
			data.id,
			index+1,
			team.team,
			team.university,
			team.elimination
		)
	})

	const compeConfirm = document.querySelectorAll(".compe-manager-confirm")
	compeConfirm.forEach(c => c.addEventListener('change', () => {
		console.log("CONFIRM CHANGE")

		switch (c.value) {
			case "1":
				c.classList.remove("bg-danger")
				c.classList.remove("bg-light", "text-black")
				c.classList.add("bg-success", "text-white")
				break
			case "-1":
				c.classList.add("bg-danger", "text-white")
				c.classList.remove("bg-light", "text-black")
				c.classList.remove("bg-success")
				break
			default:
				c.classList.remove("bg-danger", "text-white")
				c.classList.add("bg-light", "text-black")
				c.classList.remove("bg-success", "text-white")
				break
		}
	}))
})

// Preliminary Form Selection
selectionFormPrelim.addEventListener("submit", (e) => {
	e.preventDefault()

	try {
		selectionTablePrelim.querySelectorAll("tr").forEach(row => {
			let selectedValue = row.querySelector("select").value
			const docRef = doc(DB, 'SC_Selection', row.getAttribute("id"))
			const docRef2 = doc(DB, 'Submission_Status', row.getAttribute('id'))
	
			switch (selectedValue) {
				case '1':
					updateDoc(docRef, { elimination: true })
					updateDoc(docRef2, { final: true })
					break
				case '-1':
					updateDoc(docRef, { elimination: false })
					updateDoc(docRef2, { final: false })
					break
				case '0':
					updateDoc(docRef, { elimination: deleteField() })
					updateDoc(docRef2, { final: deleteField() })
					break
				default:
					throw TypeError('Invalid value')
			}
		})
		setToastAlert('success', 'Success updating selection')
	} catch (err) {
		setToastAlert('danger', 'Failed to save selection preliminary')
	}
})

function createSelectionTable(table, teamId, rowNo, teamName, univ, nextStatus) {
	let submitRow = document.createElement("tr")
	submitRow.setAttribute("id", teamId)

	let nextPassingStatus
	switch (nextStatus) {
		case true:
			nextPassingStatus = `
				<select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-success">
					<option value="0">Pending</option>
					<option value="-1">Failed</option>
					<option value="1" selected>Passed</option>
				</select>
			`
			break
		case false:
			nextPassingStatus = `
				<select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-danger">
					<option value="0">Pending</option>
					<option value="-1" selected>Failed</option>
					<option value="1">Passed</option>
				</select>
			`
			break
		default:
			nextPassingStatus = `
				<select class="compe-manager-confirm form-select text-black bg-opacity-25 bg-light">
					<option value="0" selected>Pending</option>
					<option value="-1">Failed</option>
					<option value="1">Passed</option>
				</select>
			`
			break
	}

	submitRow.innerHTML = `
		<td>${rowNo}</td>
		<td>${teamName}</td>
		<td>${univ}</td>
		<td>${nextPassingStatus}</td>
	`
	table.append(submitRow)
}