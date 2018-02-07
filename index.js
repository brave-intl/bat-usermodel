const fs = require('fs')
const stemmer = require('porter-stemmer').stemmer
const path = require('path')

const minimumWordsToClassify = 20
const maximumWordsToClassify = 1234

let priorFileLocation = path.join(__dirname, '/prior.json')    // note prior also contains the ordered class names
let matrixFileLocation = path.join(__dirname, '/logPwGc.json')  // log prob word weighted on classes

function getMatrixDataSync () {
  return wrappedJSONReadSync(matrixFileLocation)
}

function getPriorDataSync () {
  return wrappedJSONReadSync(priorFileLocation)
}

function wrappedJSONReadSync (filepath, comment = '') {
  let succeed = false
  let parsed

  try {
    let data = fs.readFileSync(filepath)
    try {
      parsed = JSON.parse(data)
      succeed = true
    } catch (err) {
      console.log('Error parsing ' + comment + ' file: ' + err)
    }
  } catch (err) {
    console.log('Error reading ' + comment + ' file: ' + err)
  }

  if (!succeed) {
    return undefined
  }

  return parsed
}

function textBlobIntoWordVec (file) {
  let longstring = String(fs.readFileSync(file))
  longstring = processWordsFromHTML(longstring)
  return longstring
}

function processWordsFromHTML (html, maxWords = -1) {
  html = html.replace(/[^\w\s]|_/g, '').replace(/\s+/g, ' ')
  html = html.toLowerCase()
  html = html.split(' ')
  if (maxWords <= 0) { // don't truncate
    maxWords = html.length
  }
  html = html.slice(0, maxWords)
  return html
}

function stemWords (words) {
  // 2018.01.12 scott: mvp should use lower-case
  return words.map(w => stemmer(w.toLowerCase()))
}

function rollUpStringsWithCount (strings) {
  let roll = {}

  for (let i = 0; i < strings.length; i++) {
    let s = strings[i]
    if (!roll[s]) {
      roll[s] = 1
    } else {
      roll[s] += 1
    }
  }

  return roll
}

function getKeyedMatrixWidth (matrix) {
  let width = 0

  for (let key in matrix) {
    width = matrix[key].length
    break
  }

  return width
}

function getArrayMatrixWidth (matrix) {
  let width = 0

  for (let i = 0; i < matrix.length; i++) {
    width = matrix[i].length
    break
  }

  return width
}

function getZeroesVector (width) {
  return Array(width).fill(0)
}

function scoreVectorFromStem (matrix, stem, count) {
    // if the lookup doesn't exist, then skip it or add zeroes vector
  let width = getKeyedMatrixWidth(matrix)
  let vector = getZeroesVector(width)

  let row = matrix[stem]
  if (row) {
    // [make a copy and] multiply times scalar count
    // POTENTIAL_OPTIMIZATION_POINT: in-place (grep `\.map`, do everywhere)
    vector = row.map(x => x * count)
  }

  return vector
}

function vectorAdd (x, y) {
  let n = x.length
  let z = Array(n)

  for (let i = 0; i < n; i++) {
    z[i] = x[i] + y[i]
  }

  return z
}

function vectorSum (v) {
  return v.reduce((x, y) => x + y)
}

function normalizeL1 (v) {
  let n = vectorSum(v)
  return v.map(x => x / n)
}

function logLikToProb (v) {
  let n = v.length
  let z = Array(n)
  let maxval = -1 * Math.max.apply(null, v)
  for (let i = 0; i < n; i++) {
    z[i] = v[i] + maxval
  }
  return normalizeL1(vectorExp(z))
}

function vectorExp (v) {
  return v.map(x => Math.exp(x))
}

// broken out for future use
function logLikCalc (matrix, roll) {
  // in: roll: {'alpha': 2, 'bravo': 1}

  // POTENTIAL_OPTIMIZATION_POINT: rewrite to use Map??

  let width = getKeyedMatrixWidth(matrix)
  let total = getZeroesVector(width)

  for (let stem in roll) {
    let count = roll[stem]
    let stemScore = scoreVectorFromStem(matrix, stem, count)

    total = vectorAdd(total, stemScore)
  }

  return total
}

//
function scoreCountedStems (matrix, prior, roll) {
  let loglik = logLikCalc(matrix, roll) // separated for future use
  let logpostlik = vectorAdd(loglik, prior)  // log post likelihood; may kill this eventually
  let prob = logLikToProb(logpostlik)
  return prob
}

function vectorIndexOfMax (v) {
  return v.indexOf(Math.max(...v))
}

function deriveCategoryScores (historical) {
  let w = getArrayMatrixWidth(historical)

  let v = getZeroesVector(w)

  for (let i = 0; i < historical.length; i++) {
    v = vectorAdd(v, historical[i])
  }

  return v
}

function NBWordVec (wordVec, matrix, priorvecs) {
  let stems = stemWords(wordVec)
  let roll = rollUpStringsWithCount(stems)// 7.3ms
  return scoreCountedStems(matrix, priorvecs['priors'], roll) // 80ms
}

function testRun (words, matrix, priorvecs) {
  let clasnames = priorvecs['names']
  let prior = priorvecs['priors']
  let stems = stemWords(words)
  let roll = rollUpStringsWithCount(stems)
  let pageScore = scoreCountedStems(matrix, prior, roll)
  let classout = clasnames[vectorIndexOfMax(pageScore)]
  return classout
}

function getSampleAdFiles () {
  let dirpath = path.join(__dirname, '/sample-ads/')

  let files = fs.readdirSync(dirpath)
  // remove hidden
  files = files.filter(x => !x.startsWith('.'))

  let fullpaths = files.map(x => path.join(dirpath, x))

  return fullpaths
}

function getSampleAdFeed () {
  let filepath = path.join(__dirname, '/sample-ads/bat-ads-feed.json')
  let feed = wrappedJSONReadSync(filepath)
  return feed
}

module.exports = {
  wrappedJSONReadSync: wrappedJSONReadSync,
  textBlobIntoWordVec: textBlobIntoWordVec,
  processWordsFromHTML: processWordsFromHTML,
  priorFileLocation: priorFileLocation,
  matrixFileLocation: matrixFileLocation,
  testRun: testRun,
  NBWordVec: NBWordVec,
  deriveCategoryScores: deriveCategoryScores,
  minimumWordsToClassify: minimumWordsToClassify,
  maximumWordsToClassify: maximumWordsToClassify,
  getMatrixDataSync: getMatrixDataSync,
  getPriorDataSync: getPriorDataSync,
  vectorIndexOfMax: vectorIndexOfMax,
  getSampleAdFiles: getSampleAdFiles,
  getSampleAdFeed: getSampleAdFeed
}
