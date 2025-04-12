import React, { useState, useEffect, useRef } from 'react';
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

// --- Interfaces ---
interface DataItem {
  id: string;
  name: string | null; // <-- Allow null
}

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
// --- Colors ---
const COLORS = { // Use your actual color constants
  background: '#FFFFFF', textPrimary: '#333333', textSecondary: '#888888',
  accent: '#007AFF', modalBackdrop: 'rgba(0, 0, 0, 0.5)', borderColor: '#E0E0E0',
  buttonBg: '#696969', buttonText: '#FFFFFF', selectedItemBg: '#EFEFEF',
};


export default function SelectModal({
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
  // Ref to track if the modal has just been opened
  const isInitialMount = useRef(true);

  // Updated useEffect to initialize ONLY when modal opens
  useEffect(() => {
    if (visible) {
        // Only initialize on the first render after becoming visible
        if (isInitialMount.current) {
            console.log(`Modal "${title}" - Initializing selection.`);
            const initialSet = mode === 'single' && initialSelectedId
                                ? new Set([initialSelectedId])
                                : new Set(initialSelectedIds || []); // Use || [] for safety if prop could be undefined
            setSelectedIds(initialSet);
            isInitialMount.current = false; // Mark initialization as done
        }
    } else {
        // Reset the flag when the modal is closed/not visible
        isInitialMount.current = true;
    }
    // Depend only on visibility and the initial props themselves
  }, [visible, mode, initialSelectedId, initialSelectedIds]);


  const handleSelectItem = (id: string) => {
    if (mode === 'single') {
      // In single mode, update immediately and close
      setSelectedIds(new Set([id]));
      if (onConfirmSingle) { onConfirmSingle(id); }
      onClose();
    } else {
      // In multi mode, just toggle the selection in the internal state
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

  // Render list item
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
              size={24} color={isSelected ? COLORS.accent : COLORS.textSecondary} style={{ marginRight: 15 }} />
          ) : ( <View style={styles.iconPlaceholder} /> )}
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
                contentContainerStyle={styles.listContentContainer}
                extraData={selectedIds} // Important for list item re-renders
            />

            {/* Confirm Button */}
            {mode === 'multi' && (
              <View style={styles.confirmButtonContainer}>
                  <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmMultiPress}>
                    <Text style={styles.confirmButtonText}>Confirm Selection</Text>
                  </TouchableOpacity>
              </View>
            )}
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
        justifyContent: 'center',
        alignItems: 'center'
    },
    safeAreaContainer: {
        width: '90%',
        maxHeight: '80%', // Limit modal height
        backgroundColor: COLORS.background,
        borderRadius: 10,
        overflow: 'hidden',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        position: 'relative',
        flexShrink: 0, // Prevent header from shrinking
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
        flex: 1 // Allow title to take space and center
    },
    closeButton: {
        padding: 5, // Easier to press
        position: 'absolute',
        right: 10,
        top: 10,
    },
    list: {
        flex: 1, // Allow list to take available space
        width: '100%',
    },
    listContentContainer: {
        paddingBottom: 10, // Padding at the end of list content
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor
    },
    itemSelected: {
        backgroundColor: COLORS.selectedItemBg
    },
    iconPlaceholder: { // Used in single select for alignment
        width: 24,
        marginRight: 15
    },
    itemText: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginLeft: 0 // When using placeholder
    },
    itemTextMulti: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        marginLeft: 0 // Margin handled by icon
    },
    checkmarkIcon: {
        marginLeft: 10
    },
    confirmButtonContainer: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderColor,
        flexShrink: 0, // Prevent button container from shrinking
    },
    confirmButton: {
        backgroundColor: COLORS.buttonBg,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: COLORS.buttonText,
        fontSize: 16,
        fontWeight: 'bold'
    },
});