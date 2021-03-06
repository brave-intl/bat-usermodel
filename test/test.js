'use strict'

/* global describe, it */

const assert = require('assert')
const um = require('../index')
const predictions = um.wrappedJSONReadSync('./test//data/predictions.json').data

const matrix = um.getMatrixDataSync()
const priorvecs = um.getPriorDataSync()
const notificationWeights = um.getNotificationsModel()
const adsRelevanceWeights = um.getAdsRelevanceModel()

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

describe('Check Logistic Regression', function () {
  it('Notification Model returns scores', function () {
    const featureVector1 = new Map()
    featureVector1.set('test1', 0.1)
    featureVector1.set('test2', 0.3)

    assert.strictEqual(um.logisticRegression(featureVector1, notificationWeights), 0.6547534606063192)

    const featureVector2 = new Map()
    featureVector2.set('short_term_category_match', 0.1)
    featureVector2.set('winning_over_time_match', 0.3)

    assert.strictEqual(um.logisticRegression(featureVector2, adsRelevanceWeights), 0.5866175789173301)
  })

  it('Exception is thrown when intercept is overwritten', function () {
    const featureVector = new Map()
    featureVector.set(0, 123)
    featureVector.set('test1', 0.1)
    featureVector.set('test2', 0.3)

    assert.throws(function () {
      um.logisticRegression(featureVector, notificationWeights)
    }, Error)
  })

  it('Exception is thrown when feature vector is not a map', function () {
    const featureVector = {}

    assert.throws(function () {
      um.logisticRegression(featureVector, notificationWeights)
    }, Error)
  })
})
