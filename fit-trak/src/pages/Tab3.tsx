import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonMenuButton,
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
} from '@ionic/react';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// For calling ChatGPT
// Option A: use the openai library
// import { Configuration, OpenAIApi } from 'openai';

// For the chart
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components so they work
ChartJS.register(ArcElement, Tooltip, Legend);

type Meal = {
  name: string;
  instructions: string;
  ingredients: { item: string; quantity: string }[];
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    sugars: number;
  };
};

type MealPlanResponse = {
  meals: Meal[];
};

type Tab3Props = {
  user: User;
};

const Tab3: React.FC<Tab3Props> = ({ user }) => {
  const displayName = user.displayName || user.email;

  // User inputs
  const [ingredients, setIngredients] = useState('');
  const [muscleGroups, setMuscleGroups] = useState('');

  // State for loading and results
  const [loading, setLoading] = useState(false);
  const [mealData, setMealData] = useState<Meal[] | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<string | null>(null);

  // (Optional) USDA real macros toggle
  const [useUSDA, setUseUSDA] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for more details.');
    }
  };

  // 1. Generate meal plan + workout plan using ChatGPT
  const handleGenerate = async () => {
    setLoading(true);
    setMealData(null);
    setWorkoutPlan(null);

    try {
      // Example prompt. Tweak it for better or more specific results.
      const prompt = `
      I have these ingredients: ${ingredients}.
      I want to train these muscle groups: ${muscleGroups}.
      1) Generate 4 meal suggestions (breakfast, lunch, dinner, snack).
         For each meal, return JSON with:
           name,
           instructions,
           ingredients (array of { item, quantity }),
           macros (protein, carbs, fat, sugars).
      2) Generate a simple workout plan for the given muscle groups.

      Return valid JSON in the format:
      {
        "meals": [
          {
            "name": "...",
            "instructions": "...",
            "ingredients": [
              { "item": "...", "quantity": "..." },
              ...
            ],
            "macros": {
              "protein": 0,
              "carbs": 0,
              "fat": 0,
              "sugars": 0
            }
          },
          ...
        ],
        "workout": "..."
      }
      `;

      // Option A: Using fetch directly
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use your own OpenAI API key here
          Authorization: `Bearer YOUR_OPENAI_API_KEY`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI.');
      }

      // Attempt to parse JSON from the model’s response
      let parsed: { meals: Meal[]; workout: string } | null = null;
      const content = data.choices[0].message.content;

      try {
        parsed = JSON.parse(content);
      } catch (err) {
        // If the AI doesn't return valid JSON, handle gracefully
        console.error('Failed to parse JSON from ChatGPT:', err);
        console.log('Raw content:', content);
        throw new Error('Invalid JSON from ChatGPT. Check console logs.');
      }

      // Now we have something like { meals: [...], workout: "..." }
      if (parsed) {
        // 2. (Optional) For each meal, call USDA for real macros
        if (useUSDA) {
          for (let m of parsed.meals) {
            // We have an array of { item, quantity }
            // You would call the USDA API for each ingredient to get real macros
            // and sum them up. This is an advanced step—requires parsing quantities.
            // For brevity, we’ll just keep the macros from ChatGPT. :-)
          }
        }

        // Save to state
        setMealData(parsed.meals);
        setWorkoutPlan(parsed.workout);
      }
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {/* Menu button to open the side menu */}
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Advanced Meal & Workout Generator</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2>Welcome, {displayName}!</h2>

        {/* User inputs */}
        <IonItem>
          <IonLabel position="stacked">Ingredients (comma-separated)</IonLabel>
          <IonInput
            value={ingredients}
            placeholder="eggs, rice, beef, carrots..."
            onIonChange={(e) => setIngredients(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Muscle Groups</IonLabel>
          <IonInput
            value={muscleGroups}
            placeholder="chest, back, legs..."
            onIonChange={(e) => setMuscleGroups(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel>Use USDA for Real Macros?</IonLabel>
          <IonButton
            color={useUSDA ? 'success' : 'medium'}
            onClick={() => setUseUSDA((prev) => !prev)}
          >
            {useUSDA ? 'Yes' : 'No'}
          </IonButton>
        </IonItem>

        {/* Generate button */}
        <IonButton expand="block" onClick={handleGenerate}>
          Generate Plan
        </IonButton>

        {/* Loading spinner */}
        {loading && <IonSpinner name="crescent" />}

        {/* Display results if we have them */}
        {mealData && (
          <IonList>
            {mealData.map((meal, index) => {
              const { protein, carbs, fat, sugars } = meal.macros;

              // Prepare data for the Pie chart
              const chartData = {
                labels: ['Protein', 'Carbs', 'Fat', 'Sugars'],
                datasets: [
                  {
                    data: [protein, carbs, fat, sugars],
                    backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#8e44ad'],
                  },
                ],
              };

              return (
                <IonCard key={index}>
                  <IonCardHeader>
                    <IonCardTitle>{meal.name}</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <p><strong>Ingredients:</strong></p>
                    <ul>
                      {meal.ingredients.map((ing, i) => (
                        <li key={i}>
                          {ing.quantity} of {ing.item}
                        </li>
                      ))}
                    </ul>
                    <p><strong>Instructions:</strong> {meal.instructions}</p>
                    <p>
                      <strong>Macros:</strong><br />
                      Protein: {protein}g, Carbs: {carbs}g, Fat: {fat}g, Sugars: {sugars}g
                    </p>
                    {/* Pie chart for macros */}
                    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                      <Pie data={chartData} />
                    </div>
                  </IonCardContent>
                </IonCard>
              );
            })}
          </IonList>
        )}

        {/* Workout Plan */}
        {workoutPlan && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Workout Plan</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{workoutPlan}</pre>
            </IonCardContent>
          </IonCard>
        )}

        {/* Navigation + Logout */}
        <IonButton routerLink="/tab1" color="primary">
          Go to Tab1
        </IonButton>
        <IonButton routerLink="/tab2" color="secondary">
          Go to Tab2
        </IonButton>
        <IonButton onClick={handleLogout} color="danger">
          Logout
        </IonButton>
      </IonContent>

      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Tab3;
