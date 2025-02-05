import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonFooter  // <--- Make sure to import IonFooter
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { User } from 'firebase/auth';

type Tab1Props = {
  user: User;
};

const Tab1: React.FC<Tab1Props> = ({ user }) => {
  const displayName = user.displayName || user.email;
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Tab1</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h1>Welcome to Tab1, {displayName}!</h1>
        <IonButton routerLink="/tab2" color="primary">
          Go to Tab2
        </IonButton>
        <IonButton routerLink="/tab3" color="secondary">
          Go to Tab3
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

export default Tab1;