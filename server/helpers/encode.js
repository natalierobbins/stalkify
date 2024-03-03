const encodeFormData = (data) => {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(key[data]))
        .join('&')
}

module.exports = { encodeFormData }