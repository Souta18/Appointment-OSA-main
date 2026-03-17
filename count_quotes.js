import fs from 'fs'
const path = 'src/pages/AdminDashboard.jsx'
const s = fs.readFileSync(path, 'utf8')
const counts = { '"': 0, "'": 0, '`': 0 }
for (const c of s) { if (counts[c] !== undefined) counts[c]++ }
console.log('counts', counts)
// print last 200 characters for debugging
console.log('EOF snippet:', s.slice(-200))
const pairs = { '{': 0, '}': 0, '(': 0, ')': 0, '[': 0, ']': 0 }
for (const c of s) { if (pairs[c] !== undefined) pairs[c]++ }
console.log('pairs', pairs)
// find line where brace imbalance grows and remains
const lines = s.split(/\r?\n/)
let cum = 0
let max = { delta: 0, line: 0 }
for (let i = 0; i < lines.length; i++) {
	const line = lines[i]
	for (const ch of line) {
		if (ch === '{') cum++
		if (ch === '}') cum--
	}
	if (cum > max.delta) { max.delta = cum; max.line = i + 1 }
}
console.log('max brace delta', max)
// find earliest line after which cum never returns to 0
let cumArr = []
cum = 0
for (let i = 0; i < lines.length; i++) {
	const line = lines[i]
	for (const ch of line) {
		if (ch === '{') cum++
		if (ch === '}') cum--
	}
	cumArr.push(cum)
}
const final = cumArr[cumArr.length-1]
let earliestStay = -1
for (let i = 0; i < cumArr.length; i++) {
	if (cumArr[i] > 0) {
		let stays = true
		for (let j = i; j < cumArr.length; j++) { if (cumArr[j] === 0) { stays = false; break } }
		if (stays) { earliestStay = i+1; break }
	}
}
console.log('final cum', final, 'earliest line where it never returns to 0:', earliestStay)
