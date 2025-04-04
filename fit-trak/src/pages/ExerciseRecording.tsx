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
  IonModal,
  IonButtons,
  useIonAlert,
  IonIcon,
  IonListHeader,
} from '@ionic/react';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ChartOptions,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js';

import { auth, db } from '../firebaseConfig';
import './ExerciseRecording.css';
import { pin, closeCircle } from 'ionicons/icons';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const MET_VALUES: Record<string, number> = {
  running: 9.8,
  walking: 3.5,
  football: 7.0,
  swimming: 8.0,
  // add more if you like
};

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  layout: {
    padding: { top: 20, bottom: 20 },
  },
  plugins: {
    title: {
      display: true,
      text: 'Duration vs. Calories Burned',
    },
    legend: {
      position: 'top',
    },
  },
  scales: {
    yMinutes: {
      type: 'linear',
      position: 'left',
      title: {
        display: true,
        text: 'Minutes',
      },
      ticks: { font: { size: 12 } },
    },
    yCalories: {
      type: 'linear',
      position: 'right',
      title: {
        display: true,
        text: 'Calories (kcal)',
      },
      ticks: {
        font: { size: 12 },
        callback: (value) => `${value} kcal`,
      },
      grid: {
        drawOnChartArea: false,
      },
    },
  },
};

interface ExerciseEntry {
  id: string;
  userId: string;
  exerciseName: string;
  duration: number;
  dateTime: string; // ISO date string (2025-03-26T15:14, etc.)
  notes?: string;
  createdAt?: any;
  caloriesBurned?: number;
}

interface PinnedExercise {
  id: string;         // doc ID in Firestore pinnedExercises
  exercise: ExerciseEntry;
  pinnedAt?: any;     // serverTimestamp
}

type Tab2Props = {
  user: User;
};

