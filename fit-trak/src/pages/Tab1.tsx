import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/react';
import { User } from 'firebase/auth';
// For approach #2:
import { useHistory } from 'react-router-dom';

type Tab1Props = {
  user: User;
};

const Tab1: React.FC<Tab1Props> = ({ user }) => {
  const displayName = user.displayName || user.email;

  // For approach #2 (programmatic navigation):
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tab1</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>Welcome to Tab1, {displayName}!</h1>

        {/* Approach #1: Using Ionic's routerLink */}
        <IonButton routerLink="/tab2" color="primary">
          Go to Tab2
        </IonButton>
        <IonButton routerLink="/tab3" color="secondary">
          Go to Tab3
        </IonButton>

        {/* Approach #2: Using useHistory */}
        <IonButton
          color="tertiary"
          onClick={() => {
            history.push('/tab2');
          }}
        >
          Go to Tab2 (programmatically)
        </IonButton>
        <IonButton
          color="success"
          onClick={() => {
            history.push('/tab3');
          }}
        >
          Go to Tab3 (programmatically)
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
