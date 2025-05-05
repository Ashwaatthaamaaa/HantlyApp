// File: components/ServiceFilterModal.tsx
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
import SelectModal from '@/components/MultiSelectModal'; // To select the actual service
import { t } from '@/config/i18n';

// --- Types ---
interface ApiDataItem {
    id: string;
    name: string | null;
}

interface ServiceFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyFilter: (serviceId: string | null) => void; // Callback to apply filter
    initialServiceId: string | null; // Currently selected service ID
    servicesList: ApiDataItem[]; // List of services including "All"
    isLoadingServices: boolean;
    serviceFetchError: string | null;
}

// --- Colors --- (Adjust as needed)
const COLORS = {
    background: '#FFFFFF',
    textPrimary: '#333333',
    textSecondary: '#888888',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    borderColor: '#E0E0E0',
    buttonBg: '#696969',
    buttonText: '#FFFFFF',
    selectorBg: '#FFFFFF',
    selectorBorder: '#E0E0E0',
    selectorDisabledBg: '#F0F0F0',
    placeholderText: '#AAAAAA',
    errorText: '#D9534F',
};

const ALL_SERVICES_FILTER_ID = ''; // Ensure this matches the ID used in urgentJobList

export default function ServiceFilterModal({
    visible,
    onClose,
    onApplyFilter,
    initialServiceId,
    servicesList,
    isLoadingServices,
    serviceFetchError,
}: ServiceFilterModalProps) {
    // Temporary state to hold selection within this modal before applying
    const [tempSelectedServiceId, setTempSelectedServiceId] = useState<string | null>(initialServiceId);
    const [isServiceSelectorVisible, setIsServiceSelectorVisible] = useState(false);

    // Update temporary state if the initial filter changes while modal is open (or on open)
    useEffect(() => {
        if (visible) {
            setTempSelectedServiceId(initialServiceId);
        }
    }, [visible, initialServiceId]);

    const handleApply = () => {
        onApplyFilter(tempSelectedServiceId);
        onClose();
    };

    // Function to get the display name for the selected service
    const getSelectedServiceName = () => {
        if (isLoadingServices) return t('loading');
        if (serviceFetchError) return t('errorloading'); // Or show the error
        const selectedService = servicesList.find(s => s.id === tempSelectedServiceId);
        return selectedService?.name || t('select_service'); // Add 'select_service' to translations
    };

    const isServiceSelectionDisabled = isLoadingServices || !!serviceFetchError;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalBackdrop}>
                <SafeAreaView style={styles.modalContainer}>
                    <StatusBar barStyle="dark-content" />
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>{t('filter_jobs')}</Text> {/* Translate */}
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Service Selector Row */}
                        <TouchableOpacity
                            style={[
                                styles.selectorRow,
                                isServiceSelectionDisabled && styles.selectorDisabled,
                            ]}
                            onPress={() => !isServiceSelectionDisabled && setIsServiceSelectorVisible(true)}
                            disabled={isServiceSelectionDisabled}
                        >
                            <Text
                                style={[
                                    styles.selectorText,
                                    !tempSelectedServiceId && styles.placeholderText,
                                ]}
                            >
                                {getSelectedServiceName()}
                            </Text>
                            {isLoadingServices ? (
                                <ActivityIndicator size="small" color={COLORS.textSecondary} />
                            ) : (
                                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                            )}
                        </TouchableOpacity>
                        {serviceFetchError && !isLoadingServices && (
                             <Text style={styles.errorTextSmall}>{serviceFetchError}</Text>
                        )}


                        {/* Apply Button */}
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>{t('ok')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* The actual Service Selection Modal (using SelectModal) */}
            <SelectModal
                mode="single"
                visible={isServiceSelectorVisible}
                title={t('select_service')} // Translate
                data={servicesList}
                initialSelectedId={tempSelectedServiceId}
                onClose={() => setIsServiceSelectorVisible(false)}
                onConfirmSingle={(id) => {
                    setTempSelectedServiceId(id); // Update temporary state only
                    // Do NOT call onApplyFilter here
                }}
            />
        </Modal>
    );
}

// --- Styles --- (Adapted from bookings FilterModal and image)
const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: COLORS.modalBackdrop,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: { // Changed from safeAreaContainer for clarity
        width: '90%',
        maxWidth: 400,
        backgroundColor: COLORS.background,
        borderRadius: 10,
        overflow: 'hidden', // Ensures rounded corners clip content
    },
    modalContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center', // Center title
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative', // For close button positioning
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: -5, // Adjust as needed
        top: -5, // Adjust as needed
        padding: 5,
    },
    selectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.selectorBg,
        borderWidth: 1,
        borderColor: COLORS.selectorBorder,
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 50,
        marginBottom: 15, // Space between selectors if more were added
    },
    selectorDisabled: {
        backgroundColor: COLORS.selectorDisabledBg,
        opacity: 0.7,
    },
    selectorText: {
        fontSize: 16,
        color: COLORS.textPrimary,
        flex: 1, // Allow text to take space
        marginRight: 10,
    },
    placeholderText: {
        color: COLORS.placeholderText,
    },
    errorTextSmall: {
       color: COLORS.errorText,
       fontSize: 12,
       marginTop: -10,
       marginBottom: 10,
       marginLeft: 5,
     },
    applyButton: {
        backgroundColor: COLORS.buttonBg,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10, // Space above button
    },
    applyButtonText: {
        color: COLORS.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

// Add necessary translation keys:
// filter_jobs: "Filter Jobs" / "Filtrera Jobb"
// select_service: "Select Service" / "Välj Tjänst"
// ok: "OK" / "OK"
// all_services: "All Services" / "Alla Tjänster" (if not already present)
// failedtoloadservices: "Failed to load services:" / "Kunde inte ladda tjänster:" (if not already present)