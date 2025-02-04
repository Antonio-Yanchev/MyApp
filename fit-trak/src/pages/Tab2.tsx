// Tab2.tsx
import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/react';
import { User } from 'firebase/auth';

type Tab2Props = {
  user: User;
};

const Tab2: React.FC<Tab2Props> = ({ user }) => {
  const displayName = user.displayName || user.email;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tab2</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <h1>Welcome to Tab2, {displayName}!</h1>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
