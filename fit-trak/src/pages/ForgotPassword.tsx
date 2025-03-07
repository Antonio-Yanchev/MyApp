import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonLoading,
  IonToast
} from '@ionic/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useHistory } from 'react-router-dom';

// Import your new forgotpassword.css
import './ForgotPassword.css';

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
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Fit-Trak</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="center-content">
        <div className="auth-container">
          <div className="header">Reset Password</div>

          {/* Use the .input class for styling */}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Use .login-button instead of .button */}
          <button className="login-button" onClick={handlePasswordReset}>
            Send Reset Link
          </button>

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

      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 Fit-Trak</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default ForgotPassword;
