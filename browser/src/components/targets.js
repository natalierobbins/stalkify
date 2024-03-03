import _ from 'lodash'
import $ from 'jquery'
import { useState, useEffect } from 'react'

export const TargetList = (props) => {

    const api = (endpoint) => {
        const dev = true
        if (dev) {
            return fetch('http://localhost:8080' + endpoint)
        }
        return fetch(endpoint, {credentials: "same-origin"})
    }

    const [targets, setTargets] = useState(null)
    const [newTarget, setNewTarget] = useState("")
    const [error, setError] = useState(false)
    useEffect(() => {
        const fetchTargets = async () => {
            console.log('fetching targets')
            try{
                    const response = await api(`/api/stalk/${localStorage.getItem('id')}/targets`)
                if (response.ok) {
                    var json = await response.json()
                    for (var target of json.response.targets) {
                        const target_req = await api(`/api/target/${target.spotify_id}`)
                        const target_res = await target_req.json()
                        target.name = target_res.response.name
                    }
                    setTargets(json.response.targets)
                }
                else {
                    console.log(response)
                }
            }
            catch (error) {
                setError(true)
            }
        }
        fetchTargets()
    }, [])

    const updateTarget = (e) => {
        e.preventDefault()
        let id = e.target.value
        const re = /https:\/\/open\.spotify\.com\/user\/([^\/?]+)/
        const match = id.match(re)
        if (match) {
            id = match[1]
        }
        setNewTarget(id)
    }

    const unfollow = async (e, id) => {
        console.log(id)
        const response = await api(`/api/stalk/${localStorage.getItem('id')}/remove/${id}`)
        const {stalker, target} = await response.json()
        setTargets((targets.filter((t) => {return t.spotify_id != target.spotify_id})))
        console.log(targets)
    }

    const follow = async (e) => {
        e.preventDefault()
        const target_data_req = await api(`/api/stalk/${localStorage.getItem('id')}/name/${newTarget}`)
        const target_data_res = await target_data_req.json()
        setTargets([target_data_res, ...targets])
        $('#target-input').val("")

        const response = await api(`/api/stalk/${localStorage.getItem('id')}/add/${newTarget}`)
        const {stalker, target} = await response.json()
    }
    if (error) {
        return (
            <div id='dashboard-content-wrapper'>
                <div id='content-wrapper'>
                     <div id='dashboard-title-wrapper'>
                        <h1>Targets</h1>
                    </div>
                    Oops, something went wrong! Please retry loading the page.
                </div>
            </div>
        )
    }
    if (targets) {
        console.log(targets)
        return (
            <div id='dashboard-content-wrapper'>
                <div id='content-wrapper'>
                    <div id='dashboard-title-wrapper'>
                        <h1>Targets</h1>
                    </div>
                    <div className='target-wrapper'>
                        <div className='button notification'>
                            <input id="target-input" type="text" placeholder="Add new target..." onChange={updateTarget} />
                        </div>
                        <span onClick={follow} className='target-add'>
                                +
                        </span>
                    </div>
                    {targets.map((target) => {
                        return (
                            <div className='target-wrapper'>
                                <div className='button target'>
                                    <span className='target-name'>{target.name}</span><span className='target-id'>{target.spotify_id}</span>
                                </div>
                                <span onClick={(e) => {unfollow(e, target.spotify_id)}} className='target-remove'>
                                    x
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }
}