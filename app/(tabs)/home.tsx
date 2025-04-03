import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Alert, // For placeholder actions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Example icon sets
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

// --- Placeholder Data & Icons ---
// Replace with actual data and correct icon names/sets
const serviceCategories = [
  { id: '1', name: 'Cleaning', icon: 'cloud-outline', iconSet: 'ion' }, // Placeholder icon
  { id: '2', name: 'Carpenter', icon: 'hammer-outline', iconSet: 'ion' }, // Placeholder icon
  { id: '3', name: 'Painter', icon: 'color-palette-outline', iconSet: 'ion' }, // Placeholder icon
  { id: '4', name: 'Electrician', icon: 'flash-outline', iconSet: 'ion' }, // Placeholder icon
];
// -----------------------------

// --- Approximate Colors ---
// Use your specific theme colors from Figma
const COLORS = {
  background: '#F8F8F8',
  textPrimary: '#333333',
  textSecondary: '#666666',
  accent: '#A0522D', // Brownish color used for LOG IN, View All
  urgentText: '#FF0000', // Red for Urgent Job text
  buttonBg: '#696969', // Dark grey/brown buttons
  buttonText: '#FFFFFF',
  cardBg: '#FFFFFF',
  iconColor: '#696969', // Match button color? Adjust
  borderColor: '#E0E0E0',
  bannerPlaceholderBg: '#E0E0E0',
};

// --- Service Item Component ---
interface ServiceItemProps {
    item: { id: string; name: string; icon: string; iconSet: string };
}
const ServiceItem: React.FC<ServiceItemProps> = ({ item }) => {
    const handleItemPress = () => {
        Alert.alert("Service Pressed", item.name);
        // Navigate to specific service category: router.push(`/services?category=${item.id}`);
    }

    const renderIcon = () => {
        if (item.iconSet === 'material') {
            return <MaterialCommunityIcons name={item.icon as any} size={32} color={COLORS.iconColor} />;
        }
        return <Ionicons name={item.icon as any} size={32} color={COLORS.iconColor} />;
    };
    return (
        <TouchableOpacity style={styles.serviceItem} onPress={handleItemPress}>
            {renderIcon()}
            <ThemedText style={styles.serviceItemText}>{item.name}</ThemedText>
        </TouchableOpacity>
    );
};


// --- Main Home Screen Component ---
export default function HomeScreen() {
  const router = useRouter();

  const handleLoginPress = () => {
    router.push('/login');
  };

  const handleRegisterPress = () => {
     router.push('/register'); // Or '/register-partner' depending on button's intent? Design just says Register.
  };

  const handleNewJobRequestPress = () => {
     Alert.alert("Placeholder", "Navigate to New Job Request screen");
     // router.push('/new-job');
  };

   const handleViewAllServicesPress = () => {
     router.push('/categories');
   };

   const handleUrgentJobPress = () => {
       Alert.alert("Urgent Job", "Urgent Job 24/7 action placeholder");
       // Add toggle logic or navigation if needed
   }

  return (
    // Using edges prop to exclude bottom edge padding because of the Tab Bar
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Home</ThemedText>
        <TouchableOpacity onPress={handleLoginPress}>
            <ThemedText style={styles.loginText}>LOG IN</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        {/* Image Banner */}
        <View style={styles.bannerContainer}>
          {/* --- Replace with your actual banner image --- */}
          {/* Example: <Image source={require('@/assets/images/your-banner.jpg')} style={styles.bannerImage} /> */}
          <ThemedText style={styles.bannerPlaceholder}>[Image Banner Here]</ThemedText>
          {/* -------------------------------------------- */}
        </View>

        {/* Services Section Header */}
        <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Services</ThemedText>
            {/* Added TouchableOpacity for Urgent Job */}
            <TouchableOpacity onPress={handleUrgentJobPress}>
                <ThemedText style={styles.urgentJobText}>Urgent Job 24/7</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleViewAllServicesPress}>
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
            </TouchableOpacity>
        </View>

        {/* Services Grid */}
        <View style={styles.servicesGridContainer}>
          <FlatList
             data={serviceCategories}
             renderItem={({item}) => <ServiceItem item={item} />}
             keyExtractor={(item) => item.id}
             numColumns={2}
             columnWrapperStyle={styles.serviceGridRow}
             scrollEnabled={false} // Scrolling handled by outer ScrollView
          />
        </View>

         {/* Didn't Find Service Section */}
         <View style={styles.notFoundSection}>
           <ThemedText style={styles.notFoundText}>Didn't find your Service?</ThemedText>
           <ThemedText style={styles.notFoundSubText}>Don't worry, You can post your Requirement</ThemedText>
         </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity style={styles.button} onPress={handleNewJobRequestPress}>
            <ThemedText style={styles.buttonText}>New Job Request</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRegisterPress}>
            <ThemedText style={styles.buttonText}>Register</ThemedText>
          </TouchableOpacity>
        </View>

      </ScrollView>
      {/* The actual Tab Bar is rendered by app/(tabs)/_layout.tsx */}
    </SafeAreaView>
  );
}

// --- Styles (Approximated from Untitled-2025-04-03-0805(8).jpg) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Apply background to safe area
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12, // Consistent padding
    backgroundColor: '#FFFFFF', // White header background
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
   loginText: {
     fontSize: 14,
     fontWeight: 'bold',
     color: COLORS.accent, // Brownish accent
   },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20, // Padding at the end of scroll content
  },
  bannerContainer: {
    height: 160,
    backgroundColor: COLORS.bannerPlaceholderBg,
  },
  bannerPlaceholder: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Or 'contain' depending on image aspect ratio
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 20, // Space above section header
    marginBottom: 15, // Space below section header
  },
  sectionTitle: {
    fontSize: 16, // Slightly smaller? Adjust based on Figma
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  urgentJobText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.urgentText, // Red color
      // Add padding/margin if needed for spacing
  },
   viewAllText: {
     fontSize: 14,
     color: COLORS.accent,
     fontWeight: '500',
   },
   servicesGridContainer: {
       paddingHorizontal: 15, // Padding for the grid area
   },
  serviceGridRow: {
    justifyContent: 'space-between',
  },
  serviceItem: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 20, // More vertical padding in cards
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically too
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
    minHeight: 120, // Give cards a minimum height
  },
  serviceItemText: {
    marginTop: 10, // More space between icon and text
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
   notFoundSection: {
     alignItems: 'center',
     marginVertical: 25, // More vertical space around this section
     paddingHorizontal: 15,
   },
   notFoundText: {
     fontSize: 16,
     fontWeight: 'bold',
     color: COLORS.textPrimary,
     textAlign: 'center',
   },
   notFoundSubText: {
     fontSize: 14,
     color: COLORS.textSecondary,
     marginTop: 5,
     textAlign: 'center',
   },
  bottomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingTop: 20, // Padding above buttons
    paddingBottom: 10, // Padding below buttons (before tab bar space)
    // Removed top border as buttons seem separate from content above
  },
  button: {
    backgroundColor: COLORS.buttonBg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});