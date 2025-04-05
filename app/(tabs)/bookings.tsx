// File: app/(tabs)/bookings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; // For placeholder icons

// --- Base URL ---
const BASE_URL = 'http://3.110.124.83:2030';

// --- Types ---
// Define structure for images within ticketImages, assuming imagePath exists
interface TicketImage {
    imageId?: number;
    ticketId?: number;
    imageName?: string | null;
    imagePath?: string | null; // Assuming this holds the URL
    imageContentType?: string | null;
}

interface Booking {
  ticketId: number;
  reportingPerson?: string; // Mark optional as they might be null/empty
  reportingDescription?: string;
  operationId?: number;
  status?: string; // Mark optional as it might be null/empty
  toCraftmanType?: string;
  address?: string;
  city?: string;
  pincode?: string;
  countyId?: number;
  municipalityId?: number;
  createdOn: string; // Assuming this is always present
  updatedOn?: string | null;
  countyName?: string;
  municipalityName?: string;
  reviewStarRating?: number | null;
  reviewComment?: string;
  companyComment?: string;
  closingOTP?: number | null;
  companyId?: number | null;
  companyName?: string;
  // User fields omitted as we use session
  images?: null; // This seems consistently null
  ticketImages?: TicketImage[] | null; // Array of user uploaded images?
  ticketWorkImages?: TicketImage[] | null; // Array of service proof images?
}

// --- Colors (Consistent with theme) ---
const COLORS = {
  background: '#F8F8F8',
  textPrimary: '#333333',
  textSecondary: '#555555',
  accent: '#696969',
  headerBg: '#FFFFFF',
  headerText: '#333333',
  error: '#D9534F',
  borderColor: '#E0E0E0',
  cardBg: '#FFFFFF',
  iconPlaceholder: '#CCCCCC',
  // Status colors
  statusCreated: '#007BFF', // Blue
  statusAccepted: '#28A745', // Green
  statusInProgress: '#FFC107', // Yellow/Orange
  statusCompleted: '#6C757D', // Grey
  statusDefault: '#6C757D',
};

// --- Helper Functions ---
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE'); // yyyy-MM-dd
  } catch (error) {
    return 'Invalid Date';
  }
};

const getStatusColor = (status?: string): string => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus === 'created') return COLORS.statusCreated;
    if (lowerStatus === 'accepted') return COLORS.statusAccepted;
    if (lowerStatus === 'inprogress' || lowerStatus === 'in progress') return COLORS.statusInProgress;
    if (lowerStatus === 'completed') return COLORS.statusCompleted;
    return COLORS.statusDefault;
};

// --- Booking Card Component ---
interface BookingCardProps {
  item: Booking;
  onPress: (ticketId: number) => void;
}

const BookingCard: React.FC<BookingCardProps> = React.memo(({ item, onPress }) => {
  const statusColor = getStatusColor(item.status);
  // Get the first image URL from ticketImages array, if available
  const imageUrl = item.ticketImages?.[0]?.imagePath;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item.ticketId)}>
      {/* Image Area */}
      <View style={styles.cardImageContainer}>
          {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
              // Placeholder Icon if no image
              <View style={styles.cardImagePlaceholder}>
                  <Ionicons name="image-outline" size={30} color={COLORS.iconPlaceholder} />
              </View>
          )}
      </View>

      {/* Details Area */}
      <View style={styles.cardDetails}>
            <Text style={[styles.cardStatus, { color: statusColor }]} numberOfLines={1}>
                {item.status || 'Unknown Status'}
            </Text>
            <Text style={styles.cardService} numberOfLines={2}>
                {item.toCraftmanType || 'N/A'}
            </Text>
            <Text style={styles.cardDate} numberOfLines={1}>
                {formatDate(item.createdOn)}
            </Text>
      </View>
    </TouchableOpacity>
  );
});


