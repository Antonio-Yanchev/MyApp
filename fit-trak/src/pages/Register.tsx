import React, { useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import './LoginRegister.css';

const Register: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      // Use v9 createUserWithEmailAndPassword(auth, ...)
      await createUserWithEmailAndPassword(auth, email, password);
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
