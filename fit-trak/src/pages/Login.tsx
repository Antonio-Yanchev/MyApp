import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebaseConfig'; // Import Firebase authentication
import './LoginRegister.css';

const Login: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      localStorage.setItem('username', email); // Save the email in localStorage
      history.push('/tab1'); // Redirect to Tab1
    } catch (error) {
      alert(error.message); // Show an error message if login fails
    }
  };

  return (
    <IonPage className="page">
      <IonContent>
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
          Don't have an account? Register here
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
