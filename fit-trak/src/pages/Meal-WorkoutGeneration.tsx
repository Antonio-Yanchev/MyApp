import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonList,
  IonModal,
  IonListHeader,
  IonIcon
} from '@ionic/react';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import {
  doc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';

import './Meal-WorkoutGeneration.css';

import { callOpenaiMealWorkout, callUsdaFoodSearch } from '../services/cloudFunctions';
import { extractMacrosFromUsdaFood } from '../utils/usdaNutrients';

import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

import { star } from 'ionicons/icons';

ChartJS.register(ArcElement, Tooltip, Legend);

type Ingredient = {
  item: string;
  quantity: string;
};

type Meal = {
  name: string;
  instructions: string;
  ingredients: Ingredient[];
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    sugars: number;
  };
};

type ChatGPTResult = {
  meals: Meal[];
  workout: string | Record<string, any>;
};

interface Favorite {
  id: string; // Firestore doc ID
  type: 'meal' | 'workout';
  createdAt?: any; // serverTimestamp
  meal?: Meal;
  workout?: string | Record<string, any>;
}

type Tab3Props = {
  user: User;
};

const Tab3: React.FC<Tab3Props> = ({ user }) => {
  const displayName = user.displayName || user.email || 'User';

  // ---------- State ----------
  const [ingredients, setIngredients] = useState('');
  const [muscleGroups, setMuscleGroups] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [useUSDA, setUseUSDA] = useState(false);

  const [loading, setLoading] = useState(false);
  const [mealData, setMealData] = useState<Meal[] | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<string | Record<string, any> | null>(null);

  // Meal modal
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);

  // Workout modal
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | Record<string, any> | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // ---------- Logout ----------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for more details.');
    }
  };

  // ---------- USDA macros helper ----------
  async function fetchIngredientMacros(
    ingredientName: string
  ): Promise<{ protein: number; carbs: number; fat: number; sugars: number }> {
    try {
      const data = await callUsdaFoodSearch(ingredientName);
      const foods = data.foods as
        | Array<{ foodNutrients?: Array<{ nutrientNumber?: string; value?: number }> }>
        | undefined;
      if (!foods || foods.length === 0) {
        return { protein: 0, carbs: 0, fat: 0, sugars: 0 };
      }
      return extractMacrosFromUsdaFood(foods[0]);
    } catch (error) {
      console.error('Error fetching macros from USDA:', error);
      return { protein: 0, carbs: 0, fat: 0, sugars: 0 };
    }
  }

  async function overrideMealMacrosWithUSDA(meals: Meal[]): Promise<Meal[]> {
    const updatedMeals: Meal[] = [];
    for (const meal of meals) {
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalSugars = 0;

      for (const ing of meal.ingredients) {
        const macros = await fetchIngredientMacros(ing.item);
        totalProtein += macros.protein;
        totalCarbs += macros.carbs;
        totalFat += macros.fat;
        totalSugars += macros.sugars;
      }

      updatedMeals.push({
        ...meal,
        macros: {
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          sugars: Math.round(totalSugars),
        },
      });
    }
    return updatedMeals;
  }

  // ---------- Generate Plan (ChatGPT) ----------
  const handleGenerate = async () => {
    setLoading(true);
    setMealData(null);
    setWorkoutPlan(null);

    try {
      const prompt = `
      You are a helpful nutrition and fitness AI. The user has the following details:
      - Ingredients available (with total amounts): ${ingredients}
      - Please use ALL of these ingredient quantities across 4 meals (Breakfast, Lunch, Dinner, Snack).
      - Muscle groups to train: ${muscleGroups}
      - Time available for the gym: ${timeSpent || '1 hour'}
      
      if no input in ingredients don't generate anything for the meals part only!
      1) Generate 4 meal suggestions that:
         - Use/distribute ALL the ingredients in their full quantity
         - Keep total daily kcal ~1800-2000, with ~120g protein or more
         - For each meal, provide:
              "name"
              "instructions"
              "ingredients" (an array of {item, quantity})
              "macros" ({protein, carbs, fat, sugars})
      
      2) Generate a workout plan that suits the muscle groups & time. 
         Provide a structure, e.g.:
         {
           "warm-up": "...",
           "main": "...",
           "cooldown": "..."
         }
      
      Return JSON ONLY in this format (no extra text):
      {
        "meals": [
          {
            "name": "...",
            "instructions": "...",
            "ingredients": [...],
            "macros": {
              "protein": ...,
              "carbs": ...,
              "fat": ...,
              "sugars": ...
            }
          },
          ...
        ],
        "workout": {
           "warm-up": "...",
           "main": "...",
           "cooldown": "..."
        }
      }
            `;

      const { content } = await callOpenaiMealWorkout(prompt);
      if (!content) {
        throw new Error('No response from OpenAI.');
      }
      let parsed: ChatGPTResult | null = null;

      try {
        parsed = JSON.parse(content);
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        throw new Error('Invalid JSON from ChatGPT.');
      }

      if (!parsed) {
        throw new Error('Parsed data is null.');
      }

      let finalMeals = parsed.meals;
      if (useUSDA) {
        finalMeals = await overrideMealMacrosWithUSDA(parsed.meals);
      }

      setMealData(finalMeals);
      setWorkoutPlan(parsed.workout);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Clear Plan ----------
  const handleClear = () => {
    setMealData(null);
    setWorkoutPlan(null);
    setIngredients('');
    setMuscleGroups('');
    setTimeSpent('');
  };

  // ---------- Meal Modal ----------
  const openMealModal = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowMealModal(true);
  };
  const closeMealModal = () => {
    setSelectedMeal(null);
    setShowMealModal(false);
  };

  // ---------- Workout Modal ----------
  const openWorkoutModal = (plan: string | Record<string, any>) => {
    setSelectedWorkout(plan);
    setShowWorkoutModal(true);
  };
  const closeWorkoutModal = () => {
    setSelectedWorkout(null);
    setShowWorkoutModal(false);
  };

  // ============= Favorites =============
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const favoritesRef = collection(db, 'users', user.uid, 'favorites');
        const snapshot = await getDocs(favoritesRef);
        const favs: Favorite[] = [];
        snapshot.forEach((docSnap) => {
          favs.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Favorite, 'id'>),
          });
        });
        setFavorites(favs);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };
    fetchFavorites();
  }, [user.uid]);

  const handleAddMealToFavorites = async (meal: Meal) => {
    try {
      const favoritesRef = collection(db, 'users', user.uid, 'favorites');
      const docRef = await addDoc(favoritesRef, {
        type: 'meal',
        meal,
        createdAt: serverTimestamp(),
      });
      setFavorites((prev) => [
        ...prev,
        { id: docRef.id, type: 'meal', meal, createdAt: new Date() },
      ]);
      alert(`Meal "${meal.name}" added to favorites!`);
    } catch (error) {
      console.error('Error adding meal to favorites:', error);
      alert('Could not add meal to favorites.');
    }
  };

  const handleAddWorkoutToFavorites = async () => {
    if (!workoutPlan) {
      return alert('No workout plan available.');
    }
    try {
      const favoritesRef = collection(db, 'users', user.uid, 'favorites');
      const docRef = await addDoc(favoritesRef, {
        type: 'workout',
        workout: workoutPlan,
        createdAt: serverTimestamp(),
      });
      setFavorites((prev) => [
        ...prev,
        { id: docRef.id, type: 'workout', workout: workoutPlan, createdAt: new Date() },
      ]);
      alert('Workout plan added to favorites!');
    } catch (error) {
      console.error('Error adding workout to favorites:', error);
      alert('Could not add workout to favorites.');
    }
  };

  const mealFaves = favorites.filter((f) => f.type === 'meal' && f.meal);
  const workoutFaves = favorites.filter((f) => f.type === 'workout' && f.workout);

  const handleFavoriteClick = (fav: Favorite) => {
    if (fav.type === 'meal' && fav.meal) {
      openMealModal(fav.meal);
    } else if (fav.type === 'workout' && fav.workout) {
      openWorkoutModal(fav.workout);
    }
  };

  const handleRemoveFavorite = async (fav: Favorite) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'favorites', fav.id));
      setFavorites((prev) => prev.filter((x) => x.id !== fav.id));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Could not remove favorite.');
    }
  };

  return (
    // 1) Add an extra class to IonPage to control scrolling in CSS
    <IonPage className="tab3-page no-ion-scroll">
      {/* HEADER */}
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Meal & Workout</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* 2) IonContent: disable scroll because we'll use flex + CSS scrolling */}
      <IonContent scrollY={false}>
        {/* 3) Overall layout container */}
        <div className="tab3-layout">
          
          {/* SIDEBAR */}
          <div className="tab3-sidebar">
            <h2 className="app-title">Dashboard</h2>
            <p className="hello-user-text">Hello, {displayName}!</p>

            <IonButton expand="block" routerLink="/ExerciseRecording" color="primary">
              Record Exercises
            </IonButton>
            <IonButton expand="block" routerLink="/NutritionLogging" color="primary">
              Nutrition Recording
            </IonButton>

            {/* Favorites */}
            <IonListHeader>Meal Favourites:</IonListHeader>
            <IonList>
              {mealFaves.map((fav) => (
                <IonItem
                  key={fav.id}
                  button
                  onClick={() => handleFavoriteClick(fav)}
                >
                  <IonIcon icon={star} slot="start" />
                  <IonLabel>{fav.meal?.name}</IonLabel>
                  <IonButton
                    color="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(fav);
                    }}
                  >
                    REMOVE
                  </IonButton>
                </IonItem>
              ))}
            </IonList>

            <IonListHeader>Workout Favourites:</IonListHeader>
            <IonList>
              {workoutFaves.map((fav) => (
                <IonItem
                  key={fav.id}
                  button
                  onClick={() => handleFavoriteClick(fav)}
                >
                  <IonIcon icon={star} slot="start" />
                  <IonLabel>Workout Plan</IonLabel>
                  <IonButton
                    color="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(fav);
                    }}
                  >
                    REMOVE
                  </IonButton>
                </IonItem>
              ))}
            </IonList>

            {/* Logout pinned at bottom */}
            <IonButton
              expand="block"
              onClick={handleLogout}
              color="danger"
              className="logout-button"
            >
              Log out
            </IonButton>
          </div>

          {/* MAIN CONTENT */}
          <div className="tab3-main-content">
            <IonItem>
              <IonLabel position="stacked">Ingredients (comma-separated)</IonLabel>
              <IonInput
                value={ingredients}
                placeholder="e.g. 500g beef, 500g rice, 2 eggs"
                onIonChange={(e) => setIngredients(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Muscle Groups</IonLabel>
              <IonInput
                value={muscleGroups}
                placeholder="e.g. chest, back, legs"
                onIonChange={(e) => setMuscleGroups(e.detail.value!)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Time Spent at Gym</IonLabel>
              <IonInput
                value={timeSpent}
                placeholder="e.g. 1 hour, 90 minutes"
                onIonChange={(e) => setTimeSpent(e.detail.value!)}
              />
            </IonItem>

            <IonItem>
              <IonLabel>Use USDA for Real Macros?</IonLabel>
              <IonButton
                color={useUSDA ? 'success' : 'medium'}
                onClick={() => setUseUSDA(!useUSDA)}
              >
                {useUSDA ? 'Yes' : 'No'}
              </IonButton>
            </IonItem>

            <div className="generate-plan-bar">
              <IonButton onClick={handleGenerate} color="primary">
                Generate Plan
              </IonButton>
              <IonButton onClick={handleClear} color="medium" style={{ marginLeft: '8px' }}>
                Clear Plan
              </IonButton>
            </div>

            {loading && <IonSpinner name="crescent" />}

            {/* Show Meals */}
            {mealData && (
              <IonList>
                {mealData.map((meal, i) => (
                  <IonCard key={i}>
                    <IonCardHeader>
                      <IonCardTitle>{meal.name}</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p>
                        <strong>Ingredients:</strong> {meal.ingredients.length} items
                      </p>
                      <p>
                        <strong>Protein:</strong> {meal.macros.protein}g
                      </p>
                      <IonButton
                        fill="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMealModal(meal);
                        }}
                      >
                        VIEW DETAILS
                      </IonButton>
                      <IonButton
                        color="secondary"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddMealToFavorites(meal);
                        }}
                      >
                        FAVOURITE
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                ))}
              </IonList>
            )}

            {/* Workout Plan */}
            {workoutPlan && (
              <IonCard>
                <IonCardHeader>
                  <IonCardTitle>Workout Plan</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <IonButton onClick={() => openWorkoutModal(workoutPlan)} color="secondary">
                    VIEW FULL WORKOUT
                  </IonButton>
                  <IonButton
                    color="tertiary"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={handleAddWorkoutToFavorites}
                  >
                    FAVOURITE
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}
          </div>
        </div>
      </IonContent>

      {/* FOOTER */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle className="footer-title3"> © 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>

      {/* MEAL MODAL */}
      <IonModal isOpen={showMealModal} onDidDismiss={closeMealModal}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>{selectedMeal?.name || 'Meal Details'}</IonTitle>
            <IonButton slot="end" onClick={closeMealModal}>
              CLOSE
            </IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedMeal && (
            <>
              <p><strong>Ingredients:</strong></p>
              <ul>
                {selectedMeal.ingredients.map((ing, i) => (
                  <li key={i}>{ing.quantity} of {ing.item}</li>
                ))}
              </ul>
              <p><strong>Instructions:</strong> {selectedMeal.instructions}</p>
              <p>
                <strong>Macros:</strong><br />
                Protein: {selectedMeal.macros.protein}g<br />
                Carbs: {selectedMeal.macros.carbs}g<br />
                Fat: {selectedMeal.macros.fat}g<br />
                Sugars: {selectedMeal.macros.sugars}g
              </p>
              <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                <Pie
                  data={{
                    labels: ['Protein', 'Carbs', 'Fat', 'Sugars'],
                    datasets: [
                      {
                        data: [
                          selectedMeal.macros.protein,
                          selectedMeal.macros.carbs,
                          selectedMeal.macros.fat,
                          selectedMeal.macros.sugars
                        ],
                        backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#8e44ad'],
                      },
                    ],
                  }}
                />
              </div>
            </>
          )}
        </IonContent>
      </IonModal>

      {/* WORKOUT MODAL */}
      <IonModal isOpen={showWorkoutModal} onDidDismiss={closeWorkoutModal}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Workout Plan</IonTitle>
            <IonButton slot="end" onClick={closeWorkoutModal}>
              CLOSE
            </IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedWorkout && (
            typeof selectedWorkout === 'string'
              ? (
                <div>
                  {selectedWorkout
                    .split('.')
                    .map((sentence, idx) => {
                      const trimmed = sentence.trim();
                      if (!trimmed) return null;
                      return <li key={idx}>{trimmed}.</li>;
                    })
                  }
                </div>
              )
              : (
                <div>
                  <h3>Warm-up</h3>
                  <ul>
                    {selectedWorkout["warm-up"]
                      .split('.')
                      .map((step: string, idx: number) => {
                        const trimmed = step.trim();
                        if (!trimmed) return null;
                        return <li key={idx}>{trimmed}.</li>;
                      })
                    }
                  </ul>
                  <h3>Main</h3>
                  <ul>
                    {selectedWorkout.main
                      .split('.')
                      .map((step: string, idx: number) => {
                        const trimmed = step.trim();
                        if (!trimmed) return null;
                        return <li key={idx}>{trimmed}.</li>;
                      })
                    }
                  </ul>
                  <h3>Cooldown</h3>
                  <ul>
                    {selectedWorkout.cooldown
                      .split('.')
                      .map((step: string, idx: number) => {
                        const trimmed = step.trim();
                        if (!trimmed) return null;
                        return <li key={idx}>{trimmed}.</li>;
                      })
                    }
                  </ul>
                </div>
              )
          )}
        </IonContent>
      </IonModal>
    </IonPage>
  );
};

export default Tab3;
