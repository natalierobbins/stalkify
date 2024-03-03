import { Link } from 'react-router-dom'
import { Header } from './components/header'
import { Dash } from './components/dash'
import { Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useState, useEffect } from 'react'
import { TargetList } from './components/targets'
import Logo from './assets/stalkify-logo.svg'
import { useSignOut } from './hooks/useSignOut'

export const Auth = ({page}) => {

  const auth = useAuth()
  console.log(auth)

  if (auth) {
    return page
  }
  else {
    // signout
    return (
      <div id='landing-wrapper'>
        <img src={Logo} id='logo-landing' />
          <Link reloadDocument to={`/api/auth/spotify-redirect`} className='log-in-link'>
          &gt; log in with spotify
          </Link>
      </div>
    );
  }
}

export const Dashboard = (props) => {
  return (
      <div id='dashboard-wrapper'>
        <Header />
        <Dash />
      </div>
  );
}

export const Targets = (props) => {
  return (
    <div id='dashboard-wrapper'>
      <Header />
      <TargetList />
    </div>
  )
}

export const AuthRedirect = () => {

  const auth = useAuth()
  return <Navigate to='/' />
  
}

export const LogoutRedirect = () => {
  const signout = useSignOut()
  return <Navigate to='/' />
}

export const NotFound = () => {
  return (
    <div id='dashboard-wrapper'>
      <Header />
      <div id='dashboard-content-wrapper'>
        <div id='content-wrapper'>
          <div id='dashboard-title-wrapper'>
            <h1>Page does not exist :(</h1>
          </div>
        </div>
      </div>
    </div>
  )
}