import { Link, useSearchParams } from 'react-router-dom'
import _ from 'lodash'
import { useState, useEffect } from 'react'
import $ from 'jquery'

export const Dash = (props) => {

    const timestampComp = (a, b) => {

        if (a.timestamp > b.timestamp) {
            return -1
        }
        else if (a.timestamp < b.timestamp) {
            return 1
        }
        else {
            return 0
        }
    }

    const api = (endpoint) => {
        const dev = true
        if (dev) {
            return fetch('http://localhost:8080' + endpoint)
        }
        return fetch(endpoint, {credentials: "same-origin"})
    }

    const [stalks, setStalks] = useState(0)
    const [params, setParams] = useSearchParams()
    const [error, setError] = useState(false)
    const [notifications, setNotifications] = useState(null)
    const [shallow, setShallow] = useState([])
    const [shallowMetadata, setShallowMetadata] = useState({})
    const [all, setAll] = useState(null)
    const [metadata, setMetadata] = useState(null)
    const [page, setPage] = useState(params.get('p') ? params.get('p') : 1)
    const page_size = 10

    const readNotifications = async () => {
        console.log('marking read')
        try {
            const response = await api(
                `/api/stalk/${localStorage.getItem('id')}/read`
            )
            const json = await response.json()
            return json
        }
        catch (error) {
            console.error(error.message)
        }
    }

    const filterComp = (param, value) => {
        if (params.get(param)) {
            return value == params.get(param)
        }
        return true
    }

    const filterNotifications = (item) => {
        return (
            filterComp('playlist', item.playlist_id) &&
            filterComp('track', item.track_id) &&
            filterComp('target', item.spotify_id)
        )
    }

    const paginate = (notifications, page_num) => {
        const begin = Math.max(0, (page_num * page_size) - page_size)
        const end = (page_num * page_size)
        return notifications.slice(begin, end)
    }

    const increment = (e) => {
        if (page < Math.ceil(all.length / page_size)) {
            setPage(page + 1)
            setNotifications(
                paginate(
                    all.filter((item) => filterNotifications(item)),
                    page
                )
            )
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
        }
    }

    const decrement = (e) => {
        if (page > 1) {
            setPage(page - 1)
            setNotifications(
                paginate(
                    all.filter((item) => filterNotifications(item)),
                    page
                )
            )
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
        }
    }

    useEffect(() => {
        const fetchNotifications = async () => {
            console.log('fetching...')
            try {
                const response = await api(`/api/stalk/${localStorage.getItem('id')}/notifications`)
                console.log(response)
                if (response.ok) {
                    const json = await response.json()
                    const sorted = json.notifications.sort(timestampComp)
                    const filtered = sorted.filter((item) => filterNotifications(item))
                    setAll(filtered)
                    setNotifications(paginate(filtered, page))
                    setMetadata(json.metadata.reduce((acc, notification) =>
                        (acc[notification._id] = notification, acc), {}
                    ))
                }
                else {
                    setError(true)
                    console.error(response.error.message)
                }
            }
            catch (error) {
                setError(true)
                console.error(error.message)
            }
        }
        fetchNotifications()
    }, [page])

    useEffect(() => {
        const stalk = async () => {
            console.log('stalking...')
            try {
                const targets_res = await api(`/api/stalk/${localStorage.getItem('id')}/targets`)
                if (targets_res.ok) {
                    const targets = await targets_res.json()
                    console.log(targets)
                    for (const target of targets.response.targets) {
                        console.log('stalking ' + target.spotify_id)
                        const stalk_res = await api(`/api/target/${target.spotify_id}/stalk?access_token=${localStorage.getItem('access')}&user=${localStorage.getItem('id')}`)
                        if (stalk_res.ok) {
                            const changes = await stalk_res.json()
                            console.log('response for ' + target.spotify_id, changes)
                            if (changes.length) {
                                let filtered = [...changes, ...shallow].filter((item) => filterNotifications(item))
                                setShallow(filtered)
                                let shallow_metadata = shallowMetadata
                                for (const notification of changes) {
                                    shallow_metadata[notification._id] = {
                                        read: 0,
                                        spotify_id: notification.spotify_id,
                                        timestamp: notification.timestamp,
                                        _id: notification._id
                                    }
                                }
                                setShallowMetadata(shallow_metadata)
                            }
                        }
                    }
                    setStalks(stalks + 1)
                }
            }
            catch (error) {
                console.error(error.message)
            }
        }
        stalk();
    }, [stalks])
    if (error) {
        return (
            <div id='dashboard-content-wrapper'>
                <div id='content-wrapper'>
                     <div id='dashboard-title-wrapper'>
                        <h1>All notifications</h1>
                    </div>
                    Oops, something went wrong! Please retry loading the page.
                </div>
            </div>
        )
    }
    if (all && metadata) {
        setTimeout(() => readNotifications(), 5000)
        if (notifications.some(e => metadata[e._id].read == 0)) {
            $('#favicon').attr('href', 'logo-unread.svg')
        }
        if (notifications.length === 0) {
            <div id='dashboard-content-wrapper'>
                <div id='content-wrapper'>
                     <div id='dashboard-title-wrapper'>
                        <h1>All notifications</h1>
                    </div>
                    It's a little quiet in here... wait for activity or add more targets!
                </div>
            </div>
        }
        return (
            <div id='dashboard-content-wrapper'>
                <div id='content-wrapper'>
                    <div id='dashboard-title-wrapper'>
                        <h1>All notifications</h1>
                    </div>
                    {params.size > 0 && <Tags notifications={notifications} params={params}/>}
                    {shallow.length > 0 && shallow.map((notification) => {
                        return <Notification notif={notification} metadata={shallowMetadata} key={notification._id} />
                    })}
                    {notifications.map((notification) => {
                        return <Notification notif={notification} metadata={metadata} key={notification._id} />
                    })}
                    <div className='page-nav-wrapper'>
                        <span className={`page-arrow ${page == 1 && 'page-arrow-disabled'}`} onClick={decrement}>&lt;</span>
                        <span className='page-num'>{page} of {Math.ceil(all.length / page_size) > 0 ? Math.ceil(all.length / page_size) : 1}</span>
                        <span className={`page-arrow ${page == Math.ceil(all.length / page_size) && 'page-arrow-disabled'}`} onClick={increment}>&gt;</span>
                    </div>
                </div>
            </div>
        )
    }
}

