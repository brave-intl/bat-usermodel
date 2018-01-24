const fs = require('fs')
const util = require('util')
const stemmer = require('porter-stemmer').stemmer

const maxWords = 1234 // seems reasonable
const maxRowsInPageScoreHistory = 4
const visitsToSimulate = 3

let naiveBayesPriors                    // vector values in prior.json
let naiveBayesMatrix
let inMemoryPageScoreHistory

let priorFileLocation = './prior.json'     // note prior also contains the ordered class names
let matrixFileLocation = './logPwGc.json'    // log prob word weighted on classes
let historyFileLocation = 'history'  // TODO


// ##################################################################
// TODO These functions/globals are scaffolding which can probably be removed from 
// a deployed node package. Some are appropriate for api/usermodel.js

// TODO: we should extract the categories from the matrix data file
// TODO: we should probably also dupe them into the history file for cross-verification
let browsingCategories = ['lawncare', 'curling', 'baseball'] // TODO This can be obtained as keys for priorFileLocation JSON file.

let fullyLoadedAnyDiskHistory = false
let fullyLoadedNaiveBayesMatrix = false
let fullyLoadedAssetsForAdSystem = false


// TODO Wat dis? -SCL
function o (x, depth = null) {
  let one = 1
  if (one === 0) {
    log(x)
  }
  return util.inspect(x, {depth: depth})
}

function log (x) {
  let prefix = 'OUT: '

  let s = ''

  for (let i = 0; i < arguments.length; i++) {
    let arg = arguments[i]

    s += o(arg)

    if (i < arguments.length - 1) {
      s += ', '
    }
  }

  console.log(prefix + s)
}

function main () {
  simulateOverall()
}


function shouldShowAd () {
  // TODO rules
  return true
}

function pushAdByCategory (category) {
  // TODO integrate with browser
  console.log('Pushing ad category: ' + category)
}
function loadNaiveBayesMatrixSync () {
  // indexed on column (stem) for quick lookup
  // vector width == |browsingCategories|. implicitly indexed
  naiveBayesMatrix = wrappedJSONReadSync(matrixFileLocation, 'ad naive bayes matrix')

  if (!naiveBayesMatrix) {
    // TODO remove this - an error is more appropriate
    naiveBayesMatrix = {'mower': [0.9, 0.0, 0.1], 'push': [0.2, 0.5, 0.2], 'grass': [0.8, 0.0, 0.4]}
  }

  fullyLoadedNaiveBayesMatrix = true
}

function getHtml () {
  return ' <html><body><h1>All About Dem Mowers</h2><p>There are two kinds of mower: Push Lawnmowers and Riding or Driving Lawnmowers. There are two</body> </html> '
}

function wordsFromHtml (html) {
  let fake = ['All', 'About', 'Dem', 'Mowers', 'There', 'are', 'two', 'kinds',
    'of', 'mower', 'Push', 'Lawnmowers', 'and', 'Riding', 'or', 'Driving',
    'Lawnmowers', 'There', 'are', 'two'
  ]
  let truncated = fake.slice(0, maxWords)
  return truncated
}

function simulateSingleVisit () {
  let html = getHtml()

  let words = wordsFromHtml(html)  // NOTE I assume this guy removes extraneous html from DOM scrape -SCL
  let stems = stemWords(words)
  let roll = rollUpStringsWithCount(stems)
  let pageScore = scoreCountedStems(naiveBayesMatrix, naiveBayesPriors, roll)

  addPageScoreToHistorical(pageScore)
  let historical = getHistoricalPageScores()

  let catScore = deriveCategoryScore(historical)
  let maxCategoryIndex = vectorIndexOfMax(catScore)
  let maxCategory = browsingCategories[maxCategoryIndex]

  console.log('browsingCategories: ' + o(browsingCategories))
  // console.log('matrix: ' + o(naiveBayesMatrix))
  // console.log('html: ' + o(html))
  // console.log('words: ' + o(words))
  // console.log('stems: ' + o(stems))
  // console.log('roll: ' + o(roll))
  // console.log('pageScore' + o(pageScore))
  console.log('historical' + o(historical))
  // console.log('catScore' + o(catScore))

  let doAd = shouldShowAd()

  if (doAd) {
    pushAdByCategory(maxCategory)
  }

  console.log()
}

function simulateOverall () {
  loadAssetsForAdSystemSync()

  if (!fullyLoadedAssetsForAdSystem) {
    return
  }

  for (let i = 0; i < visitsToSimulate; i++) {
    console.log('Visit: ' + (i + 1) + '/' + visitsToSimulate)
    simulateSingleVisit()
  }

  persistAnyDiskHistorySync()
}

