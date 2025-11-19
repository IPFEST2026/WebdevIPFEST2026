import { onAuthStateChanged, signOut } from 'firebase/auth'

import {
    onSnapshot,
    collection,
    updateDoc, doc,
    deleteField,
    serverTimestamp
} from 'firebase/firestore'

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { DB, AUTH, STORAGE } from './index.js'

import { setToastAlert } from '../static/js/alert.js'

// check auth
let switchCompetition
let isPODC = false
const managerName = document.querySelector("#manager-name")
const managerCompetition = document.querySelector("#manager-competition")

const compeManagerEmail = {
    "plan of development": "podc.ipfest2026@gmail.com",
    "smart competition": "sc.ipfest2026@gmail.com",
    "mud inovation": "mic.ipfest2026@gmail.com",
    "paper and poster": "ppc.ipfest2026@gmail.com",
    "oil rig design": "ordc.ipfest2026@gmail.com",
    "business case": "bcc.ipfest2026@gmail.com",
    "geothermal development plan": "gdpc.ipfest2026@gmail.com",
    "well design": "wdc.ipfest2026@gmail.com",
    "hackaton": "hc.ipfest2026@gmail.com"
}

onAuthStateChanged(AUTH, (user) => {
    if (user) {
        switch (user.email) {
            case compeManagerEmail['business case']:
                switchCompetition = 'business case'
                managerName.textContent = 'Muhammad Raihan Fadillah'
                managerCompetition.textContent = 'Business Case'
                break

            case compeManagerEmail['geothermal development plan']:
                switchCompetition = 'geothermal development plan'
                managerName.textContent = 'Iman Ganteng'
                managerCompetition.textContent = 'Geothermal Development Plan'
                break

            case compeManagerEmail['mud inovation']:
                switchCompetition = 'mud inovation'
                managerName.textContent = 'Nafidz Rayyan Hidayat'
                managerCompetition.textContent = 'Mud Innovation'
                break

            case compeManagerEmail['oil rig design']:
                switchCompetition = 'oil rig design'
                managerName.textContent = 'Muhammad Ferris Rahardian'
                managerCompetition.textContent = 'Oil Rig Design'
                break

            case compeManagerEmail['plan of development']:
                switchCompetition = 'plan of development'
                managerName.textContent = 'Jonathan Denen'
                managerCompetition.textContent = 'Plan of Development'
                isPODC = true
                document.getElementById("submission-table").style.width = '120vw'
                document.getElementById("submission-table").querySelector("tr").innerHTML = `
                    <tr>
                        <th scope="col">No.</th>
                        <th scope="col">Team Name</th>
                        <th scope="col">University</th>
                        <th scope="col">Last Submission</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">Submission</th>
                        <th scope="col">L.A.S</th>
                        <th scope="col">Abstract</th>
                        <th scope="col">L.A.A.S</th>
                        <th scope="col">Add. Abstract</th>
                        <th scope="col">Final</th>
                    </tr>
                `
                document.getElementById('submission-table-final').style.width= '100vw'
                document.getElementById('submission-table-final').querySelector("tr").innerHTML = `
                    <tr>
                        <th scope="col">No.</th>
                        <th scope="col">Team Name</th>
                        <th scope="col">University</th>
                        <th scope="col">Last Submission</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">Submission</th>
                        <th scope="col">Last Model</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">Model</th>
                        <th scope="col">Last PPT</th>
                        <th scope="col">Overdue</th>
                        <th scope="col">PPT</th>
                    </tr>
                `
                break
                

            case compeManagerEmail['paper and poster']:
                switchCompetition = 'paper and poster'
                managerName.textContent = 'Ibra Rabbani Dahlan'
                managerCompetition.textContent = 'Paper and Poster'
                break

            case compeManagerEmail['smart competition']:
                switchCompetition = 'smart competition'
                managerName.textContent = 'Daniel Matthew Christian Sagala'
                managerCompetition.textContent = 'Smart Competition'
                break

            case compeManagerEmail['well design']:
                switchCompetition = 'well design'
                managerName.textContent = 'Jiro Adika Faruq'
                managerCompetition.textContent = 'Well Design'
                break

            case compeManagerEmail['hackaton']:
                switchCompetition = 'hackaton'
                managerName.textContent = 'Audrey Hillary Tamba'
                managerCompetition.textContent = 'Hackathon Competition'
                break

            default:
                window.location.href = "../login.html"
        }
    }
})

