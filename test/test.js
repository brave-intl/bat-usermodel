'use strict'

/* global describe, it */

const assert = require('assert')
const um = require('../index')
const predictions = um.wrappedJSONReadSync('./test//data/predictions.json').data

const matrix = um.getMatrixDataSync()
const priorvecs = um.getPriorDataSync()

function itTestNB (i) {
  const label = predictions[i].label
  const file = predictions[i].doc

  it(`Prediction test ${i}: File ${file}`, function () {
    const words = um.textBlobIntoWordVec('./test/data/' + file)
    const pred = um.testRun(words, matrix, priorvecs)
    assert.strictEqual(pred, label, `Failing for file: ${file}`)
  })
}

describe('Check NB predictions', function () {
  describe('main()', function () {
    for (let i = 0; i < predictions.length; i++) {
      itTestNB(i)
    }
  })
})
