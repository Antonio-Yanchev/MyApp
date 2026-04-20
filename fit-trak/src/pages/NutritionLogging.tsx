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
  IonButtons,
} from '@ionic/react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { callUsdaFoodSearch } from '../services/cloudFunctions';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { User } from 'firebase/auth';
import './NutritionLogging.css';

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

type NutritionLoggingProps = {
  user: User;
};

const Tab1: React.FC<NutritionLoggingProps> = ({ user }) => {
  // Use displayName or fallback to email
  const displayName = user.displayName || user.email || 'User';

  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState<USDAFoodProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
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

  // USDA search via Firebase Callable (API key stored server-side only)
  const handleSearch = async () => {
    if (!queryText) return;
    try {
      setLoading(true);
      const data = await callUsdaFoodSearch(queryText);

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
    } catch (error: unknown) {
      console.error('Search error:', error);
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Unknown error';
      alert(
        `Food search failed: ${msg}. Deploy Cloud Functions and sign in, or run the Functions emulator with VITE_FUNCTIONS_EMULATOR=true.`
      );
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
        querySnapshot.forEach((docSnap) => {
          entries.push(docSnap.data() as DiaryEntry);
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

  // Single-entry deletion
  const handleDeleteDiaryEntry = async (entryId: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'diaryEntries', entryId));
      setDiaryEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      alert('Entry deleted successfully!');
    } catch (error) {
      console.error('Error deleting diary entry:', error);
      alert('Error deleting entry. See console for details.');
    }
  };

  // Whole-day deletion
  const handleDeleteDay = async (date: string) => {
    try {
      // Filter all diary entries for that date
      const dayEntries = diaryEntries.filter((entry) => entry.date === date);

      // Delete them all
      for (const e of dayEntries) {
        await deleteDoc(doc(db, 'users', user.uid, 'diaryEntries', e.id));
      }

      // Remove them from state
      setDiaryEntries((prev) => prev.filter((entry) => entry.date !== date));
      alert('All entries for this day have been deleted!');
    } catch (error) {
      console.error('Error deleting day entries:', error);
      alert('Error deleting day. Check console for details.');
    }
  };

  // Show modal with chart data for a clicked day
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
    <IonPage className="tab1-page">
      {/* HEADER */}
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>
            <h1>Fit-Trak</h1>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* CONTENT */}
      <IonContent className="no-scroll">
        <div className="app-container">
          {/* SIDEBAR */}
          <div className="sidebar">
            <h2 className="app-title">Dashboard</h2>
            <p className="hello-user-text">Hello, {displayName}!</p>

            <IonButton 
              expand="block" 
              routerLink="/ExerciseRecording" 
              style={{ textTransform: 'none' }}
            >
              Record Exercises
            </IonButton>
            <IonButton 
              routerLink="/Meal-WorkoutGeneration" 
              style={{ textTransform: 'none' }}
            >
              Generate Meals
            </IonButton>
            <IonButton 
              className="logout-button" 
              color="danger" 
              onClick={handleLogout}
              style={{ textTransform: 'none' }}
            >
              Log out
            </IonButton>
          </div>

          {/* MAIN CONTENT */}
          <div className="main-content">
            <IonGrid>
              {/* Search Bar */}
              <IonRow className="ion-justify-content-center">
                <IonCol size="12">
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

              {/* Search Button */}
              <IonRow className="ion-justify-content-center">
                <IonCol size="12">
                  <IonButton 
                    onClick={handleSearch} 
                    expand="block"
                    style={{ textTransform: 'none' }}
                  >
                    Search
                  </IonButton>
                </IonCol>
              </IonRow>

              {/* Loading Spinner */}
              {loading && (
                <IonRow className="spinner-row ion-justify-content-center">
                  <IonCol size="12">
                    <IonSpinner name="dots" />
                  </IonCol>
                </IonRow>
              )}

              {/* Results OR Diary Entries */}
              {queryText ? (
                <IonRow className="ion-justify-content-center">
                  <IonCol size="12">
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
                            <IonButton
                              onClick={() => handleAddToDiary(product)}
                              color="secondary"
                              size="small"
                              style={{ textTransform: 'none' }}
                            >
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
                    <IonCol size="12">
                      <h1 className="diary-title">Your Day Overview:</h1>
                    </IonCol>
                  </IonRow>

                  {Object.keys(groupedEntries).length === 0 ? (
                    <IonRow className="ion-justify-content-center">
                      <IonCol size="12">
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
                          <IonCol size="12">
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

                                {/* Added title for items */}
                                <p><strong>Items for this day:</strong></p>

                                {/* Each item in this date */}
                                {entries.map((entry) => (
                                  <div
                                    key={entry.id}
                                    style={{
                                      marginBottom: '1rem',
                                      borderBottom: '1px solid #ccc',
                                      paddingBottom: '0.5rem',
                                    }}
                                  >
                                    <p className="food-item-text">
                                      <strong>{entry.food.product_name}</strong> <br />
                                      Carbs: {entry.food.nutriments?.carbohydrates ?? 'N/A'}g |{' '}
                                      Protein: {entry.food.nutriments?.protein ?? 'N/A'}g |{' '}
                                      Fat: {entry.food.nutriments?.fat ?? 'N/A'}g |{' '}
                                      Sugars: {entry.food.nutriments?.sugars ?? 'N/A'}g
                                    </p>
                                    <IonButtons>
                                      <IonButton
                                        className="delete-button"
                                        onClick={(e) => {
                                          e.stopPropagation(); // prevent day-card click
                                          handleDeleteDiaryEntry(entry.id);
                                        }}
                                        style={{ textTransform: 'none' }}
                                      >
                                        Delete item
                                      </IonButton>
                                    </IonButtons>
                                  </div>
                                ))}

                                {/* Button to delete the entire day */}
                                <IonButton
                                  className="delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDay(date);
                                  }}
                                  style={{ textTransform: 'none' }}
                                >
                                  Delete Day
                                </IonButton>
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

      {/* FOOTER */}
      <IonFooter>
        <IonToolbar color="primary">
          <IonTitle className="footer-title">© 2025 FIT-TRAK</IonTitle>
        </IonToolbar>
      </IonFooter>

      {/* MODAL for Day Details (Chart) */}
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
            <IonButton 
              expand="block" 
              onClick={() => setModalOpen(false)}
              style={{ textTransform: 'none' }}
            >
              Close
            </IonButton>
          </IonToolbar>
        </IonFooter>
      </IonModal>
    </IonPage>
  );
};

export default Tab1;
