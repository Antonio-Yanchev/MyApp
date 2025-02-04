// Tab3.tsx
import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/react';
import { User } from 'firebase/auth';

type Tab3Props = {
  user: User;
};

const Tab3: React.FC<Tab3Props> = ({ user }) => {
  const displayName = user.displayName || user.email;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tab3</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <h1>Welcome to Tab3, {displayName}!</h1>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
