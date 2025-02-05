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
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

import { auth } from './firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

import Login from './pages/Login';
import Register from './pages/Register';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';

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
        <IonMenu contentId="main-content" side="start">
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>Menu</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              {/* These IonItems navigate to Tab1/Tab2/Tab3 */}
              <IonItem routerLink="/tab1" routerDirection="root">
                Tab1
              </IonItem>
              <IonItem routerLink="/tab2" routerDirection="root">
                Tab2
              </IonItem>
              <IonItem routerLink="/tab3" routerDirection="root">
                Tab3
              </IonItem>
              {/* Add more links as needed */}
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
