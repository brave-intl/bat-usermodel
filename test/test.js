'use strict'

var expect = require('chai').expect

var um = require('../index')

var predictions = um.wrappedJSONReadSync('../data/predictions.json')
var matrix = um.wrappedJSONReadSync('../logPwGc.json')
var priorvecs = um.wrappedJSONReadSync('../prior.json')

function itTestNB (i) {
  it(('prediction test ' + i), function () {
    var label = predictions['label'][i]
    var file = predictions['doc'][i]
    var words = um.textBlobIntoWordVec(file)
    var pred = um.testRun(words, matrix, priorvecs)
    expect(pred).to.eql(label)
  })
}

describe('BAT Usermodel', function () {
  describe('Trivial', function () {
    it('show ad stub', function () {
      expect(um.shouldShowAd()).to.equal(true)
    })
  })
})

describe('Check NB predictions', function () {
  describe('main()', function () {
    for (var i = 0; i < 3; i++) {
      itTestNB(i)
    }
  })
})