function getHistoricalPageScores () {
  return inMemoryPageScoreHistory
}

function addPageScoreToHistorical (pageScore) {
  
  if (!inMemoryPageScoreHistory) {
    console.log('Could not add page to historical record: !inMemoryPageScoreHistory')
    return
  }

  inMemoryPageScoreHistory.push(pageScore)

  let n = inMemoryPageScoreHistory.length

  // this is the "rolling window"
  // in general, this is triggered w/ probability 1
  if (n > maxRowsInPageScoreHistory) {
    let diff = n - maxRowsInPageScoreHistory

    inMemoryPageScoreHistory = inMemoryPageScoreHistory.slice(diff)
  }

  return inMemoryPageScoreHistory
}


function loadAssetsForAdSystemSync () {
  // we group these together, for one, because their schemas are interlocked
  // TODO they both need versioning
  loadNaiveBayesMatrixSync()
  loadAnyDiskHistorySync()

  if (!fullyLoadedNaiveBayesMatrix) {
    return
  }

  if (!fullyLoadedAnyDiskHistory) {
    return
  }

  fullyLoadedAssetsForAdSystem = true
}

function loadAnyDiskHistorySync () {
  inMemoryPageScoreHistory = wrappedJSONReadSync(historyFileLocation, 'ad history')

  if (!inMemoryPageScoreHistory) {
    inMemoryPageScoreHistory = []
  }

  fullyLoadedAnyDiskHistory = true
}

function persistAnyDiskHistorySync () {
  let historyData = JSON.stringify(inMemoryPageScoreHistory)

  fs.writeFileSync(historyFileLocation, historyData, (err) => {
    if (err) throw err
  })
}

// END TODO REMOVES
// Hey Lawler; I will let you prune this; pretty sure it is all for 
// api/usermodel.js and makes no sense without the globals that can be found 
// there -SCL
// ########################################################


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


// note this one is possibly only for testing purposes; though may be part of 
// the HTML cleaner later; the scraper in browser-laptop already exports as
// string array -SCL
function textBlobIntoWordVec (file) {
  var longstring = String(fs.readFileSync(file))
  longstring = longstring.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ")
  longstring = longstring.toLowerCase()
  return longstring.split(' ') // don't run .slice(0,maxwords) yet
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
  let n  = v.length
  let z = Array(n)
  let maxval = -1 * Math.max.apply(null,v)
  for (let i = 0; i < n; i++) {
    z[i] = v[i] + maxval
  }
  return normalizeL1(vectorExp(z)) 
  return z
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
  let loglik = logLikCalc(matrix,roll) // separated for future use 
  let logpostlik = vectorAdd(loglik, prior)  // log post likelihood; may kill this eventually
  let prob = logLikToProb(logpostlik)     
  return prob
}

function vectorIndexOfMax (v) {
  return v.indexOf(Math.max(...v))
}

function deriveCategoryScore (historical) {
  let w = getArrayMatrixWidth(historical)

  let v = getZeroesVector(w)

  for (let i = 0; i < historical.length; i++) {
    v = vectorAdd(v, historical[i])
  }

  return v
}


// GLOBAL DEC
let nbmatrix = wrappedJSONReadSync(matrixFileLocation) // faster if packaged -tell me if I'm wrong -SCL
let priorvecs = wrappedJSONReadSync(priorFileLocation) // 

function NBWordVec(wordVec) {
  let stems = stemWords(wordVec)
  let roll = rollUpStringsWithCount(stems)// 7.3ms
  return scoreCountedStems(matrix, priorvecs['priors'], roll) // 80ms
}


function fullStackRun(file) {
  let words = textBlobIntoWordVec(file)
  return NBWordVec(words)
}


function testRun(words, matrix, priorvecs) {
  let clasnames = priorvecs['names']
  let prior = priorvecs['priors']
  let stems = stemWords(words) 
  let roll = rollUpStringsWithCount(stems)
  let pageScore = scoreCountedStems(matrix, prior, roll)
  let  classout = clasnames[vectorIndexOfMax(pageScore)]
  return classout
}




module.exports = {
    nbmatrix : nbmatrix,
    priorvecs : priorvecs,
    wrappedJSONReadSync : wrappedJSONReadSync,
    textBlobIntoWordVec : textBlobIntoWordVec,
    testRun : testRun,
    NBWordVec : NBWordVec
}

