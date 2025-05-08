// File: components/ServiceFilterModal.tsx (Full Code with Reset Button)
import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SelectModal from '@/components/MultiSelectModal'; // Assuming SelectModal is used for the dropdown
import { t } from '@/config/i18n'; // Assuming i18n setup

// --- Types ---
interface ApiDataItem {
    id: string;
    name: string | null; // Allow null names if applicable from API
}

interface ServiceFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyFilter: (serviceId: string | null) => void; // Callback when OK or Reset is pressed
    initialServiceId: string | null; // The currently active filter ID from the parent
    servicesList: ApiDataItem[]; // Full list of services, potentially including an "All" option
    isLoadingServices: boolean; // Loading state for the services list
    serviceFetchError: string | null; // Error state for the services list
}

// --- Colors --- (Ensure these match your app's theme)
const COLORS = {
    background: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#888888',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    borderColor: '#E0E0E0',
    buttonBg: '#696969', // Main action button (OK)
    buttonText: '#FFFFFF',
    selectorBg: '#FFFFFF',
    selectorBorder: '#E0E0E0',
    selectorDisabledBg: '#F0F0F0',
    placeholderText: '#AAAAAA',
    errorText: '#D9534F',
    resetButtonBg: '#EFEFEF', // Reset button background
    resetButtonText: '#555555', // Reset button text
};

// Constant representing the value for "no filter" or "all services"
const ALL_SERVICES_FILTER_ID = ''; // Use an empty string or null, consistent with parent

