const Notification = require('../schema/notification')

const getNotificationsById = async (req, res) => {

    const query_ids = req.query.ids.split(',')
    try {
        const notifications = await Notification.get(query_ids)
        if (notifications) {
            res.status(200).json({notifications})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

module.exports = { getNotificationsById }