// Main Database
const Teams = collection(DB, 'Team')

// Database Tab Section
const delRelList = document.getElementById("delrel-team-list")

onSnapshot(Teams, (snap) => {
    let teamDocs = snap.docs

    let compeSize = teamDocs.filter(doc => {
        const d = doc.data()
        return (d.competition || "").toLowerCase() === switchCompetition.toLowerCase()
    })

    delRelList.innerHTML = ''

    compeSize.forEach((team, index) => {
        let data = team.data()
        createTeamList(
            index + 1,
            data.teamName,
            data.leader.university,
            data.competition,
            data.leader,
            data.members ?? [],
            data.payment_status === "verified" ? "Verified" : "Pending"
        )
    })
})

// ===============================
//   CREATE TABLE ROW BY REAL DATA
// ===============================

function createTeamList(rowNo, teamName, univ, compe, leader, members, paymentStatus) {

    const totalMembers = members.length + 1

    // Leader row
    const leaderRow = document.createElement("tr")
    leaderRow.innerHTML = `
        <td rowspan="${totalMembers}">${rowNo}</td>
        <td rowspan="${totalMembers}">${teamName}</td>
        <td rowspan="${totalMembers}">${univ}</td>
        <td rowspan="${totalMembers}">${compe}</td>
		<td rowspan="${totalMembers}">${paymentStatus}</td>
        <td rowspan="${totalMembers}">${totalMembers}</td>

        <td>${leader.firstName}</td>
        <td>${leader.lastName}</td>
        <td>${leader.major}</td>
        <td>${leader.batch}</td>
        <td>${leader.idCard}</td>
        <td>${leader.studentId}</td>
        <td>${leader.phoneNo}</td>
        <td>${leader.email}</td>
		
    `
    delRelList.appendChild(leaderRow)

    // Members row
    members.forEach(m => {
        const mRow = document.createElement("tr")
        mRow.innerHTML = `
            <td>${m.firstName}</td>
            <td>${m.lastName}</td>
            <td>${m.major}</td>
            <td>${m.batch}</td>
            <td>${m.idCard}</td>
            <td>${m.studentId}</td>
            <td>${m.phoneNo}</td>
            <td>${m.email}</td>
        `
        delRelList.appendChild(mRow)
    })
}

// EXPORT TO EXCEL
const dbTable = document.getElementById("db-table")
const excelConvertBtn = document.getElementById("excel-convert")

excelConvertBtn.addEventListener("click", () => {
    const workbook = XLSX.utils.table_to_book(dbTable, { sheet: "DB" })
    XLSX.writeFile(workbook, `${switchCompetition}_Delegates_DB.xlsx`)
})


// Submission Section
const Submission_Status = collection(DB, 'Submission_Status')

// Prelim Submission
const submissionTablePrelim = document.getElementById("del-submission-list-prelim")
const compeManagerPrivilage = document.getElementById("compe-manager-privilage")

function createSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit, finalStatus) {
	let submitRow = document.createElement("tr")
	submitRow.setAttribute("id", teamId)

	let URLSubmit = `
		<a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`

	let finalPassingStatus
	switch (finalStatus) {
		case true:
			finalPassingStatus = `
				<select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-success">
					<option value="0">Pending</option>
					<option value="-1">Failed</option>
					<option value="1" selected>Passed</option>
				</select>
			`
			break
		case false:
			finalPassingStatus = `
				<select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-danger">
					<option value="0">Pending</option>
					<option value="-1" selected>Failed</option>
					<option value="1">Passed</option>
				</select>
			`
			break
		default:
			finalPassingStatus = `
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
		<td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
		<td>${status ? overdue : "No Data"}</td>
		<td>${status ? URLSubmit : "No Data"}</td>
		<td>${finalPassingStatus}</td>
	`
	table.append(submitRow)
}

function createPODCSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit, finalStatus, absSub, addAbsSub, absStat, addAbsStat, lastAbs, lastAddAbs) {
	let submitRow = document.createElement("tr")
	submitRow.setAttribute("id", teamId)

	let URLSubmit = `
		<a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`
	let URLAbsSub = `
		<a href="${absSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`
	let URLAddAbsSub = `
		<a href="${addAbsSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`

	let finalPassingStatus
	switch (finalStatus) {
		case true:
			finalPassingStatus = `
				<select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-success">
					<option value="0">Pending</option>
					<option value="-1">Failed</option>
					<option value="1" selected>Passed</option>
				</select>
			`
			break
		case false:
			finalPassingStatus = `
				<select class="compe-manager-confirm form-select text-white bg-opacity-25 bg-danger">
					<option value="0">Pending</option>
					<option value="-1" selected>Failed</option>
					<option value="1">Passed</option>
				</select>
			`
			break
		default:
			finalPassingStatus = `
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
		<td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
		<td>${status ? overdue : "No Data"}</td>
		<td>${status ? URLSubmit : "No Data"}</td>
		<td>${absStat ? lastAbs.toDate().toLocaleString() : "No Data"}</td>
		<td>${absStat ? URLAbsSub : "No Data"}</td>
		<td>${addAbsStat ? lastAddAbs.toDate().toLocaleString() : "No Data"}</td>
		<td>${addAbsStat ? URLAddAbsSub : "No Data"}</td>
		<td>${finalPassingStatus}</td>
	`
	table.append(submitRow)
}

compeManagerPrivilage.addEventListener("submit", (e) => {
	e.preventDefault()

	submissionTablePrelim.querySelectorAll("tr").forEach(row => {
		let selectedValue = row.querySelector("select")
		const docRef = doc(DB, 'Submission_Status', row.getAttribute("id"))
		
		switch (selectedValue.value) {
			case "1":
				updateDoc(docRef, { final: true })
				break
			case "-1":
				updateDoc(docRef, { final: false })
				break
			default:
				updateDoc(docRef, { final: deleteField() })
				break
		}
	})
	setToastAlert('success', 'Saving success!')
})

// Final Submission
const submissionTableFinal = document.getElementById("del-submission-list-final")

function createFinalSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, lastSubmit) {
	let submitRow = document.createElement("tr")
	submitRow.setAttribute("id", teamId)

	let URLSubmit = `
		<a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`
	submitRow.innerHTML = `
		<td>${rowNo}</td>
		<td>${teamName}</td>
		<td>${univ}</td>
		<td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
		<td>${status ? overdue : "No Data"}</td>
		<td>${status ? URLSubmit : "No Data"}</td>
	`
	table.append(submitRow)
}

