const Target = require('../schema/target')
const { getNewSnapshots, getAll, getTrackIds } = require('../controllers/spotify')
const _ = require('lodash')

const getTargetData = async (req, res, next) => {

    const target_id = req.params.target_id

    console.log('getting target data: ' + target_id)

    try {
        const target = await Target.get(target_id)
        if (target) {
            req.response = target
            next()
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetPlaylists = async (req, res, next) => {

    console.log('getting playlist data: ' + req.params.target_id)

    try {
        const playlists = req.response.playlists
        if (playlists) {
            req.response = playlists
            next()
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetSnapshots = async (req, res, next) => {

    console.log('getting snapshots: ' + req.params.playlist_id)

    try {
        const playlists = req.response
        if (playlists) {
            var snapshots = {}
            Object.keys(playlists).forEach((key) => {
                snapshots[key] = playlists[key].snapshot_id
            })
            req.response = snapshots
            next()
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

// check for snapshot changes and playlist deletion/creation
const getTargetSnapshotChanges = async (req, res, next) => {

    console.log('getting snapshot changes: ' + req.params.playlist_id)

    try {
        const curr_snapshots = req.response
        const new_snapshots = await getNewSnapshots(req.params.target_id)

        if (curr_snapshots && new_snapshots) {
            var snapshotChanges = []
            for (var id of Object.keys(new_snapshots)) {
                if (curr_snapshots[id] && new_snapshots[id] && curr_snapshots[id] != new_snapshots[id]) {
                    snapshotChanges.push({
                        id: id,
                        snapshot_id: new_snapshots[id]
                    })
                }
            }

            var playlistChanges = getChanges(Object.keys(curr_snapshots), (Object.keys(new_snapshots)))
            const changes = {
                snapshots: snapshotChanges,
                playlists: playlistChanges
            }
            req.response = changes
            next()
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetPlaylist = async (req, res, next) => {
    try {
        console.log('getting playlist: ' + req.params.playlist_id)
        const playlist = req.response.playlists[req.params.playlist_id]
        req.response = playlist
        next()
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getChanges = (curr_items, new_items) => {
    var tracker = {}

    curr_items.forEach((item) => {
        if (Object.keys(tracker).includes(item)) {
            tracker[item][0] += 1
        }
        else {
            tracker[item] = [1, 0]
        }
    })

    new_items.forEach((item) => {
        if (Object.keys(tracker).includes(item)) {
            tracker[item][1] += 1
        }
        else {
            tracker[item] = [0, 1]
        }
    })

    tracker = _.pickBy(tracker, ((item) => {
        return item[0] != item[1]
    }))

    return tracker
}

const getPlaylistTrackChanges = async (req, res, next) => {
    try {
        console.log('retrieving current track list: ' + req.params.playlist_id)
        var curr_tracks = req.response
        console.log('retrieving new track list: ' + req.params.playlist_id)
        var new_tracks = await getAll('tracks', req.params.playlist_id)

        if (curr_tracks && new_tracks) {
            curr_tracks = curr_tracks.tracks
            new_tracks = getTrackIds(new_tracks)

            // var tracker = {}

            // curr_tracks.forEach((track) => {
            //     if (Object.keys(tracker).includes(track)) {
            //         tracker[track][0] += 1
            //     }
            //     else {
            //         tracker[track] = [1, 0]
            //     }
            // })

            // new_tracks.forEach((track) => {
            //     if (Object.keys(tracker).includes(track)) {
            //         tracker[track][1] += 1
            //     }
            //     else {
            //         tracker[track] = [0, 1]
            //     }
            // })

            // tracker = _.pickBy(tracker, ((item) => {
            //     return item[0] != item[1]
            // }))

            tracker = getChanges(curr_tracks, new_tracks)

            req.response = tracker
            next()
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

module.exports = { getTargetData, getTargetPlaylists, getTargetSnapshots, getTargetSnapshotChanges,
    getPlaylistTrackChanges, getTargetPlaylist, getChanges }