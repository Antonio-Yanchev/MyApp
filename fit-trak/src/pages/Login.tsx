import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import './LoginRegister.css';

const Login: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', userCred.user);
      history.push('/NutritionLogging'); // Redirect to the main app page after login
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="LoginPage" color="primary">
          <IonTitle>Fit-Trak</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="center-content">
        <div className="auth-container">
          <div className="header">Login</div>

          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Updated className here */}
          <button className="login-button" onClick={handleLogin}>
            Login
          </button>

          <div className="link" onClick={() => history.push('/register')}>
            Don&apos;t have an account? Register here
          </div>

          <div className="link" onClick={() => history.push('/forgot-password')}>
            Forgot Password? Reset it here
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="FooterLogin" color="primary">
          <IonTitle>© 2025 Fit-Trak</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Login;