function createFinalPODCSubmissionTable(table, teamId, rowNo, teamName, univ, submission, status, overdue, overdueModel, overdueppt, lastSubmit, absSub, addAbsSub, absStat, addAbsStat, lastAbs, lastAddAbs) {
	let submitRow = document.createElement("tr")
	submitRow.setAttribute("id", teamId)

	let URLSubmit = `
		<a href="${submission}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`
	let URLAbsSub = `
		<a href="${absSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`
	let URLAddAbsSub = `
		<a href="${addAbsSub}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" style="text-decoration: none;" target="_blank">
			Download
		</a>
	`

	submitRow.innerHTML = `
		<td>${rowNo}</td>
		<td>${teamName}</td>
		<td>${univ}</td>
		<td>${status ? lastSubmit.toDate().toLocaleString() : "No Data"}</td>
		<td>${status ? overdue : "No Data"}</td>
		<td>${status ? URLSubmit : "No Data"}</td>
		<td>${absStat ? lastAbs.toDate().toLocaleString() : "No Data"}</td>
		<td>${absStat ? overdueModel : "No Data"}</td>
		<td>${absStat ? URLAbsSub : "No Data"}</td>
		<td>${addAbsStat ? lastAddAbs.toDate().toLocaleString() : "No Data"}</td>
		<td>${addAbsStat ? overdueppt : "No Data"}</td>
		<td>${addAbsStat ? URLAddAbsSub : "No Data"}</td>
	`
	table.append(submitRow)
}

