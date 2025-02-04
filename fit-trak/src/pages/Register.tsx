// Register.tsx
import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import './LoginRegister.css';

const Register: React.FC = () => {
  const history = useHistory();
  const [username, setUsername] = useState(''); // <-- new state for username
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      // 1. Create user using Email/Password
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // 2. Set the user's displayName in Firebase Auth
      await updateProfile(user, { displayName: username });

      // (Optional) Store more data in Firestore if you like

      alert('Account created successfully!');
      history.push('/login');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <IonPage className="page">
      <IonContent>
        <div className="header">Register</div>
        
        {/* New input for username */}
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
        
        <button className="button" onClick={handleRegister}>
          Register
        </button>
        <div className="link" onClick={() => history.push('/login')}>
          Already have an account? Login here
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;
