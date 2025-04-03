import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Approximate Colors - Replace with exact Figma values
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  accent: '#007AFF', // Used for checkmarks/radios
  modalBackdrop: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#E0E0E0',
  buttonBg: '#696969', // Match other buttons
  buttonText: '#FFFFFF',
  selectedItemBg: '#EFEFEF',
};

// Define the shape of the data items
interface DataItem {
  id: string;
  name: string;
}

// Define the props for the component
interface SelectModalProps {
  visible: boolean;
  title: string;
  data: DataItem[];
  mode: 'single' | 'multi';
  initialSelectedId?: string | null;
  initialSelectedIds?: string[];
  onClose: () => void;
  onConfirmSingle?: (selectedId: string | null) => void;
  onConfirmMulti?: (selectedIds: string[]) => void;
}

export default function SelectModal({ // Ensure component name matches import if changed
  visible,
  title,
  data,
  mode,
  initialSelectedId = null,
  initialSelectedIds = [],
  onClose,
  onConfirmSingle,
  onConfirmMulti,
}: SelectModalProps) {

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Effect to set initial state when modal becomes visible or mode changes
  useEffect(() => {
    if (visible) {
      const initialSet = mode === 'single' && initialSelectedId
                          ? new Set([initialSelectedId])
                          : new Set(initialSelectedIds);
      setSelectedIds(initialSet);
    }
  }, [visible, mode, initialSelectedId, initialSelectedIds]);


  const handleSelectItem = (id: string) => {
    if (mode === 'single') {
      setSelectedIds(new Set([id]));
      if (onConfirmSingle) {
        onConfirmSingle(id);
      }
      onClose(); // Close immediately on single select
    } else { // Multi-select mode
      setSelectedIds((prevSelectedIds) => {
        const newSelectedIds = new Set(prevSelectedIds);
        if (newSelectedIds.has(id)) { newSelectedIds.delete(id); }
        else { newSelectedIds.add(id); }
        return newSelectedIds;
      });
    }
  };

  // Handler for the explicit Confirm button in multi-select mode
  const handleConfirmMultiPress = () => {
    if (mode === 'multi' && onConfirmMulti) {
      onConfirmMulti(Array.from(selectedIds));
    }
    onClose();
  };

  // Consistent RenderItem Function
  const renderItem = ({ item }: { item: DataItem }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <TouchableOpacity
          style={[styles.itemContainer, mode === 'single' && isSelected && styles.itemSelected]}
          onPress={() => handleSelectItem(item.id)}
        >
          {mode === 'multi' ? (
            <MaterialCommunityIcons
              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={isSelected ? COLORS.accent : COLORS.textSecondary}
              style={{ marginRight: 15 }} // Ensure consistent margin
            />
          ) : (
             <View style={styles.iconPlaceholder} /> // Placeholder for alignment
          )}
          {/* Use specific style based on mode for consistent text indent */}
          <Text style={mode === 'multi' ? styles.itemTextMulti : styles.itemText}>{item.name}</Text>
           {mode === 'single' && isSelected && (
               <Ionicons name="checkmark" size={24} color={COLORS.accent} style={styles.checkmarkIcon} />
           )}
        </TouchableOpacity>
      );
    };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
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
                extraData={selectedIds} // Ensures re-render on selection change
            />

             {/* --- Confirm Button (Only for Multi-Select Mode) --- */}
            {mode === 'multi' && (
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmMultiPress}>
                <Text style={styles.confirmButtonText}>Confirm Selection</Text>
              </TouchableOpacity>
            )}
            {/* --- End Confirm Button --- */}

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    modalBackdrop: { flex: 1, backgroundColor: COLORS.modalBackdrop, justifyContent: 'center', alignItems: 'center' },
    safeAreaContainer: { width: '90%', maxHeight: '80%', backgroundColor: COLORS.background, borderRadius: 10, overflow: 'hidden'},
    modalContent: { flexGrow: 1, paddingBottom: 10, },
    header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor, position: 'relative' },
    title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', flex: 1 },
    closeButton: { padding: 5, position: 'absolute', right: 10, top: 10 },
    list: { flexGrow: 1 },
    itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderColor },
    itemSelected: { backgroundColor: COLORS.selectedItemBg },
    iconPlaceholder: { width: 24, marginRight: 15 }, // For alignment in single-select
    itemText: { flex: 1, fontSize: 16, color: COLORS.textPrimary, marginLeft: 0 /* Reset margin when using placeholder */ },
    itemTextMulti: { flex: 1, fontSize: 16, color: COLORS.textPrimary, marginLeft: 0 /* No margin needed with explicit icon margin */ }, // Refined multi style
    checkmarkIcon: { marginLeft: 10 },
    confirmButton: { backgroundColor: COLORS.buttonBg, paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 20, marginTop: 15 },
    confirmButtonText: { color: COLORS.buttonText, fontSize: 16, fontWeight: 'bold' },
});