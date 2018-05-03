const fs = require('fs')
const path = require('path')

const locale = require('locale')
const stemmer = require('porter-stemmer').stemmer

const minimumWordsToClassify = 20
const maximumWordsToClassify = 1234

const defaultCode = 'default'
const defaultPath = path.join(__dirname, 'locales')

let localeCode
let localeCodes
let localesPath

function setLocale (newCode, newPath) {
  const newCodes = []

  if (newCode) {
    if (!newPath) {
      if (newCodes.indexOf(newCode) === -1) throw new Error(localesPath + ': no such locale as ' + newCode)
      return
    }
  } else {
    if (!newPath) return

    newCode = localeCode
  }

  if ((!newCode) && (!newPath)) return

  fs.readdirSync(newPath).forEach((entry) => {
    const name = path.join(newPath, entry)

    if (fs.statSync(name).isDirectory()) newCodes.push(entry)
  })

  newCode = (new locale.Locales(newCode).best(new locale.Locales(newCodes, 'default'))).toString()
  if (newCodes.indexOf(newCode) === -1) throw new Error(newPath + ': no such locale as ' + newCode)

  localeCode = newCode
  localeCodes = newCodes
  localesPath = newPath
}
setLocale(defaultCode, defaultPath)

// note prior also contains the ordered class names
function priorFileLocation (locale, rootPath) {
  setLocale(locale, rootPath)

  return path.join(localesPath, localeCode, 'prior')
}

// log prob word weighted on classes
function matrixFileLocation (locale, rootPath) {
  setLocale(locale, rootPath)

  return path.join(localesPath, localeCode, 'logPwGc')
}

function getPriorDataSync (locale, rootPath) {
  return wrappedJSONReadSync(priorFileLocation(locale, rootPath))
}

function getMatrixDataSync (locale, rootPath) {
  return wrappedJSONReadSync(matrixFileLocation(locale, rootPath))
}

function wrappedJSONReadSync (filepath, comment = '') {
  const files = [ filepath, filepath + '.js', filepath + '.json' ]

  for (let file of files) {
    try {
      fs.statSync(file)
      filepath = file
      break
    } catch (ex) {
    }
  }

  const f = {
    js: () => { return require(filepath) },

    json: () => { return JSON.parse(fs.readFileSync(filepath)) }
  }[path.extname(filepath).substr(1) || 'json']
  if (!f) throw new Error('unrecognized file: ' + filepath)

  try {
    return f()
  } catch (ex) {
    console.log(filepath + ': ' + ex.toString)
  }
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

function stemWords (words) {
  // 2018.01.12 scott: mvp should use lower-case
  return words.map(w => stemmer(w.toLowerCase()))
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
  return JSON.parse(fs.readFileSync(path.join(__dirname, '/sample-ads/bat-ads-feed.json')))
}

module.exports = {
// constants (not really sure why these are here)
  minimumWordsToClassify: minimumWordsToClassify,
  maximumWordsToClassify: maximumWordsToClassify,

// read files
  setLocale: setLocale,
  priorFileLocation: priorFileLocation,
  matrixFileLocation: matrixFileLocation,
  getPriorDataSync: getPriorDataSync,
  getMatrixDataSync: getMatrixDataSync,
  wrappedJSONReadSync: wrappedJSONReadSync,

  textBlobIntoWordVec: textBlobIntoWordVec,
  processWordsFromHTML: processWordsFromHTML,

  vectorIndexOfMax: vectorIndexOfMax,
  deriveCategoryScores: deriveCategoryScores,
  NBWordVec: NBWordVec,

  testRun: testRun,
  getSampleAdFiles: getSampleAdFiles,
  getSampleAdFeed: getSampleAdFeed
}