onSnapshot(Submission_Status, (snap) => {
	let submissionDocs = snap.docs
	let currentCompe = submissionDocs.filter(doc => doc.data().competition === switchCompetition)
	let currentCompeFinal = currentCompe.filter(doc => doc.data().final === true)
	
	submissionTablePrelim.innerHTML = ''
	submissionTableFinal.innerHTML = ''

	if (isPODC) {
		currentCompe.forEach((compe, index) => {
			let data = compe.data()
			createPODCSubmissionTable(
				submissionTablePrelim,
				compe.id,
				index+1,
				data.team_name,
				data.university,
				data.sub_preliminary.fileURL,
				data.sub_preliminary.status,
				data.sub_preliminary.overdue,
				data.sub_preliminary.submittedAt,
				data.final,
				data.sub_abstract.fileURL,
				data.sub_add_abstract.fileURL,
				data.sub_abstract.status,
				data.sub_add_abstract.status,
				data.sub_abstract.submittedAt,
				data.sub_add_abstract.submittedAt
			)
		})
		currentCompeFinal.forEach((compe, index) => {
			let data = compe.data()
			createFinalPODCSubmissionTable(
				submissionTableFinal,
				compe.id,
				index+1,
				data.team_name,
				data.university,
				data.sub_final?.fileURL,
				data.sub_final?.status,
				data.sub_final?.overdue,
				data.sub_final_model?.overdue,
				data.sub_final_ppt?.overdue,
				data.sub_final?.submittedAt,
				data.sub_final_model?.fileURL,
				data.sub_final_ppt?.fileURL,
				data.sub_final_model?.status,
				data.sub_final_ppt?.status,
				data.sub_final_model?.submittedAt,
				data.sub_final_ppt?.submittedAt
			)
		})
	} else {
		currentCompe.forEach((compe, index) => {
			let data = compe.data()
			createSubmissionTable(
				submissionTablePrelim,
				compe.id,
				index+1, 
				data.team_name,
				data.university,
				data.sub_preliminary.fileURL,
				data.sub_preliminary.status,
				data.sub_preliminary.overdue,
				data.sub_preliminary.submittedAt,
				data.final
			)
		})
		currentCompeFinal.forEach((compe, index) => {
			let data = compe.data()
			createFinalSubmissionTable(
				submissionTableFinal,
				compe.id,
				index+1, 
				data.team_name,
				data.university,
				data.sub_final?.fileURL || false,
				data.sub_final?.status || false,
				data.sub_final?.overdue || false,
				data.sub_final?.submittedAt || false
			)
		})
	}

	

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

// Case Distribution Section
const caseStorageCollection = {
	"BCC": "TKNSFPMRQ6GGLdVurLCv",
	"GDPC": "u5XFl4812coW1J6yMqrm",
	"MIC": "pHlZbe6UyXpKpO35LInb",
	"ORDC": "yRP8ZxRSXbIlJx0vcoO3",
	"PODC": "G9gLvFCkxiviK2UDc5qX",
	"PPC": "BzdUKfPbIbyRYlLJmk1c",
	"WDC": "YgdwqPY6IIhqSDY45UMH",
	"Hackathon": "6gRhBNQ5yjBMg1tbK66d"
}

const caseStorage = ref(STORAGE, 'Case')

const prelimCaseDist = document.getElementById("prelim-case-distribution")
const caseInput = prelimCaseDist.querySelector("input")
const deletePrelimCaseFile = document.getElementById("delete-file-case-prelim")

deletePrelimCaseFile.addEventListener("click", () => { caseInput.value = '' })

prelimCaseDist.addEventListener("submit", (e) => {
	e.preventDefault()

	prelimCaseDist.querySelectorAll("button")[1].textContent = 'Processing...'
	prelimCaseDist.querySelectorAll("button")[1].disabled = true

	try{
		const file = caseInput.files[0]
		const folderRef = ref(caseStorage, switchCompetition)
		const fileRef = ref(folderRef, `${file.name}`)

		uploadBytes(fileRef, file).then((snap) => {
			return getDownloadURL(snap.ref)
		})
		.then((downloadURL) => {
			return updateDoc(doc(DB, 'Information', caseStorageCollection[switchCompetition]), {
				prelim_case_link: downloadURL,
				sent_on: serverTimestamp()
			})
		})
		.then(() => {
			alert("Success sending the file")
			prelimCaseDist.querySelectorAll("button")[1].textContent = 'Send'
			prelimCaseDist.querySelectorAll("button")[1].disabled = false
		})
		.catch((err) => {
			console.log("There is error during sending case file", err.message)
			alert("[ERROR-1N] Cannot sending case file!")
			prelimCaseDist.querySelectorAll("button")[1].textContent = 'Send'
			prelimCaseDist.querySelectorAll("button")[1].disabled = false
		})
	} catch (err) {
		console.log("Error during uploading case file", err.message)
		alert("[ERROR-0UT] Cannot sending case file!")
		prelimCaseDist.querySelectorAll("button")[1].textContent = 'Send'
		prelimCaseDist.querySelectorAll("button")[1].disabled = false
	}
})

const finalCaseDist = document.getElementById("final-case-distribution")
const finalCaseInput = finalCaseDist.querySelector("input")
const deleteFinalCaseFile = document.getElementById("delete-file-case-final")

deleteFinalCaseFile.addEventListener("click", () => { finalCaseInput.value = '' })

finalCaseDist.addEventListener("submit", (e) => {
	e.preventDefault()

	finalCaseDist.querySelectorAll("button")[1].textContent = 'Processing...'
	finalCaseDist.querySelectorAll("button")[1].disabled = true

	try{
		const file = finalCaseInput.files[0]
		const folderRef = ref(caseStorage, switchCompetition)
		const fileRef = ref(folderRef, `${file.name}`)

		uploadBytes(fileRef, file).then((snap) => {
			return getDownloadURL(snap.ref)
		})
		.then((downloadURL) => {
			return updateDoc(doc(DB, 'Information', caseStorageCollection[switchCompetition]), {
				final_case_link: downloadURL,
				sent_on: serverTimestamp()
			})
		})
		.then(() => {
			alert("Success sending the file")
		})
		.catch((err) => {
			console.log("There is error during sending case file", err.message)
			alert("[ERROR-1N] Cannot sending case file!")
		})
	} catch (err) {
		console.log("Error during uploading case file", err.message)
		alert("[ERROR-0UT] Cannot sending case file!")
	} finally {
		finalCaseDist.querySelectorAll("button")[1].textContent = 'Send'
		finalCaseDist.querySelectorAll("button")[1].disabled = false
	}	
})

// Sign out user
const logoutBtn = document.querySelector("#logout-btn")

logoutBtn.addEventListener('click', () => {
	signOut(AUTH).then(() => {
		console.log("log out btn clicked")
		window.location.href = '../login.html'
	})
	.catch((err) => {
		console.log("Cannot loggin out user", err)
	})
})