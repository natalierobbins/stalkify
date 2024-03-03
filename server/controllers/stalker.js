const Stalker = require('../schema/stalker')
const Target = require('../schema/target')
const Notification = require('../schema/notification')
const { getUser } = require('./spotify')

const stalk = async () => {

    const stalker_id = req.params.stalker_id
    const targets = req.params.response
    const { access_token } = req.query
    try {
        const start = Date.now()
        for (const target of targets) {
            console.log(`stalking ${target.spotify_id} for ${stalker_id}`)
            const response = await fetch(`http://localhost:400/api/stalk/${target.spotify_id}/stalk?access_token=${access_token}`)
            if (response.ok) {
                console.log('RESPONSE', await response.json())
            }
        }
        const end = Date.now()
        const padding = Math.max(0, 10000 - (end - start))

        await new Promise(resolve => setTimeout(resolve, padding))
    }
    catch (error) {
        console.log(error.message)
    }
}

const signInUser = async (req, res) => {

    const { id } = req.query

    try {
        const user = await Stalker.signIn(id)
        if (user) {
            res.status(200).json({user})
        }
        else {
            res.status(400).json({error: 'User does not exist'})
        }
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}

const authorizeUser = async (req, res) => {

    const { id } = req.query

    try {
        const user = await Stalker.authorize(id)
        res.status(200).json({user})
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}

// const getNotifications = async (req, res) => {

//     try {
//         const targets = await req.response
//         var notifications = []
//         for (const target_id of targets) {
//             notifications.push(getTargetNotifications(target_id))
//         }
//         res.status(200).json({notifications})
//     } catch (error) {
//         res.status(400).json({error: error.message})
//     }
// }

const addTarget = async (req, res) => {

    const stalker_id = req.params.stalker_id
    const target_id = req.params.target_id

    try {
        const stalker = await Stalker.addTarget(stalker_id, target_id)
        const access_token = stalker.access_token
        let target = await Target.get(target_id)
        if (!target) {
            await Target.init(stalker_id, target_id, access_token)
        }
        target = await Target.addStalker(stalker_id, target_id)
        res.status(200).json({stalker, target})
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getTargetName = async (req, res) => {
    const stalker_id = req.params.stalker_id
    const target_id = req.params.target_id
    try {
        const stalker = await Stalker.get(stalker_id)
        const access_token = stalker.access_token
        const target = await getUser(target_id, access_token)
        console.log(target)
        res.status(200).json({name: target.display_name, spotify_id: target.id})
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const removeTarget = async (req, res) => {

    const stalker_id = req.params.stalker_id
    const target_id = req.params.target_id

    try {
        const stalker = await Stalker.removeTarget(stalker_id, target_id)
        const target = await Target.removeStalker(stalker_id, target_id)
        res.status(200).json({stalker, target})
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getCache = async (req, res, next) => {

    const stalker_id = req.params.stalker_id

    try {
        const cache = await Stalker.cache(stalker_id)
        req.response = cache
        next()
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getNotifications = async (req, res) => {

    const stalker_id = req.params.stalker_id

    try {
        const notification_ids = await Stalker.getNotifications(stalker_id)
        const notifications = await Notification.get(notification_ids)
        res.status(200).json({notifications: notifications, metadata: notification_ids})
    }
    catch(error) {
        res.status(400).json({error: error.message})
    }
}

const readNotifications = async (req, res) => {

    const stalker_id = req.params.stalker_id

    try {
        const stalker = await Stalker.readNotifications(stalker_id)
        res.status(200).json({stalker})
    }
    catch(error) {
        res.status(400).json({error: error.message})
    }
}

const getCacheNotifications = async (req, res) => {
    try {
        const cache = req.response
        var notifs = []
        var getCache = new Promise((resolve, reject) => {
            cache.forEach(async (notif) => {
                var notif = await Target.getNotification(notif.spotify_id, notif._id)
                notifs.push(notif)
            })
            resolve()
        })
        getCache.then(() => {
            console.log(notifs)
            res.status(200).json({notifs})
        })
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

module.exports = { signInUser, authorizeUser, getNotifications, getTargetName, addTarget, removeTarget, getCache, getCacheNotifications, readNotifications, stalk }