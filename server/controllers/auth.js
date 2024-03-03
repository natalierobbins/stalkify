const querystring = require('querystring')
const request = require('request')
const crypto = require('crypto')
const Stalker = require('../schema/stalker')
const fetch = require('node-fetch')

const getToken = async() => {
    return new Promise((resolve, reject) => {
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID_SPOTIFY + ':' + process.env.CLIENT_SECRET_SPOTIFY).toString('base64'))
            },
            form: {
                grant_type: 'client_credentials'
            },
            json: true
        }
    
        request.post(authOptions, function(err, res, body) {
            if (!err && res.statusCode == 200) {
                resolve(body.access_token)
            }
            else {
                console.log(err, res)
                reject(res.statusCode)
            }
        })

    })
    
}
 
const RedirectSpotify = async (req, res) => {

    const dev = true
    const redirect_uri = dev ? process.env.REDIRECT_URI_SPOTIFY_LOCAL : process.env.REDIRECT_URI_SPOTIFY_EBS

    let scope = ''
    let state = crypto.randomBytes(20).toString('hex')
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: process.env.CLIENT_ID_SPOTIFY,
            redirect_uri: redirect_uri,
            scope: scope,
            show_dialog: true,
            state: state
        })
    )
}

const AuthSpotify = async (req, res) => {

    const dev = true

    var code = req.query.code || null
 
    var authOptions = {
          url: 'https://accounts.spotify.com/api/token',
          form: {
            code: code,
            redirect_uri: dev ? process.env.REDIRECT_URI_SPOTIFY_LOCAL : process.env.REDIRECT_URI_SPOTIFY_EBS,
            grant_type: 'authorization_code'
          },
          headers: {
            'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID_SPOTIFY + ':' + process.env.CLIENT_SECRET_SPOTIFY).toString('base64'))
          },
          json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {

            var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + body.access_token },
                json: true,
                access_token: body.access_token,
                refresh_token: body.refresh_token,
            }

            request.get(options, async function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    try {
                        const stalker = await Stalker.authorize(response.body.id, options.access_token)
                        if (stalker) {
                            const url = '/auth?' + 
                            querystring.stringify({
                                access_token: options.access_token,
                                user_id: response.body.id,
                                user_name: response.body.display_name,
                                })
                            res.redirect(url)
                        }
                    }
                    catch (error) {
                        res.status(400).json({error: error.message})
                        res.redirect('/?' +
                            querystring.stringify({
                                error: 'invalid-id'
                            })
                        )
                    }
                }
                else {
                    console.log(response.body)
                    res.redirect('/?' +
                        querystring.stringify({
                            error: 'invalid-api-me-response'
                        })
                    )
                }
            }) 
        }
        else {
            res.redirect('/?' +
                querystring.stringify({
                    error: 'invalid-token'
                })
            )
        }
    })
  
}

const RefreshSpotify = async (req, res) => {

    var refresh_token = req.query.refresh_token
    console.log(refresh_token)
    var authOptions = {
        url:'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(process.env.CLIENT_ID_SPOTIFY + ':' + process.env.CLIENT_SECRET_SPOTIFY).toString('base64'))
        },
        form: {
            refresh_token: refresh_token,
            grant_type: 'refresh_token'
        },
        json: true
    }

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            res.redirect('/auth?' + querystring.stringify({
                access_token: body.access_token
            }))
        }
        else {
            res.redirect('/' +
                querystring.stringify({
                    error: 'invalid token'
                })
            )
        }
    })
}

module.exports = { RedirectSpotify, AuthSpotify, RefreshSpotify, getToken }