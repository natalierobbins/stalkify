const Target = require('../schema/target')
const { getAll, getNewSnapshots, getTracksMulti, generateTrackChangeNotifications } = require('./spotify')
const _ = require('lodash')
const ChangeTracker = require('../helpers/change')
const Playlist = require('../helpers/playlist')

const generateNotifications = async (type, changes, data=null) => {

    var notifs = []

    if (type == 'playlist') {

        Object.keys(changes).forEach((id) => {
            notifs.push({
                type: `playlist-${changes[id].type}`,
                playlist_id: id,
                playlist_name: changes[id].type == 'remove' ? data.curr_data[id].name : data.new_data[id].name
            })
        })
    }
    else if (type == 'track') {
        const tracks = await getTracksMulti(Object.keys(changes))
        tracks.tracks.forEach((track) => {
            notifs.push({
                type: `track-${changes[track.id].type}`,
                playlist_id: data.playlist.spotify_id,
                playlist_name: data.playlist.name,
                track_id: track.id,
                track_name: track.name,
                track_album: track.album.name,
                track_artist: track.artists[0].name,
                track_album_art: track.album.images[0].url
            })
        })
    }
    else if (type == 'name') {
        for (const id of changes) {
            notifs.push({
                type: 'name-modify',
                playlist_id: id,
                playlist_name: data.new_data[id].name,
                old: data.curr_data[id].name,
                new: data.new_data[id].name
            })
        }
    }
    else if (type == 'desc') {
        for (const id of changes) {
            notifs.push({
                type: 'desc-modify',
                playlist_id: id,
                playlist_name: data.new_data[id].name,
                old: data.curr_data[id].desc,
                new: data.new_data[id].desc
            })
        }
    }

    return notifs
}

