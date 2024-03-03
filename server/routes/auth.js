const express = require('express')
const router = express.Router()
const { RedirectSpotify, AuthSpotify, RefreshSpotify } = require('../controllers/auth.js')

router.get('/spotify-redirect', RedirectSpotify)
router.get('/spotify-auth', AuthSpotify)
router.get('/spotify-refresh', RefreshSpotify)

module.exports = router