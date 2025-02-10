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
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log('onAuthStateChanged user:', fbUser);
      setUser(fbUser);
    });
    return () => unsubscribe();
  }, []);

  const loggedIn = !!user;

  return (
    <IonApp>
      <IonReactRouter>
        {/* -- The side menu (drawer) -- */}
        {/*
          NOTE: swipeGesture={false} means the user CANNOT open the menu by swiping.
          If you only have IonMenuButton on Tab1, the menu won't be accessible from Tab2/Tab3.
        */}
        <IonMenu contentId="main-content" side="start" swipeGesture={false}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Menu</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent>
            <IonList>
              {/* IonMenuToggle ensures the menu closes after clicking each item. */}
              <IonMenuToggle autoHide={false}>
                <IonItem routerLink="/tab1" routerDirection="root">
                  Tab1
                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle autoHide={false}>
                <IonItem routerLink="/tab2" routerDirection="root">
                  Tab2
                </IonItem>
              </IonMenuToggle>

              <IonMenuToggle autoHide={false}>
                <IonItem routerLink="/tab3" routerDirection="root">
                  Tab3
                </IonItem>
              </IonMenuToggle>
            </IonList>
          </IonContent>
        </IonMenu>

        {/* -- Main router outlet, must have the matching id="main-content" -- */}
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
          <Route exact path="/tab1">
            {loggedIn ? <Tab1 user={user!} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/tab2">
            {loggedIn ? <Tab2 user={user!} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/tab3">
            {loggedIn ? <Tab3 user={user!} /> : <Redirect to="/login" />}
          </Route>

          {/* Default route */}
          <Route exact path="/">
            <Redirect to="/login" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
