require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
const { program } = require('commander')

program
    .option('-m --mode <mode>', '"dev" | "prod"', "prod")
    .option('-t --timeout <timeout>', 'Set delay time', 0)
    .parse(process.argv)

const options = program.opts()

const authRoutes = require('./server/routes/auth')
const stalkerRoutes = require('./server/routes/stalker')
const targetRoutes = require('./server/routes/target')
const notificationRoutes = require('./server/routes/notification')

// express app
const app = express()

// global middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// app.use(cors())

app.use((req, res, next) => {
    console.log(req.path, req.method)
    next()
})

// routes
app.use('/api/auth', authRoutes)
app.use('/api/stalk', stalkerRoutes)
app.use('/api/target', targetRoutes)
app.use('/api/notifications', notificationRoutes)

app.use(express.static(path.join(__dirname, './browser/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './browser/build/index.html'));
});

const domain = options.mode == 'dev' ? 'http://localhost:8080' : process.env.DOMAIN

const stalk = async (timeout=1000) => {
    try {
        const start = Date.now()
        const response = await fetch(`${domain}/api/target/all`)
        const targets = await response.json()
        for (const target of targets.response) {
            console.log(`stalking ${target.spotify_id}`)
            const response = await fetch(`${domain}/api/target/${target.spotify_id}/stalk`)
            if (response.ok) {
                console.log('RESPONSE', await response.json())
            }
        }
        const end = Date.now()
        const padding = Math.max(0, timeout - (end - start))

        await new Promise(resolve => setTimeout(resolve, padding))
    }
    catch (error) {
        console.log(error.message)
    }
}

// connect to db
mongoose.connect(
    'mongodb+srv://' +
    process.env.MONGO_USERNAME + ':' +
    process.env.MONGO_PASSWORD + '@' +
    process.env.MONGO_CLUSTER
)
    .then(async () => {

        // listen for requests
        const server = app.listen(process.env.PORT, async () => {
            console.log('connected to db & listening on port', process.env.PORT)
            for (;;) {
                await stalk(options.timeout)
            }
        })

        process.on('SIGINT', () => {
            server.close(() => {
                console.log('server shut down')
                process.exit(0)
            })
        })
    })
.catch((error) => {
    console.log(error)
    console.log('mongodb+srv://' +
process.env.MONGO_USERNAME + ':' +
process.env.MONGO_PASSWORD + '@' +
process.env.MONGO_CLUSTER)
})

