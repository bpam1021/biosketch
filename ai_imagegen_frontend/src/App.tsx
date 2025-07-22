import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { CreditsProvider } from './context/CreditsContext';
import { GlobalProvider } from './context/GlobalContext';
import { CommunityProvider } from './context/CommunityContext';
import AppRoutes from './routes/routes';  // ✅ Import here
import Navbar from './components/Navbar';
import 'react-toastify/dist/ReactToastify.css';
import "./helper/fabricCustomProps";

function App() {
  return (
    <CreditsProvider>
      <AuthProvider>
        <GlobalProvider>
          <CommunityProvider>
            <Navbar />
            <ToastContainer />
            <AppRoutes />
          </CommunityProvider>
        </GlobalProvider>
      </AuthProvider>
    </CreditsProvider>
  );
}

export default App;
