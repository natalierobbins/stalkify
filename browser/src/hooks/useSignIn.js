import { stringify } from 'querystring'

export const useSignIn = async () => {
    const user = localStorage.getItem('user_id')

    if (user) {
        const response = await fetch('http://localhost:400/api/user/sign-in?' + 
            stringify({
                id: user
            })
        )

        const json = await response.json()
        console.log(json)
    }
}