const Modify = ({opts}) => {
    return (
        <div className='snippet-content'>
            <div className='modify-wrapper'>
                <div className='button modify modify-original'>
                    {opts.old}
                </div>
                <div className='button modify modify-new'>
                    {opts.new}
                </div>
            </div>
        </div>
    )
}

const Track = ({opts}) => {
    return (
        <div className={`button track snippet-content ${opts.type}`}>
            <img src={opts.track_album_art} className='album-placeholder' />
            <div className={`track-info-wrapper ${opts.type}`}>
                <span className='track-info track-name'>{opts.track_name}</span>
                <span className='track-info track-artist'>{opts.track_artist}</span>
                <span className='track-info track-album'>{opts.track_album}</span>
            </div>
        </div>
    )
}

const NotificationText = ({opts}) => {

    const types = {
        'track-add': ['added', 'to'],
        'track-remove': ['removed', 'from'],
        'playlist-add': ['created a new playlist:'],
        'playlist-remove': ['deleted or privated'],
        'name-modify': ['modified the title of'],
        'desc-modify': ['modified the description of']
    }

    var base = (
        <>
            <Link reloadDocument className='link-notification' to={`/?target=${opts.spotify_id}`}>{opts.name}</Link>
            <span className='notification-text'>{types[opts.type][0]}</span>
        </>
    )

    if (types[opts.type].length == 2) {
        base = (
            <>
                {base}
                <Link reloadDocument className='link-notification' to={`/?track=${opts.track_id}`}>{opts.track_name}</Link>
                <span className='notification-text'>{types[opts.type][1]}</span>
            </>
        )
    }

    return (
        <>
            {base}
            <span className='notification-text'>
                <Link reloadDocument className='link-notification' to={`/?playlist=${opts.playlist_id}`}>{opts.playlist_name}</Link>
            </span>
        </>
    )
}

const Notification = (props) => {

    return (
        <div className='notification-snippet-wrapper'>
            <div className='notification-wrapper'>
                <div className='button notification'>
                    <NotificationText opts={props.notif}/>
                </div>
                {!!!props.metadata[props.notif._id].read && <span className='notification-bubble'></span>}
            </div>
            {!props.notif.type.includes('playlist') && <Snippet opts={props.notif} />}
        </div>
    )

}

const Snippet = ({opts}) => {

    const chars = {
        'track-add': '+',
        'track-remove': 'x',
        'name-modify': '>',
        'desc-modify': '>'
    }

    return (
        <div className='snippet'>
            <div className='char-wrapper'>
                {_.times(4, () => {
                    return ( <span className={opts.type}>{chars[opts.type]}</span> )
                })}
            </div>
            {opts.type.includes('track') ? <Track opts={opts} /> : <Modify opts={opts} />}
        </div>
    )
}

const Tags = (props) => {

    let tags = []

    if (props.params.get('playlist')) {
        tags.push({value: props.notifications[0].playlist_name, type: 'playlist'})
    }
    if (props.params.get('track')) {
        tags.push({value: props.notifications[0].track_name, type: 'track'})
    }
    if (props.params.get('target')) {
        tags.push({value: props.notifications[0].name, type: 'target'})
    }
    return (
        <div className='tag-wrapper'>
            {tags.map((tag) => {
                let deleted = new URLSearchParams(props.params)
                deleted.delete(tag.type)
                return (
                    <Link reloadDocument to={`/?${deleted.toString()}`} className='tag-link'>
                        <span className='tag'>{tag.value}</span>
                    </Link>
                )
            })}
        </div>
        
    )
}