const Tab2: React.FC<Tab2Props> = ({ user }) => {
  const [presentAlert] = useIonAlert();

  // Profile
  const [userWeight, setUserWeight] = useState<number | null>(null);
  const [userHeight, setUserHeight] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Exercise form
  const [exerciseName, setExerciseName] = useState('');
  const [duration, setDuration] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [notes, setNotes] = useState('');

  // Exercises
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);

  // Chart
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseEntry | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseEntry | null>(null);

  // Pinned
  const [pinnedExercises, setPinnedExercises] = useState<PinnedExercise[]>([]);

  const displayName = user.displayName || user.email || 'User';

  // ===== 1) FETCH USER PROFILE =====
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userDocRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.weight) setUserWeight(data.weight);
          if (data && data.height) setUserHeight(data.height);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user.uid]);

  // ===== 2) SAVE USER PROFILE =====
  const handleSaveProfile = async () => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        { weight: userWeight, height: userHeight },
        { merge: true }
      );
      alert('Profile saved successfully!');
      setShowProfileModal(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Check console.');
    }
  };

  // ===== 3) FETCH EXERCISES =====
  const fetchExercises = async () => {
    try {
      const exercisesRef = collection(db, 'users', user.uid, 'exercises');
      const q = query(exercisesRef, orderBy('dateTime', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetched: ExerciseEntry[] = [];
      querySnapshot.forEach((docSnap) => {
        fetched.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ExerciseEntry, 'id'>),
        });
      });
      setExercises(fetched);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [user.uid]);

  // ===== 4) CREATE NEW EXERCISE =====
  const handleSaveExercise = async () => {
    if (!userWeight) {
      alert('Please set your weight in the Profile first!');
      return;
    }
    if (!exerciseName.trim() || !duration.trim() || !dateTime.trim()) {
      alert('Please fill in Exercise Name, Duration, and Date & Time.');
      return;
    }

    try {
      const exerciseKey = exerciseName.toLowerCase();
      const metValue = MET_VALUES[exerciseKey] || 6.0; // fallback if not found
      const durationInHours = parseInt(duration, 10) / 60;
      const caloriesBurned = Math.round(metValue * userWeight * durationInHours);

      await addDoc(collection(db, 'users', user.uid, 'exercises'), {
        userId: user.uid,
        exerciseName,
        duration: parseInt(duration, 10),
        dateTime,
        notes,
        createdAt: serverTimestamp(),
        caloriesBurned,
      });

      alert('Exercise saved successfully!');
      // Reset form
      setExerciseName('');
      setDuration('');
      setDateTime('');
      setNotes('');
      fetchExercises();
    } catch (error) {
      console.error('Error saving exercise:', error);
      alert('Error saving exercise. Check console.');
    }
  };

  // ===== 5) LOGOUT =====
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for details.');
    }
  };

  // ===== 6) DELETE EXERCISE =====
  const handleDeleteExercise = async (exerciseId: string) => {
    presentAlert({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this exercise?',
      buttons: [
        'Cancel',
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.uid, 'exercises', exerciseId));
              fetchExercises();
            } catch (error) {
              console.error('Error deleting exercise:', error);
              alert('Error deleting exercise. See console for details.');
            }
          },
        },
      ],
    });
  };

  // ===== 7) EDIT EXERCISE =====
  const openEditModal = (exercise: ExerciseEntry) => {
    setExerciseToEdit(exercise);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!exerciseToEdit) return;
    if (
      !exerciseToEdit.exerciseName.trim() ||
      !exerciseToEdit.duration ||
      !exerciseToEdit.dateTime
    ) {
      alert('Please fill in all required fields for editing.');
      return;
    }

    try {
      const exerciseKey = exerciseToEdit.exerciseName.toLowerCase();
      const metValue = MET_VALUES[exerciseKey] || 6.0;
      const durationInHours = exerciseToEdit.duration / 60;
      const newCalories = Math.round(metValue * (userWeight || 70) * durationInHours);

      await updateDoc(doc(db, 'users', user.uid, 'exercises', exerciseToEdit.id), {
        exerciseName: exerciseToEdit.exerciseName,
        duration: exerciseToEdit.duration,
        dateTime: exerciseToEdit.dateTime,
        notes: exerciseToEdit.notes,
        caloriesBurned: newCalories,
      });

      alert('Exercise updated successfully!');
      setShowEditModal(false);
      setExerciseToEdit(null);
      fetchExercises();
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Error updating exercise. Check console for details.');
    }
  };

  // ===== 8) OPEN CHART MODAL =====
  const openChartModal = (exercise: ExerciseEntry) => {
    setSelectedExercise(exercise);

    const data = {
      labels: [exercise.exerciseName],
      datasets: [
        {
          label: 'Duration (min)',
          data: [exercise.duration],
          backgroundColor: '#3b83bd',
          yAxisID: 'yMinutes',
          barPercentage: 0.5,
          categoryPercentage: 0.5,
        },
        {
          label: 'Calories Burned',
          data: [exercise.caloriesBurned ?? 0],
          backgroundColor: '#e74c3c',
          yAxisID: 'yCalories',
          barPercentage: 0.5,
          categoryPercentage: 0.5,
        },
      ],
    };
    setChartData(data);

    setShowChartModal(true);
  };

  // ===== PINNED EXERCISES (store in subcollection) =====
  const fetchPinnedExercises = async () => {
    try {
      const pinnedRef = collection(db, 'users', user.uid, 'pinnedExercises');
      const qsnap = await getDocs(pinnedRef);
      const pinned: PinnedExercise[] = [];
      qsnap.forEach((docSnap) => {
        pinned.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PinnedExercise, 'id'>),
        });
      });
      setPinnedExercises(pinned);
    } catch (error) {
      console.error('Error fetching pinned exercises:', error);
    }
  };

  useEffect(() => {
    fetchPinnedExercises();
  }, [user.uid]);

  const handlePinExercise = async (entry: ExerciseEntry) => {
    try {
      const pinnedRef = collection(db, 'users', user.uid, 'pinnedExercises');
      const docRef = await addDoc(pinnedRef, {
        exercise: entry,          // store a copy of the exercise data
        pinnedAt: serverTimestamp(),
      });
      setPinnedExercises((prev) => [
        ...prev,
        { id: docRef.id, exercise: entry, pinnedAt: new Date() },
      ]);
      alert('Exercise pinned!');
    } catch (error) {
      console.error('Error pinning exercise:', error);
      alert('Error pinning exercise. Check console for details.');
    }
  };

  const handleUnpinExercise = async (pinnedId: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'pinnedExercises', pinnedId));
      setPinnedExercises((prev) => prev.filter((x) => x.id !== pinnedId));
    } catch (error) {
      console.error('Error unpinning exercise:', error);
      alert('Error unpinning exercise. Check console for details.');
    }
  };

  // Group main exercises by date
  const groupedExercises: Record<string, ExerciseEntry[]> = {};
  exercises.forEach((entry) => {
    const datePart = entry.dateTime.split('T')[0];
    if (!groupedExercises[datePart]) {
      groupedExercises[datePart] = [];
    }
    groupedExercises[datePart].push(entry);
  });

  return (
    <IonPage className="tab2-page">
      {/* HEADER */}
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Record Exercise</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* CONTENT LAYOUT */}
      <IonContent scrollY={false}>
        <div className="tab2-layout">
          {/* SIDEBAR */}
          <div className="tab2-sidebar">
            <h2 className="tab2-app-title">Dashboard</h2>
            <p className="hello-user-text">Hello, {displayName}!</p>

            <IonButton expand="block" onClick={() => setShowProfileModal(true)}>
              Profile
            </IonButton>
            <IonButton expand="block" routerLink="/NutritionLogging">
              Nutrition recording
            </IonButton>
            <IonButton expand="block" routerLink="/Meal-WorkoutGeneration">
              Generate Meal Plan
            </IonButton>

            {/* PINNED EXERCISES */}
            <IonListHeader>Pinned Exercises</IonListHeader>
            <IonList>
              {pinnedExercises.map((p) => (
                <IonItem
                  key={p.id}
                  button
                  onClick={() => openChartModal(p.exercise)} // view pinned details
                >
                  <IonIcon slot="start" icon={pin} />
                  <IonLabel>{p.exercise.exerciseName}</IonLabel>
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnpinExercise(p.id);
                    }}
                  >
                    <IonIcon icon={closeCircle} slot="icon-only" />
                  </IonButton>
                </IonItem>
              ))}
            </IonList>

            <IonButton
              expand="block"
              color="danger"
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </IonButton>
          </div>

          {/* MAIN CONTENT */}
          <div className="tab2-main-content">
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
              SAVE EXERCISE
            </IonButton>

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
                      <IonCard className="exercise-card">
                        <IonCardHeader>
                          <IonCardTitle>{date}</IonCardTitle>
                        </IonCardHeader>
                        <IonCardContent>
                          {groupedExercises[date].map((entry) => (
                            <div
                              key={entry.id}
                              style={{
                                marginBottom: '1rem',
                                borderBottom: '1px solid #ccc',
                                paddingBottom: '0.5rem',
                                cursor: 'pointer',
                              }}
                              onClick={() => openChartModal(entry)}
                            >
                              <strong>{entry.exerciseName}</strong> <br />
                              Duration: {entry.duration} min
                              {entry.caloriesBurned !== undefined && (
                                <>
                                  <br />
                                  Calories Burned: {entry.caloriesBurned}
                                </>
                              )}
                              {entry.notes && <p>Notes: {entry.notes}</p>}

                              {/* EDIT, DELETE, PIN Buttons */}
                              <IonButtons onClick={(e) => e.stopPropagation()}>
                                <IonButton
                                  className="edit-button"
                                  onClick={() => openEditModal(entry)}
                                >
                                  EDIT
                                </IonButton>
                                <IonButton
                                  className="delete-button"
                                  onClick={() => handleDeleteExercise(entry.id)}
                                >
                                  DELETE
                                </IonButton>
                                <IonButton
                                  fill="outline"
                                  onClick={() => handlePinExercise(entry)}
                                >
                                  PIN
                                </IonButton>
                              </IonButtons>
                            </div>
                          ))}
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  </IonRow>
                ))
              )}
            </IonGrid>
          </div>
        </div>
      </IonContent>

      {/* FOOTER */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>

      {/* PROFILE MODAL */}
      <IonModal isOpen={showProfileModal} onDidDismiss={() => setShowProfileModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit Profile</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Weight (kg)</IonLabel>
            <IonInput
              type="number"
              value={userWeight ?? ''}
              onIonChange={(e) => {
                if (e.detail.value) {
                  setUserWeight(parseInt(e.detail.value, 10));
                }
              }}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Height (cm)</IonLabel>
            <IonInput
              type="number"
              value={userHeight ?? ''}
              onIonChange={(e) => {
                if (e.detail.value) {
                  setUserHeight(parseInt(e.detail.value, 10));
                }
              }}
            />
          </IonItem>
          <IonButton expand="block" color="success" onClick={handleSaveProfile}>
            Save
          </IonButton>
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <IonButton expand="block" onClick={() => setShowProfileModal(false)}>
              Close
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </IonModal>

      {/* CHART MODAL */}
      <IonModal
        isOpen={showChartModal}
        onDidDismiss={() => setShowChartModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            {/* 
              KEY CHANGE: we show exercise date (e.g., 2025-03-26) in the title. 
              .split('T')[0] just grabs YYYY-MM-DD from an ISO string. 
            */}
            <IonTitle>
              {selectedExercise
                ? `${selectedExercise.exerciseName} (${selectedExercise.dateTime.split('T')[0]}) Details`
                : 'Details'}
            </IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedExercise && chartData ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <p>No exercise selected.</p>
          )}
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <IonButton expand="block" onClick={() => setShowChartModal(false)}>
              Close
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </IonModal>

      {/* EDIT MODAL */}
      <IonModal
        isOpen={showEditModal}
        onDidDismiss={() => {
          setShowEditModal(false);
          setExerciseToEdit(null);
        }}
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit Exercise</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {exerciseToEdit ? (
            <>
              <IonItem>
                <IonLabel position="stacked">Exercise Name</IonLabel>
                <IonInput
                  value={exerciseToEdit.exerciseName}
                  onIonChange={(e) =>
                    setExerciseToEdit({
                      ...exerciseToEdit,
                      exerciseName: e.detail.value!,
                    })
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Duration (minutes)</IonLabel>
                <IonInput
                  type="number"
                  value={exerciseToEdit.duration}
                  onIonChange={(e) =>
                    setExerciseToEdit({
                      ...exerciseToEdit,
                      duration: parseInt(e.detail.value!),
                    })
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Date & Time</IonLabel>
                <IonDatetime
                  presentation="date-time"
                  value={exerciseToEdit.dateTime}
                  onIonChange={(e) => {
                    const val = Array.isArray(e.detail.value)
                      ? e.detail.value[0]
                      : e.detail.value;
                    setExerciseToEdit({
                      ...exerciseToEdit,
                      dateTime: val || '',
                    });
                  }}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Notes</IonLabel>
                <IonTextarea
                  value={exerciseToEdit.notes}
                  onIonChange={(e) =>
                    setExerciseToEdit({ ...exerciseToEdit, notes: e.detail.value! })
                  }
                />
              </IonItem>
              <IonButton expand="block" color="success" onClick={handleEditSave}>
                Save Changes
              </IonButton>
            </>
          ) : (
            <p>No exercise selected.</p>
          )}
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <IonButton
              expand="block"
              onClick={() => {
                setShowEditModal(false);
                setExerciseToEdit(null);
              }}
            >
              Close
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </IonModal>
    </IonPage>
  );
};

export default Tab2;
