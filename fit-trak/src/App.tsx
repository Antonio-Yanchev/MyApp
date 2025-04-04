// App.tsx
import React, { useState, useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonMenuToggle,        // <-- IMPORT HERE
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import { auth } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Tab1 from './pages/NutritionLogging';
import Tab2 from './pages/ExerciseRecording';
import Tab3 from './pages/Meal-WorkoutGeneration';

/* Ionic & CSS imports */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);  // Add a loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log('onAuthStateChanged user:', fbUser);
      setUser(fbUser);
      setLoading(false); // Stop loading after checking auth state
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Show a loading screen while checking auth
  }

  const loggedIn = !!user;

  return (
    <IonApp>
      <IonReactRouter>
        <IonMenu contentId="main-content" side="start" swipeGesture={false}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Menu</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent>
            <IonList>
              <IonMenuToggle autoHide={false}>
                <IonItem routerLink="/NutritionLogging" routerDirection="root">
                  NutritionLogging
                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle autoHide={false}>
                <IonItem routerLink="/ExerciseRecording" routerDirection="root">
                  ExerciseRecording
                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle autoHide={false}>
                <IonItem routerLink="/Meal-WorkoutGeneration" routerDirection="root">
                  Meal-WorkoutGeneration
                </IonItem>
              </IonMenuToggle>
            </IonList>
          </IonContent>
        </IonMenu>

        <IonRouterOutlet id="main-content">
          {/* Public routes */}
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/register">
            <Register />
          </Route>
          <Route exact path="/forgot-password">
            <ForgotPassword />
          </Route>

          {/* Protected routes */}
          <Route exact path="/NutritionLogging">
            {loggedIn ? <Tab1 user={user!} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/ExerciseRecording">
            {loggedIn ? <Tab2 user={user!} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/Meal-WorkoutGeneration">
            {loggedIn ? <Tab3 user={user!} /> : <Redirect to="/login" />}
          </Route>

          {/* Default route */}
          <Route exact path="/">
            {loggedIn ? <Redirect to="/NutritionLogging" /> : <Redirect to="/login" />}
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;