// --- Main Bookings Screen ---
export default function BookingsScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBookings = useCallback(async (showLoadingIndicator = true) => {
    // Ensure session and username exist before fetching
    if (!session?.name) {
       console.log("Bookings: No session or username available.");
       setBookings([]); // Clear bookings
       if (showLoadingIndicator) setIsLoading(false);
       setIsRefreshing(false);
       // Optionally redirect if session is truly null
       if (!session) router.replace('/login');
       return;
    }

    const url = `${BASE_URL}/api/IssueTicket/GetTicketsByUser?Username=${encodeURIComponent(session.name)}`;
    console.log(`Bookings: Fetching from ${url}`);

    if (showLoadingIndicator) setIsLoading(true);
    setError(null);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed (${response.status}): ${errorText}`);
        }
        const data: Booking[] = await response.json();
        // Sort bookings by creation date, newest first (optional)
        data.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime());
        setBookings(data);
    } catch (err: any) {
        console.error("Bookings: Fetch failed:", err);
        setError(`Failed to load bookings: ${err.message}`);
        setBookings([]); // Clear bookings on error
    } finally {
        if (showLoadingIndicator) setIsLoading(false);
        setIsRefreshing(false);
    }
  }, [session, router]); // Add router to dependencies

  // Fetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Bookings screen focused.");
      fetchBookings(bookings.length === 0); // Show loading indicator only if list is currently empty
    }, [fetchBookings, bookings.length]) // Rerun if fetchBookings changes or list length becomes 0
  );

  // Handler for pull-to-refresh
  const handleRefresh = useCallback(() => {
      console.log("Bookings: Refreshing...");
      setIsRefreshing(true);
      fetchBookings(false); // Fetch data without setting the main loading indicator
  }, [fetchBookings]);

  // Placeholder navigation to booking detail
  const handleBookingPress = (ticketId: number) => {
    Alert.alert("Navigate", `Go to details for Ticket ID: ${ticketId} (Implementation Needed)`);
    // Example future navigation:
    // router.push(`/bookings/${ticketId}`);
  };

  // --- Render Logic ---
  const renderListContent = () => {
      // Show loading indicator only on initial load
      if (isLoading && bookings.length === 0) {
          return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
      }
      // Show error message if loading failed
      if (error && bookings.length === 0) {
          return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
      }
      // Show message if logged in but no bookings found
      if (!isLoading && bookings.length === 0) {
          return (
            <ScrollView
                 contentContainerStyle={styles.centered}
                 refreshControl={
                      <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/>
                 }>
                <Text style={styles.noDataText}>You have no bookings yet.</Text>
                {/* Optional: Add a button to create a new job request */}
                <TouchableOpacity style={styles.createButton} onPress={()=>router.push('/create-job-card')}>
                    <Text style={styles.createButtonText}>Create New Job Request</Text>
                </TouchableOpacity>
            </ScrollView>
          );
      }
      // Render the list of bookings
      return (
          <FlatList
              data={bookings}
              renderItem={({ item }) => <BookingCard item={item} onPress={handleBookingPress} />}
              keyExtractor={(item) => item.ticketId.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent}/>
              }
          />
      );
  };

  // Main Screen Return
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'User Bookings', // Title from design
          headerStyle: { backgroundColor: COLORS.headerBg },
          headerTintColor: COLORS.headerText,
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitleAlign: 'center',
          // Add settings icon like profile if needed
          // headerRight: () => (<TouchableOpacity onPress={() => {/* open settings */}}><Ionicons ... /></TouchableOpacity>),
        }}
      />
      {renderListContent()}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background, },
  centered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  errorText: { color: COLORS.error, fontSize: 16, textAlign: 'center', },
  noDataText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 20, },
  createButton: { backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
  listContainer: { paddingVertical: 15, paddingHorizontal: 10, },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    overflow: 'hidden', // Ensure content stays within card bounds
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2.22,
  },
  cardImageContainer: {
    width: 90, // Fixed width for image area
    height: 90, // Fixed height (square)
    borderRightWidth: 1,
    borderRightColor: COLORS.borderColor,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.iconPlaceholder, // Use placeholder color for bg
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1, // Take remaining space
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center', // Center content vertically
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardService: {
    fontSize: 15,
    fontWeight: '500', // Semi-bold
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // cardCompany: { // Style if company name is added back
  //   fontSize: 12,
  //   color: COLORS.textSecondary,
  //   marginTop: 4,
  // },
});