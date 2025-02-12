import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSpinner,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

type Tab1Props = {
  user: User;
};

// Define a minimal interface for the product items we expect
interface USDAFoodProduct {
  product_name: string;
  brands?: string;
  nutriments?: {
    carbohydrates?: number;
    protein?: number;
    fat?: number;
  };
}

const Tab1: React.FC<Tab1Props> = ({ user }) => {
  const displayName = user.displayName || user.email;
  const history = useHistory();

  // ------------------------------------------------
  // State: Search text, results, loading, etc.
  // ------------------------------------------------
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<USDAFoodProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------
  // Logout handler
  // ------------------------------------------------
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for more details.');
    }
  };

  // ------------------------------------------------
  // handleSearch: Query USDA FoodData Central API
  // ------------------------------------------------
  const handleSearch = async () => {
    if (!query) return;

    try {
      setLoading(true);

      // USDA API endpoint
      const apiKey = 'IanzK0U4XKzv8hi50hZqD3gfkcBmodWurWh1gIsS'; // Your USDA API Key
      const baseUrl = 'https://api.nal.usda.gov/fdc/v1/foods/search';
      const params = new URLSearchParams({
        query: query,
        api_key: apiKey,
      });

      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`USDA API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract relevant food data
      if (data.foods) {
        const formattedResults = data.foods.map((food: any) => ({
          product_name: food.description,
          brands: food.brandOwner || "Unknown",
          nutriments: {
            carbohydrates: food.foodNutrients?.find((n: any) => n.nutrientName === "Carbohydrate, by difference")?.value || "N/A",
            protein: food.foodNutrients?.find((n: any) => n.nutrientName === "Protein")?.value || "N/A",
            fat: food.foodNutrients?.find((n: any) => n.nutrientName === "Total lipid (fat)")?.value || "N/A",
          },
        }));

        setResults(formattedResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching USDA FoodData Central. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // Render
  // ------------------------------------------------
  return (
    <IonPage>
      {/* Header */}
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Tab1</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* Content */}
      <IonContent className="ion-padding">
        <h1>Welcome to Tab1, {displayName}!</h1>

        {/* Search bar + button */}
        <IonSearchbar
          placeholder="Search foods..."
          value={query}
          onIonChange={(e) => setQuery(e.detail.value!)}
        />
        <IonButton onClick={handleSearch} color="primary">
          Search
        </IonButton>

        {/* Show spinner while loading */}
        {loading && <IonSpinner name="dots" />}

        {/* Show search results in a list */}
        <IonList>
          {results.map((product, index) => (
            <IonItem key={index}>
              <IonLabel>
                {/* Product name */}
                <h2>{product.product_name || 'Unnamed product'}</h2>

                {/* Brand, if available */}
                {product.brands && <p>Brand: {product.brands}</p>}

                {/* Basic nutriments, if available */}
                {product.nutriments && (
                  <p>
                    Carbs: {product.nutriments.carbohydrates ?? 'N/A'}g |{' '}
                    Protein: {product.nutriments.protein ?? 'N/A'}g |{' '}
                    Fat: {product.nutriments.fat ?? 'N/A'}g
                  </p>
                )}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {/* Navigation buttons */}
        <IonButton routerLink="/tab2" color="primary">
          Go to Tab2
        </IonButton>
        <IonButton routerLink="/tab3" color="secondary">
          Go to Tab3
        </IonButton>

        {/* Logout */}
        <IonButton onClick={handleLogout} color="danger">
          Logout
        </IonButton>
      </IonContent>

      {/* Footer */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle>© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default Tab1;
