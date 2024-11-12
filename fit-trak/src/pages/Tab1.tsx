import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonText, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Tab1.css';

const Tab1: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tab 1</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="page-content">
        <IonText className="page-header">
          <h2>Welcome to Antonio's Fitness Tracker!</h2>
        </IonText>
        <IonText className="welcome-text">
          <h1>Track your workouts, log your meals, and achieve your fitness goals.</h1>
        </IonText>

        <IonCard className="ion-card">
          <IonCardHeader className="ion-card-header">
            Today's Progress
          </IonCardHeader>
          <IonCardContent className="ion-card-content">
            <p>Calories burned: 500</p>
            <p>Calories consumed: 1200</p>
            <p>Steps taken: 8000</p>
          </IonCardContent>
        </IonCard>

        <IonButton expand="full" className="ion-button" onClick={() => console.log("Track a new activity!")}>
          Track a New Activity
        </IonButton>

        <ExploreContainer name="Tab 1 page" />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
