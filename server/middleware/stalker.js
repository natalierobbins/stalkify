const Stalker = require('../schema/stalker')

const getTargets = async (req, res, next) => {
    
    const stalker_id = req.params.stalker_id

    try {
        const targets = await Stalker.getTargets(stalker_id)
        req.response = targets
        next()
    } catch (error) {
        res.status(400).json({error: error.message})
    }

}

module.exports = { getTargets }