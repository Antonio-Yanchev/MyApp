import React, { useState } from 'react';
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
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './Tab3.css';

// For chart
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// -------------- TYPES --------------
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

// Note: workout might come back as a string or object (depending on GPT's formatting).
type ChatGPTResult = {
  meals: Meal[];
  workout: string | Record<string, any>;
};

type Tab3Props = {
  user: User;
};

const Tab3: React.FC<Tab3Props> = ({ user }) => {
  const displayName = user.displayName || user.email;

    // Replace with your real API keys:
    const OPENAI_API_KEY = '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';
    const USDA_API_KEY = 'IanzK0U4XKzv8hi50hZqD3gfkcBmodWurWh1gIsS';

  // ---------- STATE ----------
  const [ingredients, setIngredients] = useState('');
  const [muscleGroups, setMuscleGroups] = useState('');
  const [timeSpent, setTimeSpent] = useState('');

  const [useUSDA, setUseUSDA] = useState(false);

  const [loading, setLoading] = useState(false);
  const [mealData, setMealData] = useState<Meal[] | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<string | Record<string, any> | null>(null);

  // ---------- For the Meal Details Modal ----------
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealModal, setShowMealModal] = useState(false);

  // ---------- For the Workout Plan Modal ----------
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);

  // -------------- Logout --------------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for more details.');
    }
  };

  // -------------- USDA FETCH HELPER --------------
  async function fetchIngredientMacros(
    ingredientName: string,
    quantity: string
  ): Promise<{ protein: number; carbs: number; fat: number; sugars: number }> {
    try {
      const baseUrl = 'https://api.nal.usda.gov/fdc/v1/foods/search';
      const params = new URLSearchParams({
        api_key: USDA_API_KEY,
        query: ingredientName,
      });
      const response = await fetch(`${baseUrl}?${params}`);
      if (!response.ok) {
        console.error('USDA response status:', response.status, response.statusText);
        return { protein: 0, carbs: 0, fat: 0, sugars: 0 };
      }
      const data = await response.json();
      if (!data.foods || data.foods.length === 0) {
        return { protein: 0, carbs: 0, fat: 0, sugars: 0 };
      }
      const food = data.foods[0];
      const nutrients = food.foodNutrients || [];

      const protein = nutrients.find((n: any) => n.nutrientNumber === '203')?.value || 0;
      const fat = nutrients.find((n: any) => n.nutrientNumber === '204')?.value || 0;
      const carbs = nutrients.find((n: any) => n.nutrientNumber === '205')?.value || 0;
      const sugars = nutrients.find((n: any) => n.nutrientNumber === '269')?.value || 0;

      return {
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        sugars: Number(sugars),
      };
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
        const macros = await fetchIngredientMacros(ing.item, ing.quantity);
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

  // -------------- Generate (ChatGPT) --------------
  const handleGenerate = async () => {
    setLoading(true);
    setMealData(null);
    setWorkoutPlan(null);

    try {
      // Build prompt
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI.');
      }

      const content = data.choices[0].message.content;
      let parsed: ChatGPTResult | null = null;

      try {
        parsed = JSON.parse(content);
      } catch (err) {
        console.error('Failed to parse JSON from ChatGPT:', err);
        console.log('Raw content:', content);
        throw new Error('Invalid JSON from ChatGPT.');
      }

      if (!parsed) {
        throw new Error('Parsed data is null — possibly invalid JSON.');
      }

      let finalMeals = parsed.meals;

      // If user wants USDA-based macros, override the GPT placeholders
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

  // -------------- CLEAR PLAN --------------
  const handleClear = () => {
    setMealData(null);
    setWorkoutPlan(null);
    setIngredients('');
    setMuscleGroups('');
    setTimeSpent('');
  };

  // -------------- Meal Modal --------------
  const openMealModal = (meal: Meal) => {
    setSelectedMeal(meal);
    setShowMealModal(true);
  };
  const closeMealModal = () => {
    setSelectedMeal(null);
    setShowMealModal(false);
  };

  // -------------- Workout Modal --------------
  const openWorkoutModal = () => {
    setShowWorkoutModal(true);
  };
  const closeWorkoutModal = () => {
    setShowWorkoutModal(false);
  };

  // -------------- RENDER --------------
  return (
    <IonPage>
      {/* HEADER */}
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Meal & Workout Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* CONTENT (scrollable) */}
      <IonContent>
        <IonGrid>
          <IonRow>
            {/* LEFT SIDEBAR */}
            <IonCol size="12" sizeLg="3" className="sidebar">
              <h2 className="app-title">Dashboard</h2>
              <IonButton expand="block" routerLink="/tab2" color="primary">
                RECORD EXERCISES
              </IonButton>
              <IonButton expand="block" routerLink="/tab1" color="primary">
                Diary Recordings
              </IonButton>
              <IonButton
                expand="block"
                onClick={handleLogout}
                color="danger"
                className="logout-button"
              >
                LOGOUT
              </IonButton>
            </IonCol>

            {/* MAIN CONTENT */}
            <IonCol size="12" sizeLg="9" className="main-content">
              <h2>Welcome, {displayName}!</h2>

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

              {/* Generate / Clear Buttons */}
              <div className="generate-plan-bar">
                <IonButton onClick={handleGenerate} color="primary">
                  GENERATE PLAN
                </IonButton>
                <IonButton onClick={handleClear} color="medium" style={{ marginLeft: '8px' }}>
                  CLEAR PLAN
                </IonButton>
              </div>

              {/* Loading Spinner */}
              {loading && <IonSpinner name="crescent" />}

              {/* MEALS LIST */}
              {mealData && (
                <IonList>
                  {mealData.map((meal, index) => (
                    <IonCard key={index}>
                      <IonCardHeader>
                        <IonCardTitle>{meal.name}</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <p><strong>Ingredients:</strong> {meal.ingredients.length} items</p>
                        <p><strong>Protein:</strong> {meal.macros.protein}g</p>
                        <IonButton
                          fill="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMealModal(meal);
                          }}
                        >
                          VIEW DETAILS
                        </IonButton>
                      </IonCardContent>
                    </IonCard>
                  ))}
                </IonList>
              )}

              {/* WORKOUT */}
              {workoutPlan && (
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Workout Plan</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonButton onClick={openWorkoutModal} color="secondary">
                      View Full Workout
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              )}
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>

      {/* FOOTER */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>

      {/* ============ MEAL DETAILS MODAL ============ */}
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

      
  
        {/* ============ WORKOUT DETAILS MODAL ============ */}
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
    {workoutPlan && (
      typeof workoutPlan === 'string'
        ? (
          // If GPT returns a string, we can simply display it as bullet points.
          // One simplistic approach: split by newlines or periods and make <li> for each.
          <div>
            {workoutPlan
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
          // Otherwise, it's likely an object with { "warm-up", "main", "cooldown" }.
          <div>
            {/* Warm-up */}
            <h3>Warm-up</h3>
            <ul>
              {workoutPlan["warm-up"]
                .split('.')
                .map((step: string, idx: number) => {
                  const trimmed = step.trim();
                  if (!trimmed) return null;
                  return <li key={idx}>{trimmed}.</li>;
                })
              }
            </ul>

            {/* Main */}
            <h3>Main</h3>
            <ul>
              {workoutPlan.main
                .split('.')
                .map((step: string, idx: number) => {
                  const trimmed = step.trim();
                  if (!trimmed) return null;
                  return <li key={idx}>{trimmed}.</li>;
                })
              }
            </ul>

            {/* Cooldown */}
            <h3>Cooldown</h3>
            <ul>
              {workoutPlan.cooldown
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