const getAllTargets = async (req, res) => {
    try {
        const response = await Target.getAllTargets()
        if (response) {
            res.status(200).json({response})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const simplifyPlaylistData = (playlists) => {

    var simplified = {}

    playlists.forEach((playlist) => {
        var simplified_playlist = new Playlist(playlist)
        simplified[playlist.id] = simplified_playlist.get()
    })

    return simplified
}

const getTrackIds = (tracks) => {
    var track_ids = []
    tracks.forEach((track) => {
        // handle null tracks that are now unavailable
        if (track.track) {
            track_ids.push(track.track.id)
        }
    })

    return track_ids
}

const stalk = async (req, res) => {

    const { access_token } = req.query
    
    if (access_token != undefined) {
        const { user } = req.query
        console.log('STALKING ON BEHALF OF: ' + user)
    }

    try {

        const start = Date.now()

        const target = {
            id: req.response.spotify_id,
            name: req.response.name,
            stalkers: req.response.stalkers
        }

        console.log('... pulling curr + new playlist data')

        const curr_playlists = req.response.playlists
        var new_playlists = await getAll('playlists', target.id, access_token)

        console.log('...... simplifying new playlist data')
        new_playlists = simplifyPlaylistData(new_playlists)

        var response = {
            playlist_add_removes: [],
            desc_changes: [],
            name_changes: [],
            track_add_removes: []
        }

        console.log('... checking for playlist + snapshot updates')

        const playlist_changes = new ChangeTracker(curr_playlists, new_playlists)
        const playlists = playlist_changes.addRemove()
        const snapshots = playlist_changes.modified('snapshot_id')

        console.log('playlists:', playlists)
        console.log('snapshots:', snapshots)

        // if newly added or deleted playlists
        if (Object.keys(playlists).length) {
            console.log('... playlist updates detected')
            response.playlist_add_removes = await generateNotifications(
                'playlist', 
                playlists,
                {
                    curr_data: curr_playlists, 
                    new_data: new_playlists
                }
            )
        }

        // if newly modified playlists
        if (snapshots.length) {
            console.log('... snapshot updates detected')
            const desc_changes = playlist_changes.modified('desc')
            const name_changes = playlist_changes.modified('name')

            if (desc_changes.length) {
                response.desc_changes = await generateNotifications(
                    'desc', 
                    desc_changes, 
                    {
                        curr_data: curr_playlists, 
                        new_data: new_playlists
                    }
                )
            }

            if (name_changes.length) {
                response.name_changes = await generateNotifications(
                    'name', 
                    name_changes, 
                    {
                        curr_data: curr_playlists, 
                        new_data: new_playlists
                    }
                )
            }

            for (const id of snapshots) {
                const curr_track_ids = curr_playlists[id].tracks
                const new_tracks = await getAll('tracks', id, access_token)
                const new_track_ids = getTrackIds(new_tracks)

                const track_changes = new ChangeTracker(curr_track_ids, new_track_ids)
                const tracks = track_changes.addRemove()

                if (Object.keys(tracks).length) {
                    response.track_add_removes = await generateNotifications(
                        'track',
                        tracks,
                        {
                            playlist: new_playlists[id]
                        }
                    )
                }
                
            }
        }

        console.log('... sending notifications to target')
        response = await Target.notify(target.id, target.name, 
            [
                ...response.playlist_add_removes,
                ...response.desc_changes,
                ...response.name_changes,
                ...response.track_add_removes
            ],
            new_playlists
        )

        // make sure each target takes at least 60 seconds if anonymous --
        // or 10 seconds if made by specific user
        // limits it to 6 targets per min, budgeting 30 api calls per stalk
        // 1+ api calls for getting new playlist data
        // 1+ api call per changed snapshot
        // 1+ api call per new/deleted playlist
        // NOT SCALABLE AT ALL BTW LOLOLOL
        const end = Date.now()
        const padding = Math.max(0, (access_token != undefined ? 10000 : 60000) - (end - start))
        await new Promise(resolve => setTimeout(resolve, padding))

        res.status(200).json(response)
    }
    catch (error) {
        res.status(400).json({error: `Error during stalk(): ${error.message}`})
    }

}

const initTarget = async (req, res) => {

    const target_id = req.params.target_id
    const stalker_id = req.params.stalker_id

    try {
        const targetDoc = await Target.init(stalker_id, target_id)
        if (targetDoc) {
            res.status(200).json({targetDoc})
        }
        else {
            res.status(400).json({error: 'User does not exist'})
        }
    } catch (error) {
        res.status(400).json({error: error.message})
    }

}

const getTargetPlaylists = async (req, res) => {

    try {
        const target = req.target
        if (target) {
            res.status(200).json({playlists: target.playlists})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetSnapshots = async (req, res) => {

    try {
        const playlists = await getTargetPlaylists(req, res)
        var snapshots = {}
        Object.keys(playlists).forEach((key) => {
            snapshots[key] = playlists[key].snapshot_id
        })
        if (playlists) {
            res.status(200).json({snapshots})
            return snapshots
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetSnapshotChanges = async (req, res) => {
    try {
        const curr_snapshots = await getTargetSnapshots(req, res)
        const new_snapshots = await getNewSnapshots(req.params.id)
        var changes = []
        for (var id of Object.keys(new_snapshots)) {
            if (curr_snapshots[id] && new_snapshots[id] && curr_snapshots[id] != new_snapshots[id]) {
                changes.push({id: id, snapshot_id: new_snapshots[id]})
            }
        }

        return changes
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getPlaylistTrackChanges = async (req, res) => {
    try {
        console.log('retrieving current track list')
        var curr_tracks = await getTargetPlaylist(req, res)
        console.log('retrieving new track list')
        var new_tracks = await getAll('tracks', req.params.playlist)

        curr_tracks = curr_tracks.tracks
        new_tracks = getTrackIds(new_tracks)

        var tracker = {}

        curr_tracks.forEach((track) => {
            if (Object.keys(tracker).includes(track)) {
                tracker[track][0] += 1
            }
            else {
                tracker[track] = [1, 0]
            }
        })

        new_tracks.forEach((track) => {
            if (Object.keys(tracker).includes(track)) {
                tracker[track][1] += 1
            }
            else {
                tracker[track] = [0, 1]
            }
        })

        tracker = _.pickBy(tracker, ((item) => {
            return item[0] != item[1]
        }))

        return tracker
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const sendTrackChangeNotifications = async (req, res) => {
    console.log('generating track change notifs: ' + req.params.playlist_id)
    try {
        const changes = req.response
        const notifs = await generateTrackChangeNotifications(req.params.playlist_id, changes)
        notifs.forEach((notif) => {
            const notify = Target.notify(req.params.target_id, notif)
        })
        res.status(200).json({response: notifs})
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTarget = async (req, res) => {

    try {
        const target = req.target
        if (target) {
            res.status(200).json({target})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetNotifications = async (req, res) => {

    try {
        const target = req.params.target
        const notifications = await Target.notifications(target)
        if (notifications) {
            res.status(200).json({response: notifications})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetNotification = async (req, res) => {

    const target_id = req.params.target_id
    const notif_id = req.params.notif_id

    try {
        const notification = await Target.getNotification(target_id, notif_id)
        if (notification) {
            res.status(200).json({response: notification})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

module.exports = { initTarget, getTargetPlaylists, getTarget, getTargetSnapshots, 
    getTargetSnapshotChanges, getPlaylistTrackChanges, sendTrackChangeNotifications,
    getTargetNotifications, getTargetNotification, stalk, getAllTargets }