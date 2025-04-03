import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert, // Added for placeholder action
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Example icon sets
import { Stack, useRouter } from 'expo-router'; // Import Stack for header options

// --- Placeholder Data (Replace with actual fetched data) ---
const categoriesData = [
  { id: '1', name: 'Cleaning', icon: 'vacuum-outline' }, // Using MaterialCommunityIcons
  { id: '2', name: 'Carpenter', icon: 'hammer-outline' }, // Using Ionicons
  { id: '3', name: 'Painter', icon: 'format-paint' }, // Using MaterialCommunityIcons
  { id: '4', name: 'Electrician', icon: 'flash-outline' }, // Using Ionicons
  { id: '5', name: 'Plumber', icon: 'pipe-wrench' }, // Using MaterialCommunityIcons
  { id: '6', name: 'Gardening', icon: 'leaf-outline' }, // Example
  { id: '7', name: 'Appliance Repair', icon: 'build-outline'}, // Example
];
// ---------------------------------------------------------

// --- Approximate Colors ---
const COLORS = {
  background: '#F8F8F8', // Light background for list area
  headerBg: '#696969', // Dark header background
  headerText: '#FFFFFF',
  cardBg: '#FFFFFF',
  textPrimary: '#333333',
  iconColor: '#696969', // Match header/button color? Adjust as needed
  borderColor: '#E0E0E0',
};

// --- Individual Category Item Component ---
interface CategoryItemProps {
  item: { id: string; name: string; icon: string }; // Define icon prop type based on usage
  onPress: (item: { id: string; name: string; icon: string }) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ item, onPress }) => {
    // Simple function to determine which icon set to use based on name (example only)
    const renderIcon = () => {
        // You might have a more robust way to map icons, e.g., storing the icon set name too
        if (['vacuum-outline', 'format-paint', 'pipe-wrench'].includes(item.icon)) {
            return <MaterialCommunityIcons name={item.icon as any} size={30} color={COLORS.iconColor} style={styles.icon} />;
        }
         // Default to Ionicons or handle missing icons
         return <Ionicons name={(item.icon || 'help-circle-outline') as any} size={30} color={COLORS.iconColor} style={styles.icon} />;

    };

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item)}>
      {renderIcon()}
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );
};

// --- Main Screen Component ---
export default function CategoriesScreen() {
  const router = useRouter();

  const handleCategoryPress = (category: { id: string; name: string }) => {
    // Placeholder: Navigate to a screen showing services/partners for this category
    Alert.alert('Category Pressed', `Maps to details for ${category.name}`);
    // Example navigation: router.push(`/services?category=${category.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.headerBg}/>
       {/* Configure header using Stack.Screen options */}
       <Stack.Screen
         options={{
           title: 'Categories',
           headerStyle: { backgroundColor: COLORS.headerBg },
           headerTintColor: COLORS.headerText,
           headerTitleStyle: { fontWeight: 'bold' },
           headerTitleAlign: 'center', // Center title explicitly
           // Header back button is automatically added by Stack navigator
         }}
       />

      <FlatList
        data={categoriesData}
        renderItem={({ item }) => <CategoryItem item={item} onPress={handleCategoryPress} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// --- Styles (Approximated from image) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // Background for the entire screen area
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 15, // Add padding at the top of the list
    paddingBottom: 15, // Add padding at the bottom
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 20, // Increase padding for larger cards
    borderRadius: 8,
    marginBottom: 15, // Space between cards
    // Add shadow/elevation for card effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2.0,
    elevation: 2,
  },
  icon: {
    marginRight: 20, // More space between icon and text
  },
  itemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
});