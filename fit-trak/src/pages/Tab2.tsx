import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonDatetime,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCol,
  IonRow,
  IonGrid,
} from '@ionic/react';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';
import './Tab2.css';

type Tab2Props = {
  user: User;
};

interface ExerciseEntry {
  id: string;
  userId: string;
  exerciseName: string;
  duration: number;
  dateTime: string; // ISO string (e.g. "2025-02-22T15:30:00.000Z")
  notes?: string;
  createdAt?: any; // or firebase.firestore.Timestamp if you prefer
}

const Tab2: React.FC<Tab2Props> = ({ user }) => {
  const displayName = user.displayName || user.email || 'Anonymous';

  // Form state
  const [exerciseName, setExerciseName] = useState('');
  const [duration, setDuration] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');

  // State to hold all fetched exercises
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for details.');
    }
  };

  // Save exercise to Firestore under /users/<uid>/exercises
  const handleSaveExercise = async () => {
    if (!exerciseName.trim() || !duration.trim() || !dateTime.trim()) {
      alert('Please fill in Exercise Name, Duration, and Date & Time before saving.');
      return;
    }

    try {
      await addDoc(
        collection(db, 'users', user.uid, 'exercises'),
        {
          userId: user.uid,
          exerciseName,
          duration: parseInt(duration, 10),
          dateTime,
          notes,
          createdAt: serverTimestamp(),
        }
      );

      alert('Exercise saved successfully!');
      // Reset form
      setExerciseName('');
      setDuration('');
      setDateTime('');
      setNotes('');

      // Refetch exercises so our UI updates immediately
      fetchExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Error saving exercise. Check console for more details.');
    }
  };

  // Fetch exercises from Firestore (ordered by dateTime descending)
  const fetchExercises = async () => {
    try {
      const exercisesRef = collection(db, 'users', user.uid, 'exercises');
      const q = query(exercisesRef, orderBy('dateTime', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetched: ExerciseEntry[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({
          id: doc.id,
          ...(doc.data() as Omit<ExerciseEntry, 'id'>),
        });
      });

      setExercises(fetched);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  // On component mount (and if user.uid changes), fetch exercises
  useEffect(() => {
    fetchExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  // Group exercises by date (YYYY-MM-DD)
  const groupedExercises: Record<string, ExerciseEntry[]> = {};
  exercises.forEach((entry) => {
    // Convert the ISO dateTime string to just YYYY-MM-DD
    // IonDatetime typically returns an ISO string
    const datePart = entry.dateTime.split('T')[0]; // e.g. "2025-02-22"
    if (!groupedExercises[datePart]) {
      groupedExercises[datePart] = [];
    }
    groupedExercises[datePart].push(entry);
  });

  return (
    <IonPage>
      <div className="tab2-app-container">
        {/* Sidebar */}
        <div className="tab2-sidebar">
          <h2 className="tab2-app-title">Fit-Trak</h2>
          <IonButton expand="block" routerLink="/tab1">
            Tab1
          </IonButton>
          <IonButton expand="block" routerLink="/tab3">
            Tab3
          </IonButton>
          <IonButton expand="block" color="danger" onClick={handleLogout}>
            Logout
          </IonButton>
        </div>

        {/* Main Content */}
        <div className="tab2-main-content">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Record Exercise</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <h1>Welcome, {displayName}!</h1>
            <h2>Record Your Exercise</h2>

            <IonList>
              <IonItem>
                <IonLabel position="stacked">Exercise Name</IonLabel>
                <IonInput
                  value={exerciseName}
                  placeholder="e.g., Running"
                  onIonChange={(e) => setExerciseName(e.detail.value!)}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Duration (minutes)</IonLabel>
                <IonInput
                  type="number"
                  value={duration}
                  placeholder="e.g., 30"
                  onIonChange={(e) => setDuration(e.detail.value!)}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Date & Time</IonLabel>
                <IonDatetime
                  presentation="date-time"
                  value={dateTime}
                  onIonChange={(e) => {
                    const val = Array.isArray(e.detail.value)
                      ? e.detail.value[0]
                      : e.detail.value;
                    setDateTime(val || '');
                  }}
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Notes</IonLabel>
                <IonTextarea
                  value={notes}
                  placeholder="Additional details..."
                  onIonChange={(e) => setNotes(e.detail.value!)}
                />
              </IonItem>
            </IonList>

            <IonButton expand="block" color="success" onClick={handleSaveExercise}>
              Save Exercise
            </IonButton>

            {/* Display grouped exercises by date */}
            <h2 style={{ marginTop: '2rem' }}>Your Exercises</h2>
            <IonGrid>
              {Object.keys(groupedExercises).length === 0 ? (
                <IonRow>
                  <IonCol>
                    <p>No exercises yet. Add some!</p>
                  </IonCol>
                </IonRow>
              ) : (
                Object.keys(groupedExercises).map((date) => (
                  <IonRow key={date}>
                    <IonCol size="12">
                      <IonCard>
                        <IonCardHeader>
                          <IonCardTitle>{date}</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                          {groupedExercises[date].map((entry) => (
                            <div key={entry.id} style={{ marginBottom: '1rem' }}>
                              <strong>{entry.exerciseName}</strong> <br />
                              Duration: {entry.duration} min
                              {entry.notes && <p>Notes: {entry.notes}</p>}
                            </div>
                          ))}
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  </IonRow>
                ))
              )}
            </IonGrid>
          </IonContent>

          <IonFooter>
            <IonToolbar>
              <IonTitle>© 2025 FIT-TRAK</IonTitle>
            </IonToolbar>
          </IonFooter>
        </div>
      </div>
    </IonPage>
  );
};

export default Tab2;
