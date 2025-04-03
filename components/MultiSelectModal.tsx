import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar, // Import StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Approximate Colors - Replace with exact Figma values
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  accent: '#007AFF', // Default blue for checkboxes, adjust if needed
  modalBackdrop: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#E0E0E0',
  buttonBg: '#696969', // From register screen, adjust if needed
  buttonText: '#FFFFFF',
};

// Define the shape of the data items
interface DataItem {
  id: string;
  name: string;
}

// Define the props for the component
interface MultiSelectModalProps {
  visible: boolean;
  title: string;
  data: DataItem[];
  initialSelectedIds?: string[]; // IDs of initially selected items
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

export default function MultiSelectModal({
  visible,
  title,
  data,
  initialSelectedIds = [],
  onClose,
  onConfirm,
}: MultiSelectModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));

  // Update internal state if initialSelectedIds prop changes while modal is open
  useEffect(() => {
    setSelectedIds(new Set(initialSelectedIds));
  }, [initialSelectedIds, visible]); // Re-sync when visibility changes too

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prevSelectedIds) => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return newSelectedIds;
    });
  };

  const handleConfirmPress = () => {
    onConfirm(Array.from(selectedIds)); // Pass selected IDs back as an array
    onClose(); // Close the modal
  };

  const renderItem = ({ item }: { item: DataItem }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleToggleSelect(item.id)}
      >
        <MaterialCommunityIcons
          name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={isSelected ? COLORS.accent : COLORS.textSecondary}
        />
        <Text style={styles.itemText}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Semi-transparent background */}
      <View style={styles.modalBackdrop}>
        {/* SafeAreaView for content inside the modal */}
        <SafeAreaView style={styles.safeAreaContainer}>
           <StatusBar barStyle="dark-content" />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
            />

             {/* Confirm Button (Added for usability) */}
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmPress}>
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'center', // Center modal vertically
    alignItems: 'center', // Center modal horizontally
  },
  safeAreaContainer: {
    width: '90%', // Modal width
    maxHeight: '80%', // Modal max height
    backgroundColor: COLORS.background,
    borderRadius: 10,
    overflow: 'hidden', // Ensure content respects border radius
  },
  modalContent: {
    flexGrow: 1, // Allow content to grow but respect maxHeight
    paddingBottom: 10, // Padding at the bottom
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    flex: 1, // Allow title to take space for centering with absolute positioned close button
  },
  closeButton: {
    padding: 5, // Increase tap area
    position: 'absolute', // Position precisely
    right: 10,
    top: 10,
  },
  list: {
    flexGrow: 1, // Allow list to take available space
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  itemText: {
    marginLeft: 15,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  confirmButton: {
      backgroundColor: COLORS.buttonBg,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 20, // Side margins
      marginTop: 15, // Margin above button
  },
  confirmButtonText: {
      color: COLORS.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
  },
});