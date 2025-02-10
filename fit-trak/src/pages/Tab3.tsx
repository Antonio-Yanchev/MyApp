import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonMenuButton,
  IonButton,
} from '@ionic/react';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';  // <-- Import signOut
import { auth } from '../firebaseConfig'; // <-- Import your auth

type Tab3Props = {
  user: User;
};

const Tab3: React.FC<Tab3Props> = ({ user }) => {
  const displayName = user.displayName || user.email;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for more details.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {/* Menu button to open the side menu */}
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Tab3</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h1>Welcome to Tab3, {displayName}!</h1>

        {/* Navigate to other tabs if you like */}
        <IonButton routerLink="/tab1" color="primary">
          Go to Tab1
        </IonButton>
        <IonButton routerLink="/tab2" color="secondary">
          Go to Tab2
        </IonButton>

        {/* Logout button */}
        <IonButton onClick={handleLogout} color="danger">
          Logout
        </IonButton>
      </IonContent>

      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Tab3;
