import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonLoading,
  IonToast
} from '@ionic/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

import { useHistory } from 'react-router-dom';
import './LoginRegister.css'; // Same CSS as Login, ensuring .input, .button, etc. match

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [showLoader, setShowLoader] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const history = useHistory();

  const handlePasswordReset = async () => {
    if (!email) {
      setToastMessage('Please enter an email address.');
      setShowToast(true);
      return;
    }

    try {
      setShowLoader(true);
      await sendPasswordResetEmail(auth, email);
      setShowLoader(false);

      setToastMessage(`Password reset link sent to ${email}`);
      setShowToast(true);
    } catch (error: any) {
      setShowLoader(false);
      setToastMessage(error.message);
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      {/* Top header (blue bar) */}
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Fit-Trak</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* Centered “card” layout, just like Login */}
      <IonContent className="center-content">
        <div className="auth-container">
          <div className="header">Reset Password</div>

          {/* Match the Login input style */}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Match the Login button style (e.g., .button) */}
          <button className="button" onClick={handlePasswordReset}>
            Send Reset Link
          </button>

          {/* "Back to Login" link */}
          <div className="link" onClick={() => history.push('/login')}>
            Back to login
          </div>

          <IonLoading isOpen={showLoader} message={'Sending reset email...'} />
          <IonToast
            isOpen={showToast}
            onDidDismiss={() => setShowToast(false)}
            message={toastMessage}
            duration={3000}
          />
        </div>
      </IonContent>

      {/* Bottom footer (blue bar) */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 Fit-Trak</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default ForgotPassword;
