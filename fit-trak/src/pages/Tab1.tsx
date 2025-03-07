import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonFooter,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSearchbar,
  IonSpinner,
  IonModal,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { User } from 'firebase/auth';
import './Tab1.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface USDAFoodProduct {
  product_name: string;
  brands?: string;
  nutriments?: {
    carbohydrates?: number | string;
    protein?: number | string;
    fat?: number | string;
    sugars?: number | string;
  };
}

interface DiaryEntry {
  id: string;
  food: USDAFoodProduct;
  servingSize: string;
  date: string;
}

type Tab1Props = {
  user: User;
};

const Tab1: React.FC<Tab1Props> = ({ user }) => {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<USDAFoodProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  // For the selected day's entries in the modal
  const [selectedDayEntries, setSelectedDayEntries] = useState<DiaryEntry[]>([]);

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Check console for more details.');
    }
  };

  /*
    Handle food search using the USDA API (nutrientNumber approach for sugar = 269).
  */
  const handleSearch = async () => {
    if (!queryText) return;
    try {
      setLoading(true);
      const apiKey = 'IanzK0U4XKzv8hi50hZqD3gfkcBmodWurWh1gIsS';
      const baseUrl = 'https://api.nal.usda.gov/fdc/v1/foods/search';
      const params = new URLSearchParams({
        query: queryText,
        api_key: apiKey,
      });
      const url = `${baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.statusText}`);
      }
      const data = await response.json();

      if (data.foods) {
        const formattedResults = data.foods.map((food: any) => {
          const nutrients = food.foodNutrients || [];
          const protein = nutrients.find((n: any) => n.nutrientNumber === '203')?.value ?? 'N/A';
          const fat = nutrients.find((n: any) => n.nutrientNumber === '204')?.value ?? 'N/A';
          const carbs = nutrients.find((n: any) => n.nutrientNumber === '205')?.value ?? 'N/A';
          const sugars = nutrients.find((n: any) => n.nutrientNumber === '269')?.value ?? 'N/A';

          return {
            product_name: food.description,
            brands: food.brandOwner || 'Unknown',
            nutriments: {
              protein,
              fat,
              carbohydrates: carbs,
              sugars,
            },
          };
        });
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

  // Add selected product to the diary
  const handleAddToDiary = async (food: USDAFoodProduct) => {
    const newEntry: DiaryEntry = {
      id: `${Date.now()}-${food.product_name}`,
      food,
      servingSize: '1 serving',
      date: new Date().toISOString().split('T')[0],
    };
    try {
      await addDoc(collection(db, 'users', user.uid, 'diaryEntries'), newEntry);
      setDiaryEntries((prev) => [...prev, newEntry]);
      alert(`${food.product_name} added to your diary!`);
    } catch (error) {
      console.error('Error adding diary entry:', error);
      alert('Error adding entry. Please try again.');
    }
  };

  // Fetch diary entries from Firestore on mount
  useEffect(() => {
    const fetchDiaryEntries = async () => {
      try {
        const diaryRef = collection(db, 'users', user.uid, 'diaryEntries');
        const q = query(diaryRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const entries: DiaryEntry[] = [];
        querySnapshot.forEach((doc) => {
          entries.push(doc.data() as DiaryEntry);
        });
        setDiaryEntries(entries);
      } catch (error) {
        console.error('Error fetching diary entries:', error);
      }
    };
    fetchDiaryEntries();
  }, [user.uid]);

  // Group diary entries by date
  const groupedEntries: Record<string, DiaryEntry[]> = {};
  diaryEntries.forEach((entry) => {
    if (!groupedEntries[entry.date]) {
      groupedEntries[entry.date] = [];
    }
    groupedEntries[entry.date].push(entry);
  });

  // When a date card is clicked, gather total macros & show modal with chart
  const handleDayCardClick = (date: string) => {
    setSelectedDate(date);
    const entries = groupedEntries[date] || [];
    setSelectedDayEntries(entries);

    let totalProtein = 0,
      totalCarbs = 0,
      totalFat = 0,
      totalSugars = 0;

    entries.forEach((entry) => {
      totalProtein += Number(entry.food.nutriments?.protein) || 0;
      totalCarbs += Number(entry.food.nutriments?.carbohydrates) || 0;
      totalFat += Number(entry.food.nutriments?.fat) || 0;
      totalSugars += Number(entry.food.nutriments?.sugars) || 0;
    });

    setChartData({
      labels: ['Protein', 'Carbs', 'Fat', 'Sugars'],
      datasets: [
        {
          data: [totalProtein, totalCarbs, totalFat, totalSugars],
          backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#8e44ad'],
          hoverBackgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#8e44ad'],
        },
      ],
    });
    setModalOpen(true);
  };

  return (
    <IonPage>
      {/* Header (Blue) */}
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* IonContent with a full-height layout (sidebar + main) */}
      <IonContent className="no-scroll">
        <div className="app-container">
          {/* ========== Sidebar ========== */}
          <div className="sidebar">
            <h2 className="app-title">Fit-Trak</h2>
            <IonButton expand="block" routerLink="/tab2">
              Tab2
            </IonButton>
            <IonButton routerLink="/tab3">Tab3</IonButton>
            <IonButton className="logout-button" color="danger" onClick={handleLogout}>
              Logout
            </IonButton>
          </div>

          {/* ========== Main Content ========== */}
          <div className="main-content">
            <IonGrid>

              {/* ========== Search bar row ========== */}
              <IonRow className="ion-justify-content-center">
                {/* On small screens: 12/12 (full width).
                    On medium+ screens: 5/12 (~40% width). */}
                <IonCol size="12" sizeMd="18">
                  <IonSearchbar
                    placeholder="Search foods..."
                    showClearButton="always"
                    value={queryText}
                    onIonChange={(e) => setQueryText(e.detail.value!)}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    onIonClear={() => {
                      setQueryText('');
                      setResults([]);
                    }}
                  />
                </IonCol>
              </IonRow>

              {/* ========== Search button row ========== */}
              <IonRow className="ion-justify-content-center">
                <IonCol size="12" sizeMd="18">
                  <IonButton onClick={handleSearch} expand="block">
                    Search
                  </IonButton>
                </IonCol>
              </IonRow>

              {/* ========== Loading Spinner ========== */}
              {loading && (
                <IonRow className="spinner-row ion-justify-content-center">
                  <IonCol size="12" sizeMd="18">
                    <IonSpinner name="dots" />
                  </IonCol>
                </IonRow>
              )}

              {/* ========== Display search results or diary overview ========== */}
              {queryText ? (
                <IonRow className="ion-justify-content-center">
                  <IonCol size="12" sizeMd="18">
                    <IonList>
                      {results.map((product, index) => (
                        <IonCard key={index} className="card-item">
                          <IonCardHeader>
                            <IonCardTitle>{product.product_name || 'Unnamed product'}</IonCardTitle>
                          </IonCardHeader>
                          <IonCardContent>
                            {product.brands && <p>Brand: {product.brands}</p>}
                            <p>
                              Carbs: {product.nutriments?.carbohydrates ?? 'N/A'}g |{' '}
                              Protein: {product.nutriments?.protein ?? 'N/A'}g |{' '}
                              Fat: {product.nutriments?.fat ?? 'N/A'}g |{' '}
                              Sugars: {product.nutriments?.sugars ?? 'N/A'}g
                            </p>
                            <IonButton onClick={() => handleAddToDiary(product)} color="secondary" size="small">
                              Add to Diary
                            </IonButton>
                          </IonCardContent>
                        </IonCard>
                      ))}
                    </IonList>
                  </IonCol>
                </IonRow>
              ) : (
                <>
                  <IonRow className="ion-justify-content-center">
                    <IonCol size="12" sizeMd="18">
                      <h2 className="diary-title">Your Diary Overview</h2>
                    </IonCol>
                  </IonRow>

                  {Object.keys(groupedEntries).length === 0 ? (
                    <IonRow className="ion-justify-content-center">
                      <IonCol size="12" sizeMd="18">
                        <p>No diary entries yet. Add some food items!</p>
                      </IonCol>
                    </IonRow>
                  ) : (
                    Object.keys(groupedEntries).map((date) => {
                      const entries = groupedEntries[date];
                      let totalProtein = 0,
                        totalCarbs = 0,
                        totalFat = 0,
                        totalSugars = 0;

                      entries.forEach((entry) => {
                        totalProtein += Number(entry.food.nutriments?.protein) || 0;
                        totalCarbs += Number(entry.food.nutriments?.carbohydrates) || 0;
                        totalFat += Number(entry.food.nutriments?.fat) || 0;
                        totalSugars += Number(entry.food.nutriments?.sugars) || 0;
                      });

                      return (
                        <IonRow key={date} className="ion-justify-content-center">
                          <IonCol size="12" sizeMd="18">
                            <IonCard
                              className="card-item"
                              onClick={() => handleDayCardClick(date)}
                              style={{ cursor: 'pointer' }}
                            >
                              <IonCardHeader>
                                <IonCardTitle>{date}</IonCardTitle>
                              </IonCardHeader>
                              <IonCardContent>
                                <p>Protein: {totalProtein}g</p>
                                <p>Carbs: {totalCarbs}g</p>
                                <p>Fat: {totalFat}g</p>
                                <p>Sugars: {totalSugars}g</p>
                                <IonButton expand="block">View Details</IonButton>
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                        </IonRow>
                      );
                    })
                  )}
                </>
              )}
            </IonGrid>
          </div>
        </div>
      </IonContent>

      {/* ========== Blue Footer ========== */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle className="footer-title">© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>

      {/* ========== Modal for Day Details ========== */}
      <IonModal isOpen={modalOpen} onDidDismiss={() => setModalOpen(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Details for {selectedDate}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {chartData ? <Pie data={chartData} /> : <p>Loading chart data...</p>}
          <IonList>
            {selectedDayEntries.map((entry) => (
              <IonItem key={entry.id}>
                <IonLabel>
                  <h2>{entry.food.product_name}</h2>
                  <p>
                    Carbs: {entry.food.nutriments?.carbohydrates ?? 'N/A'}g |{' '}
                    Protein: {entry.food.nutriments?.protein ?? 'N/A'}g |{' '}
                    Fat: {entry.food.nutriments?.fat ?? 'N/A'}g |{' '}
                    Sugars: {entry.food.nutriments?.sugars ?? 'N/A'}g
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
        <IonFooter>
          <IonToolbar>
            <IonButton expand="block" onClick={() => setModalOpen(false)}>
              Close
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </IonModal>
    </IonPage>
  );
};

export default Tab1;
