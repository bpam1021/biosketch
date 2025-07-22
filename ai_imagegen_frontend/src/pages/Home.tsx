import { Link } from 'react-router-dom';
import background from '../assets/background.webp';
import './Home.css';

function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center relative"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute top-0 left-0 w-full h-full bg-amber-100 opacity-50"
      ></div>

      {/* Bubbles */}
      <div className="absolute top-0 left-0 w-full h-full bubble-container">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="bubble"></div>
        ))}
      </div>

      <div className="bg-white/80 rounded-lg p-8 shadow-lg backdrop-blur-sm opacity-80">
        <h1 className="text-5xl font-bold text-gray-600 mb-6 drop-shadow-lg">
          Welcome to Biosketch AI
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Create AI-generated scientific illustrations with ease!
        </p>
        <div className="space-x-4">
          <Link to="/register">
            <button className="bg-gray-700 hover:bg-gray-900 text-white font-semibold py-3 px-8 rounded-full focus:outline-none focus:ring-4 focus:ring-blue-300">
              Get Started
            </button>
          </Link>
          <Link to="/login">
            <button className="bg-gray-400 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-full focus:outline-none focus:ring-4 focus:ring-gray-300">
              Log In
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
