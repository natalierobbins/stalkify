const getResponse = async (req, res) => {
    try {
        const response = req.response
        if (response) {
            res.status(200).json({response})
        }
    }
    catch (error) {
        res.status(400).json({error: error.message})
    }
}

module.exports = { getResponse }