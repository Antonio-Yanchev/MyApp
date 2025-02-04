// App.tsx
import React, { useState, useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
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

/* Ionic CSS Imports */
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
  // Store the actual Firebase user object here.
  const [user, setUser] = useState<User | null>(null);

  // onAuthStateChanged sets 'user' whenever Firebase detects sign-in/out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log("onAuthStateChanged user:", fbUser);
      setUser(fbUser);
    });
    return () => unsubscribe();
  }, []);

  // We can use this boolean to protect routes in a basic way.
  const loggedIn = !!user;

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Public routes: */}
          <Route exact path="/login">
            <Login />
          </Route>
          <Route exact path="/register">
            <Register />
          </Route>

          {/* Protected routes: only show the tab pages if 'user' is not null. */}
          <Route exact path="/tab1">
            {loggedIn ? <Tab1 user={user!} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/tab2">
            {loggedIn ? <Tab2 user={user!} /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/tab3">
            {loggedIn ? <Tab3 user={user!} /> : <Redirect to="/login" />}
          </Route>

          {/* Default route: redirect to /login if no path is matched. */}
          <Route exact path="/">
            <Redirect to="/login" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
