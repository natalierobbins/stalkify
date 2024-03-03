const mongoose = require('mongoose')

const stalkerSchema = new mongoose.Schema({
    spotify_id: {
        type: String,
        required: true,
        unique: true
    },
    targets: {
        type: Array,
        required: true
    },
    notifications: {
        type: Array,
        required: true
    },
    access_token: {
        type: String
    }
})

stalkerSchema.statics.get = async function (spotify_id) {
    if (spotify_id == undefined) {
        throw Error('All fields must be filled.')
    }

    var user = await this.findOne({ spotify_id: spotify_id })

    return user
}

stalkerSchema.statics.notify = async function (stalker_id, target_id, notif_id, notif_datetime) {
    if (stalker_id == undefined || target_id == undefined || notif_id == undefined || notif_datetime == undefined ) {
        throw Error('All fields must be filled.')
    }

    var notification = await this.findOneAndUpdate(
        { spotify_id: stalker_id },
        { 
            $addToSet: { 
                notifications: {
                    spotify_id: target_id,
                    _id: new mongoose.Types.ObjectId(notif_id),
                    timestamp: notif_datetime,
                    read: 0
                }
            } 
        },
        { new: true, upsert: true }
    )

    return notification
}

stalkerSchema.statics.authorize = async function (spotify_id, access_token) {

    if (spotify_id == undefined) {
        throw Error('All fields must be filled.')
    }

    var user = await this.findOneAndUpdate({ spotify_id: spotify_id }, { access_token: access_token })

    // user doesn't exist yet
    if (!user) {
        user = await this.create({ spotify_id, victims: [], notifications: [], access_token: access_token })
    }

    return user

}

stalkerSchema.statics.signIn = async function (spotify_id)  {

    if (!spotify_id) {
        throw Error('Missing id.')
    }

    var user = await this.findOne({ spotify_id: spotify_id })

    return user

}

stalkerSchema.statics.addTarget = async function (stalker_id, target_id) {

    if (!stalker_id && !target_id) {
        throw Error('Invalid stalker or target id')
    }

    // TODO: add if not in targets already
    var stalker = await this.findOneAndUpdate( 
        { spotify_id: stalker_id },
        { $addToSet: { targets: { spotify_id: target_id } } }
    )

    return stalker

}

stalkerSchema.statics.removeTarget = async function (stalker_id, target_id) {

    if (!stalker_id && !target_id) {
        throw Error('Invalid stalker or target id')
    }

    var stalker = await this.findOneAndUpdate( 
        { spotify_id: stalker_id },
        { $pull: { targets: { spotify_id: target_id } } },
        { safe: true, multi: false }
    )

    return stalker

}

stalkerSchema.statics.getTargets = async function (spotify_id) {

    if (!spotify_id) {
        throw Error('Missing id.')
    }

    var targets = await this.findOne({ spotify_id: spotify_id }).select('targets')
    return targets

}

stalkerSchema.statics.cache = async function (spotify_id) {
    if (!spotify_id) {
        throw Error('Missing id.')
    }

    var cache = await this.findOne({ spotify_id: spotify_id }).select('cache')

    return cache.cache
}

stalkerSchema.statics.readNotifications = async function (spotify_id) {
    if (!spotify_id) {
        throw Error('Missing id.')
    }

    let notifications = await this.findOneAndUpdate(
        { spotify_id: spotify_id },
        { $set: { 'notifications.$[].read': 1}}
    )

    return notifications
}

stalkerSchema.statics.getNotifications = async function (spotify_id) {
    if (!spotify_id) {
        throw Error('Missing id.')
    }

    let stalker = await this.findOne({ spotify_id: spotify_id }).select('notifications')

    return stalker.notifications
}

module.exports = Stalker = mongoose.connection.useDb('test').model('Stalker', stalkerSchema)