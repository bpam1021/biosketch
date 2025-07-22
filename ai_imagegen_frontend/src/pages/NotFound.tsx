import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/">
        <button className="btn-primary">Go Home</button>
      </Link>
    </div>
  );
}

export default NotFound;
