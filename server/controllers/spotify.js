const fetch = require('node-fetch')
const { getToken } = require('./auth')

const getPlaylist = async (id) => {
    const token = await getToken()
    const res = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })

    const playlist = await res.json()
    return playlist
}

const generateTrackChangeNotifications = async (playlist_id, changes) => {
    const playlist = await getPlaylist(playlist_id)
    const tracks = await getTracksMulti(Object.keys(changes))
    var notifs = []
    tracks.tracks.forEach((track) => {
        const notif = {
            type: changes[track.id][0] > changes[track.id][1] ? 'song-remove' : 'song-add',
            playlist_id: playlist_id,
            playlist_name: playlist.name,
            track_id: track.id,
            track_name: track.name,
            track_album: track.album.name,
            track_artist: track.artists[0].name,
            track_album_art: track.album.images[0].url
        }
        notifs.push(notif)
    })
    return notifs
}

const getTracksMulti = async (ids) => {
    const token = await getToken()
    const id_list = ids.join(',')
    const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${id_list}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })

    const tracks = await res.json()
    return tracks
}

const getNewSnapshots = async (id) => {
    const playlists = await getAll('playlists', id)
    const snapshot_ids = {}
    playlists.forEach((playlist) => snapshot_ids[playlist.id] = playlist.snapshot_id)
    return snapshot_ids
}

const playlistObject = (playlist) => {
    const playlistObj = {
        spotify_id: playlist.id,
        target_id: playlist.owner.id,
        name: playlist.name,
        desc: playlist.description,
        snapshot_id: playlist.snapshot_id,
    }
    return playlistObj
}

const getTracks = async (playlists) => {
    var playlistObjs = {}
    for (var playlistId of Object.keys(playlists)) {
        console.log(`getting all tracks from playlist ${playlists[playlistId].name}'`)
        var tracks = await getAll('tracks', playlistId)
        playlists[playlistId]['tracks'] = getTrackIds(tracks)
        playlistObjs[playlistId] = playlists[playlistId]
    }
    return playlistObjs
}

const initPlaylistsObject = async (spotify_id, access_token) => {
    console.log(`getting all playlists from user ${spotify_id}`)
    var playlists = await getAll('playlists', spotify_id, access_token)
    var playlistObjs = {}
    playlists.forEach((playlist) => playlistObjs[playlist.id] = playlistObject(playlist))
    var playlistsWithTracks = await getTracks(playlistObjs)
    console.log('DONE')
    return playlistsWithTracks
}

const getAll = async (type, id, access_token=null) => {

    console.log(`... ... getting ${type} ${id}`)

    const endpoints = {
        'tracks': 'playlists/{}/tracks',
        'playlists': 'users/{}/playlists'
    }

    if (!access_token) {
        access_token = await getToken()
    }

    var url = endpoints[type].replace(/{}/g, id)

    var [offset, limit] = [0, 50]
    const initialBatch = await getBatch(url, offset, access_token)
    var [next, all] = [initialBatch.next, initialBatch.items]

    while (next != null) {
        offset += limit
        const batch = await getBatch(url, offset, access_token)
        next = batch.next
        all.push(...batch.items)
    }

    return all
}

const fetchBatch = async (url, offset, access_token) => {
    try {
        const batch = await fetch(`https://api.spotify.com/v1/${url}?offset=${offset}&limit=50`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        return batch
    }
    catch (error) {
        console.log(error.message)
    }
}

const getBatch = async (url, offset, access_token, attempts=0) => {
    if (attempts == 0) {
        console.log('... ... ... getting new batch')
    }
    var batch = await fetchBatch(url, offset, access_token)

    if (attempts >= 3) {
        throw Error('Timed out')
    }
    if (batch.status == 429) {
        console.log('... ... ... ... rate limit reached. attempt: ' + attempts)
        await new Promise(resolve => setTimeout(resolve, 30000))
        await getBatch(url, offset, ++attempts)
    }
    else if (batch.status == 200) {
        const json = await batch.json()
        return json
    }

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

const getUser = async (id, access_token=null) => {
    if (!access_token) {
        access_token = await getToken()
    }
    const res = await fetch(`https://api.spotify.com/v1/users/${id}`, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })

    const user = await res.json()
    return user
}

module.exports = { initPlaylistsObject, getAll, getBatch, getTrackIds, getUser, getNewSnapshots, generateTrackChangeNotifications, getTracksMulti }