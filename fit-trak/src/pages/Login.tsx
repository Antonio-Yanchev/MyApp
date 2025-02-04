import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
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
      console.log("Login successful:", userCred.user);
      history.push("/tab1");
    } catch (error: any) {
      console.error("Login error:", error);
      alert(error.message);
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
