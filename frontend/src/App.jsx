import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'

const page = window.location.pathname

export default function App() {
  if (page.includes('signup')) return <Signup />
  return <Login />
}
