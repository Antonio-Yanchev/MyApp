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
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import './LoginRegister.css';

const Register: React.FC = () => {
  const history = useHistory();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      await updateProfile(user, { displayName: username });
      alert('Account created successfully!');
      history.push('/login');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="RegisterPage" color="primary">
          <IonTitle>Fit-Trak</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="center-content">
        <div className="auth-container">
          <div className="header">Register</div>

          <input
            className="input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
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
          <button className="login-button" onClick={handleRegister}>
            Register
          </button>

          <div className="link" onClick={() => history.push('/login')}>
            Already have an account? Login here
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="RegisterFooter" color="primary">
          <IonTitle>© 2025 Fit-Trak</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Register;
