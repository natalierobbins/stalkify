const mongoose = require('mongoose')
const Stalker = require('./stalker')
const Notification = require('./notification')
const { initPlaylistsObject, getUser, getTrackIds, getAll } = require('../controllers/spotify')
const _ = require('lodash')

const targetSchema = new mongoose.Schema({
    spotify_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    playlists: {
        type: Object,
        required: true,
    },
    notifications: {
        type: Array,
        required: true
    },
    stalkers: {
        type: Array,
        required: true
    }
})

targetSchema.statics.get = async function(id) {
    if (id == undefined) {
        return null
    }

    var target = await this.findOne({ spotify_id: id })
    return target
}

targetSchema.statics.init = async function(stalker_id, target_id, access_token) {
    if (target_id != undefined && stalker_id != undefined) {
        var playlists = await initPlaylistsObject(target_id, access_token)
        var user = await getUser(target_id)
        var target = await this.create({ 
            spotify_id: target_id,
            name: user.display_name,
            playlists: playlists,
            stalkers: [ {spotify_id: stalker_id } ],
            notifications: []
        })

        return target
    }

    return null
}

targetSchema.statics.getAllTargets = async function () {
    try {
        const targets = await this.find().select('spotify_id')
        return targets
    }
    catch (error) {
        console.log(error.message)
    }
}

targetSchema.statics.notify = async function (target_id, target_name, notifs, new_playlists) {
    try {
        if (!notifs.length) {
            return []
        }
        else if (target_id != undefined && notifs != undefined) {
            var notif_notifs = []
            var target_notifs = []
            var stalker_notifs = []
            for (var notif of notifs) {
                var notification = await Notification.notify(target_id, target_name, notif)
                notif_notifs.push(notification)
    
                target_notifs.push({
                    _id: new mongoose.Types.ObjectId(notification._id),
                    timestamp: notification.timestamp
                })
    
                stalker_notifs.push({
                    _id: new mongoose.Types.ObjectId(notification._id),
                    spotify_id: target_id,
                    timestamp: notification.timestamp,
                    read: 0
                })
                try {
                    var target = await this.findOne({ spotify_id: target_id })
                    var playlists = target.playlists
                    if (notification.type == 'playlist-remove') {
                        playlists = _.omit(playlists, notification.playlist_id)
                    }
                    else if (notification.type == 'playlist-add') {
                        var tracks = await getAll('tracks', notification.playlist_id)
                        playlists[notification.playlist_id] = new_playlists[notification.playlist_id]
                        playlists[notification.playlist_id]['tracks'] = getTrackIds(tracks)
                        for (var track of tracks) {
                            if (track.track) {
                                var track_notification = await Notification.notify(target_id, target_name,
                                    {
                                        type: 'track-add',
                                        playlist_id: notification.playlist_id,
                                        playlist_name: notification.playlist_name,
                                        track_id: track.track.id,
                                        track_name: track.track.name,
                                        track_album: track.track.album.name,
                                        track_artist: track.track.artists[0].name,
                                        track_album_art: track.track.album.images[0].url
                                    }
                                )
                                notif_notifs.push(track_notification)
        
                                target_notifs.push({
                                    _id: new mongoose.Types.ObjectId(track_notification._id),
                                    timestamp: track_notification.timestamp
                                })
                    
                                stalker_notifs.push({
                                    _id: new mongoose.Types.ObjectId(track_notification._id),
                                    spotify_id: target_id,
                                    timestamp: track_notification.timestamp,
                                    read: 0
                                })
                            }
                        }
                    }
                    else if (notification.type == 'track-remove') {
                        playlists[notification.playlist_id].tracks = playlists[notification.playlist_id].tracks.filter((track_id) => {return track_id != notification.track_id})
                        playlists[notification.playlist_id].snapshot_id = new_playlists[notification.playlist_id].snapshot_id
                    }
                    else if (notification.type == 'track-add') {
                        playlists[notification.playlist_id].tracks.push(notification.track_id)
                        playlists[notification.playlist_id].snapshot_id = new_playlists[notification.playlist_id].snapshot_id
                    }
                    else if (notification.type == 'name-modify') {
                        playlists[notification.playlist_id].name = notification.new
                        playlists[notification.playlist_id].snapshot_id = new_playlists[notification.playlist_id].snapshot_id
                    }
                    else if (notification.type == 'desc-modify') {
                        playlists[notification.playlist_id].desc = notification.new
                        playlists[notification.playlist_id].snapshot_id = new_playlists[notification.playlist_id].snapshot_id
                    }

                    console.log(playlists[notification.playlist_id], new_playlists[notification.playlist_id])

                    try {
                        await this.findOneAndUpdate(
                            { spotify_id: target_id },
                            { playlists: playlists }
                        )
                    }
                    catch (error) {
                        console.log(error.message)
                    }
                }
                catch (error) {
                    console.log(error.message)
                }
            }
    
            await this.findOneAndUpdate(
                { spotify_id: target_id },
                {   
                    $addToSet: 
                        { notifications: 
                            { $each: target_notifs }
                        }
                },
                {
                    upsert: true,
                    new: true
                }
            )
    
            var stalkers = await this.findOne({ spotify_id: target_id }).select('stalkers')
            
            stalkers.stalkers.forEach(async (stalker) => {
                try {
                    await Stalker.findOneAndUpdate(
                        { spotify_id: stalker.spotify_id },
                        { $addToSet: 
                            { notifications: 
                                { $each: stalker_notifs }
                            }
                        },
                        {
                            upsert: true,
                            new: true
                        }
                    )
                }
                catch (error) {
                    console.log(error.message)
                }
            })
        }

        return notif_notifs

    }
    catch (error) {
        console.log(error.message)
    }
}

targetSchema.statics.notifications = async function (spotify_id) {
    if (spotify_id != undefined) {
        var notifications = await this.findOne({ spotify_id: spotify_id }).select('notifications')
        return notifications
    }
}

targetSchema.statics.getNotification = async function (spotify_id, notif_id) {
    if (spotify_id != undefined && notif_id != undefined) {
        var notif = await this.findOne(
            { spotify_id: spotify_id },
            { notifications: { $elemMatch: { _id: notif_id } } }
        )

        return notif
    }
}

targetSchema.statics.addStalker = async function(stalker_id, target_id) {
    if (target_id != undefined && stalker_id != undefined) {
        var target = await this.findOneAndUpdate(
            { spotify_id: target_id },
            { $addToSet: { stalkers: { spotify_id: stalker_id } } }
        )

        return target
    }
}

targetSchema.statics.removeStalker = async function(stalker_id, target_id) {
    if (target_id != undefined && stalker_id != undefined) {
        var target = await this.findOneAndUpdate( 
            { spotify_id: target_id },
            { $pull: { stalkers: { spotify_id: stalker_id } } },
            { safe: true, multi: false }
        )
        return target
    }
}

module.exports = Target = mongoose.connection.useDb('test').model('Target', targetSchema)