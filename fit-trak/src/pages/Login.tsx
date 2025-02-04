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
      history.push('/tab1');
    } catch (error: any) {
      console.error('Login error:', error);
      alert(error.message);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* Make IonContent fill the screen and use your .center-content class */}
      <IonContent className="center-content">
        {/* A 'card' in the center for the login form */}
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

          <button className="button" onClick={handleLogin}>
            Login
          </button>

          <div className="link" onClick={() => history.push('/register')}>
            Don&apos;t have an account? Register here
          </div>
        </div>
      </IonContent>

      {/* Fixed footer at the bottom */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2023 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Login;
