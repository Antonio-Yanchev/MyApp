import React from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
import { auth } from '../firebaseConfig';

const Tab1: React.FC = () => {
  const user = auth.currentUser;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Welcome</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>Welcome, {user?.email || 'Guest'}!</h1>
        <p>This is your dashboard.</p>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
