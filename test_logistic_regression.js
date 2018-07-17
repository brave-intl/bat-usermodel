var um = require('.')

let localInfo = um.getLocaleInfo();

const featureVector = {
    "test1": 0.1,
    "test2": 0.3
}

console.log(um.notificationScore(
    featureVector,
    um.getNotificationsModel('default', localInfo['path'])
))