export default function ServiceFilterModal({
    visible,
    onClose,
    onApplyFilter,
    initialServiceId,
    servicesList,
    isLoadingServices,
    serviceFetchError,
}: ServiceFilterModalProps) {
    // Temporary state to hold the selection within this modal before applying
    const [tempSelectedServiceId, setTempSelectedServiceId] = useState<string | null>(initialServiceId);
    // State to control the visibility of the nested SelectModal
    const [isServiceSelectorVisible, setIsServiceSelectorVisible] = useState(false);

    // Effect to reset the temporary state whenever the modal becomes visible
    // or if the initial filter from the parent changes while it's open.
    useEffect(() => {
        if (visible) {
            setTempSelectedServiceId(initialServiceId);
        }
        // Dependency array ensures this runs when visibility or initial filter changes
    }, [visible, initialServiceId]);

    // Function called when the "OK" (Apply) button is pressed
    const handleApply = () => {
        // Calls the parent's callback with the temporarily selected ID
        onApplyFilter(tempSelectedServiceId);
        onClose(); // Closes the modal
    };

    // --- NEW: Function called when the "Reset" button is pressed ---
    const handleReset = () => {
        // Set the temporary state to the default "all services" value
        setTempSelectedServiceId(ALL_SERVICES_FILTER_ID);
        // Immediately apply this default filter by calling the parent's callback
        onApplyFilter(ALL_SERVICES_FILTER_ID);
        onClose(); // Closes the modal
    };
    // --- END NEW ---

    // Helper function to get the display name for the currently selected temporary ID
    const getSelectedServiceName = () => {
        if (isLoadingServices) return t('loading'); // Show loading text
        if (serviceFetchError) return t('errorloading'); // Show error text

        // Ensure servicesList is a valid array before proceeding
        if (!Array.isArray(servicesList)) {
             console.error("ServiceFilterModal: servicesList prop is not an array!", servicesList);
             return t('errorloading'); // Handle invalid prop case
        }

        // Find the service matching the temporary ID
        const selectedService = servicesList.find(s => s.id === tempSelectedServiceId);

        // If the temporary ID is the "all services" value, return the translated string
        if (tempSelectedServiceId === ALL_SERVICES_FILTER_ID) {
            return t('all_services');
        }

        // Otherwise, return the found service name or a default placeholder
        return selectedService?.name || t('select_service');
    };

    // Determine if the service selector dropdown should be disabled
    const isServiceSelectionDisabled = isLoadingServices || !!serviceFetchError;

    return (
        <Modal
            animationType="fade" // Or "slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose} // Handles Android back button
        >
            {/* Semi-transparent background */}
            <View style={styles.modalBackdrop}>
                {/* SafeAreaView ensures content is within safe screen boundaries */}
                <SafeAreaView style={styles.modalContainer}>
                    {/* Ensure status bar text is readable */}
                    <StatusBar barStyle="dark-content" />
                    {/* Main content area of the modal */}
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>{t('filter_jobs')}</Text>
                            {/* Close button (top right) */}
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Service Selector Row (TouchableOpacity to open the actual SelectModal) */}
                        <TouchableOpacity
                            style={[
                                styles.selectorRow,
                                // Apply disabled style if loading or error occurred
                                isServiceSelectionDisabled && styles.selectorDisabled,
                            ]}
                            // Open the nested SelectModal when pressed
                            onPress={() => !isServiceSelectionDisabled && setIsServiceSelectorVisible(true)}
                            disabled={isServiceSelectionDisabled}
                        >
                            {/* Display the name of the currently selected service (or placeholder) */}
                            <Text
                                style={[
                                    styles.selectorText,
                                    // Use placeholder style if no service (or "All") is selected
                                    (!tempSelectedServiceId || tempSelectedServiceId === ALL_SERVICES_FILTER_ID) && styles.placeholderText,
                                ]}
                            >
                                {getSelectedServiceName()}
                            </Text>
                            {/* Show loading indicator or dropdown icon */}
                            {isLoadingServices ? (
                                <ActivityIndicator size="small" color={COLORS.textSecondary} />
                            ) : (
                                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                            )}
                        </TouchableOpacity>
                        {/* Display error message if service fetch failed */}
                        {serviceFetchError && !isLoadingServices && (
                            <Text style={styles.errorTextSmall}>{serviceFetchError}</Text>
                        )}


                        {/* Action Buttons Container (Reset and OK) */}
                        <View style={styles.actionButtonsContainer}>
                            {/* Reset Button */}
                            <TouchableOpacity
                                style={[styles.modalButton, styles.resetButton]}
                                onPress={handleReset} // Call reset handler
                            >
                                <Text style={styles.resetButtonText}>{t('reset')}</Text>
                            </TouchableOpacity>

                            {/* Apply/OK Button */}
                            <TouchableOpacity
                                style={[styles.modalButton, styles.applyButton]}
                                onPress={handleApply} // Call apply handler
                            >
                                <Text style={styles.applyButtonText}>{t('ok')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            {/* Nested Modal for selecting the service */}
            <SelectModal
                mode="single" // Only one service can be selected
                visible={isServiceSelectorVisible} // Controlled by state
                title={t('select_service')}
                // Pass the service list (ensure it's always an array)
                data={Array.isArray(servicesList) ? servicesList : []}
                // Pre-select the item matching the temporary state
                initialSelectedId={tempSelectedServiceId}
                // Close this nested modal
                onClose={() => setIsServiceSelectorVisible(false)}
                // Update the temporary state when a selection is confirmed
                onConfirmSingle={(id) => {
                    setTempSelectedServiceId(id);
                    // Note: We don't call onApplyFilter here; only when the main modal's "OK" is pressed
                }}
            />
        </Modal>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: COLORS.modalBackdrop,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: { // Container for the modal content within SafeAreaView
        width: '90%',
        maxWidth: 400, // Max width for larger screens
        backgroundColor: COLORS.background,
        borderRadius: 10, // Rounded corners
        overflow: 'hidden', // Ensures content respects border radius
        elevation: 5, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalContent: { // Padding inside the modal container
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
    },
    header: { // Styles for the header row (Title + Close Button)
        flexDirection: 'row',
        justifyContent: 'center', // Center title horizontally
        alignItems: 'center',
        marginBottom: 25,
        position: 'relative', // Needed for absolute positioning of close button
    },
    title: { // Style for the modal title
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    closeButton: { // Style for the 'X' close button
        position: 'absolute', // Position top-right corner
        right: -5, // Adjust horizontal position
        top: -5,   // Adjust vertical position
        padding: 5, // Increase tappable area
    },
    selectorRow: { // Style for the touchable row that opens the service selector
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.selectorBg,
        borderWidth: 1,
        borderColor: COLORS.selectorBorder,
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 20, // Space below the selector
    },
    selectorDisabled: { // Style when the selector is disabled (loading/error)
        backgroundColor: COLORS.selectorDisabledBg,
        opacity: 0.7,
    },
    selectorText: { // Style for the text displaying the selected service name
        fontSize: 16,
        color: COLORS.textPrimary,
        flex: 1, // Allow text to take available space
        marginRight: 10, // Space before the dropdown icon
    },
    placeholderText: { // Style for the selector text when nothing is selected
        color: COLORS.placeholderText,
    },
    errorTextSmall: { // Style for the small error message below the selector
       color: COLORS.errorText,
       fontSize: 12,
       marginTop: -15, // Position it closer to the selector row
       marginBottom: 10,
       marginLeft: 5, // Indent slightly
     },
    actionButtonsContainer: { // Container for the Reset and OK buttons
        flexDirection: 'row',
        justifyContent: 'space-between', // Space out the buttons
        marginTop: 15, // Add margin above the buttons
    },
    modalButton: { // Common style for both Reset and OK buttons
        flex: 1, // Make buttons share available space equally
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5, // Add space between buttons
        minHeight: 46, // Ensure a minimum tappable height
        justifyContent: 'center',
    },
    resetButton: { // Specific styles for the Reset button
        backgroundColor: COLORS.resetButtonBg,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    resetButtonText: { // Text style for the Reset button
        color: COLORS.resetButtonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
    applyButton: { // Specific styles for the Apply/OK button
        backgroundColor: COLORS.buttonBg,
    },
    applyButtonText: { // Text style for the Apply/OK button
        color: COLORS.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});