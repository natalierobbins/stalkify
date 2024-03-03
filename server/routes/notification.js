const express = require('express')
const { getNotificationsById } = require('../controllers/notification')
const router = express.Router()

router.get('/get', getNotificationsById)

module.exports = router