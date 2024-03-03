import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Eye from '../assets/stalkify-eye.svg'

export const Header = () => {
    return (
        <div id='header-wrapper'>
            <img id='eye-header' src={Eye} />
            <Menu />
        </div>
    )
}

const Menu = () => {

    const [width, setWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    return (
        <div id='menu-wrapper'>
            <Link reloadDocument to='/'>{'> home'}</Link>
            <Link reloadDocument to='/targets'>{'> targets'}</Link>
            <Link reloadDocument to='/log-out'>{'> log out'}</Link>
        </div>
    )
}