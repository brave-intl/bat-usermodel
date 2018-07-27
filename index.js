const fs = require('fs')
const path = require('path')

const locale = require('locale')
const stemmer = require('porter-stemmer').stemmer

const minimumWordsToClassify = 20
const maximumWordsToClassify = 1234

let defaultCode = 'default'
const defaultPath = path.join(__dirname, 'locales')

let localeInfo = [ undefined, undefined, undefined ]

try {
  const parts = path.parse(fs.readlinkSync(path.join(defaultPath, defaultCode)))

  defaultCode = parts.dir ? 'en' : parts.name
} catch (ex) {
  defaultCode = 'en'
}

function getLocaleInfo () {
  return { locale: localeInfo[0], locales: localeInfo[1], path: localeInfo[2] }
}

function getLocalesSync (newPath) {
  const currentInfo = localeInfo.slice(0)
  let result

  if ((!newPath) || (newPath === localeInfo[2])) return localeInfo[1].slice(0)

  result = setLocaleSync(newPath)

  localeInfo = currentInfo

  return result
}

function setLocaleSync (newCode, newPath) {
  const newCodes = []

  if (newCode) {
    if (newCode === 'default') newCode = defaultCode

    if (!newPath) {
      if (localeInfo[1].indexOf(newCode) === -1) throw new Error(localeInfo[2] + ': no such locale as ' + newCode)
      localeInfo.splice(0, 1, newCode)

      return localeInfo[0]
    }
  } else {
    if (!newPath) return localeInfo[0]

    newCode = localeInfo[0]
  }

  fs.readdirSync(newPath).forEach((entry) => {
    if ((entry === defaultCode) || (entry === 'default')) return

    const name = path.join(newPath, entry)

    if (fs.statSync(name).isDirectory()) newCodes.push(entry)
  })

  newCodes.sort()
  if (fs.statSync(path.join(newPath, defaultCode)).isDirectory()) newCodes.splice(0, 0, defaultCode)

  newCode = (new locale.Locales(newCode).best(new locale.Locales(newCodes, defaultCode))).toString()
  if (newCodes.indexOf(newCode) === -1) throw new Error(newPath + ': no such locale as ' + newCode)

  localeInfo = [ newCode, newCodes, newPath ]

  return localeInfo[0]
}
setLocaleSync(defaultCode, defaultPath)

// note prior also contains the ordered class names
function priorFileLocation (locale, rootPath) {
  setLocaleSync(locale, rootPath)

  return path.join(localeInfo[2], localeInfo[0], 'prior')
}

// log prob word weighted on classes
function matrixFileLocation (locale, rootPath) {
  setLocaleSync(locale, rootPath)

  return path.join(localeInfo[2], localeInfo[0], 'logPwGc')
}

function adsRelevanceModelLocation (locale, rootPath) {
  setLocaleSync(locale, rootPath)

  return path.join(localeInfo[2], localeInfo[0], 'adsRelevanceModel')
}

function notificationModelLocation (locale, rootPath) {
  setLocaleSync(locale, rootPath)

  return path.join(localeInfo[2], localeInfo[0], 'notificationModel')
}

function getPriorDataSync (locale, rootPath) {
  return wrappedJSONReadSync(priorFileLocation(locale, rootPath))
}

function getMatrixDataSync (locale, rootPath) {
  return wrappedJSONReadSync(matrixFileLocation(locale, rootPath))
}

function getAdsRelevanceModel (locale, rootPath) {
  const model = wrappedJSONReadSync(adsRelevanceModelLocation(locale, rootPath))

  if (model.names.length !== model.weights.length) {
    throw new Error('Model ' + rootPath + ' is not valid. Features don\'t match weights.')
  }

  // extract the weights
  let weights = {0: model.intercept}
  for (let i = 0; i < model.names.length; i++) {
    weights[model.names[i]] = model.weights[i]
  }

  return weights
}

function getNotificationsModel (locale, rootPath) {
  const model = wrappedJSONReadSync(notificationModelLocation(locale, rootPath))

  if (model.names.length !== model.weights.length) {
    throw new Error('Model ' + rootPath + ' is not valid. Features don\'t match weights.')
  }

  // extract the weights
  let weights = {0: model.intercept}
  for (let i = 0; i < model.names.length; i++) {
    weights[model.names[i]] = model.weights[i]
  }

  return weights
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
    console.log(filepath + ': ' + ex.toString())
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
  let logpostlik = vectorAdd(loglik, prior) // log post likelihood; may kill this eventually
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

function logisticRegression (featVec, weights) {
  if (!(featVec instanceof Map)) {
    throw new Error('featVec should be a Map')
  }

  if (featVec.has(0)) {
    throw new Error('You should not use 0 as feature name. This is reserved for intercept term of logistic regression.')
  }

  // simple logistic regression
  let sum = weights[0]
  for (let feature of featVec.keys()) {
    if (!(feature in weights)) {
      throw new Error('Feature ' + feature + ' is not part of the model.')
    }
    sum += featVec.get(feature) * weights[feature]
  }

  return 1.0 / (1.0 + Math.exp(-sum))
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

  // data files

  getLocaleInfo: getLocaleInfo,
  getLocalesSync: getLocalesSync,
  setLocaleSync: setLocaleSync,
  priorFileLocation: priorFileLocation,
  matrixFileLocation: matrixFileLocation,
  getPriorDataSync: getPriorDataSync,
  getMatrixDataSync: getMatrixDataSync,
  getNotificationsModel: getNotificationsModel,
  wrappedJSONReadSync: wrappedJSONReadSync,

  logisticRegression: logisticRegression,
  getAdsRelevanceModel: getAdsRelevanceModel,

  // analysis
  textBlobIntoWordVec: textBlobIntoWordVec,
  processWordsFromHTML: processWordsFromHTML,
  vectorIndexOfMax: vectorIndexOfMax,
  deriveCategoryScores: deriveCategoryScores,
  NBWordVec: NBWordVec,

  testRun: testRun,
  getSampleAdFiles: getSampleAdFiles,
  getSampleAdFeed: getSampleAdFeed
}
