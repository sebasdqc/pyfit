import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div>
      <h1>404</h1>
      <Link to="/dashboard">Volver al inicio</Link>
    </div>
  )
}
