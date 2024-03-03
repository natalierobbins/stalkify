const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
    spotify_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
    },
    playlist_id: {
        type: String,
        required: true
    },
    playlist_name: {
        type: String,
        required: true,
    },
    track_id: {
        type: String,
    },
    track_name: {
        type: String,
    },
    track_album: {
        type: String,
    },
    track_artist: {
        type: String,
    },
    track_album_art: {
        type: String,
    },
    old: {
        type: String
    },
    new: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
})

notificationSchema.statics.notify = async function (target_id, target_name, notif) {
    try {
        notification = await this.create({
            spotify_id: target_id,
            name: target_name,
            ...notif
        })

        return notification
    }
    catch (error) {
        console.log(error.message)
    }
}

notificationSchema.statics.get = async function (ids) {

    for (var id of ids) {
        if (id._id) {
            id = new mongoose.Types.ObjectId(id._id)
        }
        else {
            id = new mongoose.Types.ObjectId(id)
        }
    }

    try {
        notifications = await this.find({
            '_id': { $in: ids}
        })
        return notifications
    }
    catch (error) {
        return undefined
    }
}

module.exports = Notification = mongoose.connection.useDb('test').model('Notification', notificationSchema)