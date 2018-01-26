'use strict'

var expect = require('chai').expect

var um = require('../index')

var predictions = um.wrappedJSONReadSync('./data/predictions.json')
var matrix = um.getMatrixDataSync()
var priorvecs = um.getPriorDataSync()

function itTestNB (i) {
  it(('prediction test ' + i), function () {
    var label = predictions['label'][i]
    var file = predictions['doc'][i]
    console.log(file)
    var words = um.textBlobIntoWordVec('./data/' + file)
    var pred = um.testRun(words, matrix, priorvecs)// um.NBWordVec(words) //
    expect(pred).to.eql(label)
  })
}

describe('Check NB predictions', function () {
  describe('main()', function () {
    for (var i = 0; i < predictions['doc'].length; i++) {
      itTestNB(i)
    }
  })
})
