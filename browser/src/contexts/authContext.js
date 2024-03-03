import { createContext, useReducer } from 'react'
import { useEffect } from 'react'

export const AuthContext = createContext()

export const authReducer = (state, action) => {
    switch (action.type) {
        case 'SIGNIN':
            return { user: action.payload }
        case 'SIGNOUT':
            return { user: null }
        default:
            return state
    }
}

export const AuthContextProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, {
        user: null
    })

    // automatically authorize user in if in local storage
    useEffect(() => {
        const user = localStorage.getItem('id')
        const expiration = new Date(localStorage.getItem('expiration'))
        const now = Date.now()

        if (user && expiration < now) {
            dispatch({ type: 'SIGNIN', payload: user})
        }
        else {
            dispatch({ type: 'SIGNOUT', payload: user})
        }
    }, [])

    return (
        <AuthContext.Provider value={{...state, dispatch}}>
            { children }
        </AuthContext.Provider>
    )
}