import { useSearchParams } from 'react-router-dom'

export const useAuth = () => {

    const [searchParams] = useSearchParams()

    var query = Object.fromEntries([...searchParams])
    
    console.log(query)

    const now = Date.now()

    if ('access_token' in query && 'user_id' in query && 'user_name' in query) {
        localStorage.setItem('access', query['access_token'])
        localStorage.setItem('id',  query['user_id'])
        localStorage.setItem('name',  query['user_name'])
        const expiration = new Date(now + (3600 * 1000))
        localStorage.setItem('expiration', expiration)
    }

    console.log('useAuth()')

    return (localStorage.getItem('access') && 
            localStorage.getItem('id') && 
            localStorage.getItem('name')) && (now < new Date(localStorage.getItem('expiration')))
}