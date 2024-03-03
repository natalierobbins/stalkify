const express = require('express')
const router = express.Router()
const { initTarget, sendTrackChangeNotifications, getTargetNotification, stalk, getAllTargets } = require('../controllers/target')
const { getTargetData, getTargetPlaylists, getTargetSnapshots, getTargetSnapshotChanges,
    getPlaylistTrackChanges, getTargetPlaylist } = require('../middleware/target')
const { getResponse } = require('../middleware/helper')

router.get('/all', getAllTargets)
router.get('/:target_id/stalk', getTargetData, stalk)
router.get('/:stalker_id/target/:target_id', initTarget)
router.get('/:target_id', 
    getTargetData, 
    getResponse)
router.get('/:target_id/playlists', 
    getTargetData, getTargetPlaylists, 
    getResponse)
router.get('/:target_id/:playlist_id/snapshots', 
    getTargetData, getTargetPlaylists, getTargetSnapshots, 
    getResponse)
router.get('/:target_id/:playlist_id/changes', 
    getTargetData, getTargetPlaylists, getTargetSnapshots, getTargetSnapshotChanges,
    getResponse)
router.get('/:target_id/:playlist_id/track-changes', 
    getTargetData, getTargetPlaylist, getPlaylistTrackChanges,
    getResponse)
router.get('/:target_id/:playlist_id/notifs/track-changes', 
    getTargetData, getTargetPlaylist, getPlaylistTrackChanges,
    sendTrackChangeNotifications)
router.get('/:target_id/notif/:notif_id', getTargetNotification)
router.get('/:target_id/:playlist_id', 
    getTargetData, getTargetPlaylist,
    getResponse)

module.exports = router