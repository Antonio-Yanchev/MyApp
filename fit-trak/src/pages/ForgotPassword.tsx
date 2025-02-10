// ForgotPassword.tsx
import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonButton,
  IonLoading,
  IonToast
} from '@ionic/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // adjust the import path to your setup

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [showLoader, setShowLoader] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
        <IonToolbar>
          <IonTitle>Reset Password</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">

        <IonItem>
          <IonLabel position="floating">Email</IonLabel>
          <IonInput
            type="email"
            value={email}
            onIonChange={(e) => setEmail(e.detail.value!)}
            required
          />
        </IonItem>

        <IonButton expand="block" onClick={handlePasswordReset}>
          Send Reset Link
        </IonButton>

        <IonLoading isOpen={showLoader} message={'Sending reset email...'} />

        {/* Toast to display messages (success or error) */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
        />
      </IonContent>
    </IonPage>
  );
};

export default ForgotPassword;
