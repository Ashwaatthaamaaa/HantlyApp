// File: app/chat/[ticketId].tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AppState // Import AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
// --- MODIFICATION START: Import useHeaderHeight ---
import { useHeaderHeight } from '@react-navigation/elements';
// Import hook for header height
// --- MODIFICATION END ---
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '@/constants/Api';

// --- Types ---
interface ChatMessage {
  chatId: number;
  chatDateTime: string;
  ticketId: number; // Is number
  companyId?: number | null;
  userId?: number | null;
  message: string | null;
  companyUserName?: string | null;
  userName?: string | null;
}

// --- Colors ---
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#888888',
  accent: '#696969',
  headerBg: '#FFFFFF',
  headerText: '#333333',
  error: '#D9534F',
  borderColor: '#E0E0E0',
  inputBackground: '#F1F1F1',
  sendButton: '#696969',
  sendButtonDisabled: '#AAAAAA',
  sendIcon: '#FFFFFF',
  myMessageBubble: '#DCF8C6',
  theirMessageBubble: '#EFEFEF',
};

const POLLING_INTERVAL = 10000; // 10 seconds

// --- Helper: formatTime ---
const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    console.error("Error formatting time:", e);
    return 'Invalid Time';
  }
};

export default function ChatScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const {
      ticketId: ticketIdParam,
      otherPartyName: otherPartyNameParam,
      otherPartyId: otherPartyIdParam,
      otherPartyType: otherPartyTypeParam,
  } = useLocalSearchParams<{ ticketId: string, otherPartyName?: string, otherPartyId?: string, otherPartyType?: 'user' | 'partner' }>();

  const ticketId = ticketIdParam ? parseInt(ticketIdParam, 10) : undefined;
  const otherPartyId = otherPartyIdParam ? parseInt(otherPartyIdParam, 10) : undefined;
  const headerTitle = otherPartyNameParam || 'Chat';

  // --- MODIFICATION START: Get Header Height ---
  const headerHeight = useHeaderHeight();
  // --- MODIFICATION END ---

  // Determine the Company ID relevant for API calls (either the partner's ID or the ID of the partner the user is talking to)
  const companyIdForApi = session?.type === 'partner' ? session.id : (otherPartyTypeParam === 'partner' ? otherPartyId : undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Fetch Messages ---
  const fetchMessages = useCallback(async (isInitialLoad = false) => {
    // Enhanced Logging Added
    if (!ticketId || !companyIdForApi) {
      const errorMsg = `Missing required IDs for chat. TicketID: ${ticketId}, CompanyID (for API): ${companyIdForApi}`;
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      return;
    }
    if (isInitialLoad) { setIsLoading(true); setError(null); }

    const url = `${BASE_URL}/api/IssueTicketChat/GetChatMessages?TicketId=${ticketId}&CompanyId=${companyIdForApi}`;
    // Log every fetch attempt
    console.log(`Workspaceing chat messages. URL: ${url}`);
    try {
      const response = await fetch(url, { headers: { 'accept': 'application/json' } });
      const responseText = await response.text(); // Read text first for better error logging
      console.log(`Workspace Response Status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch messages (${response.status}): ${responseText}`);
      }
      const data: ChatMessage[] = JSON.parse(responseText); // Parse JSON now
      console.log(`Workspaceed ${data.length} messages.`); // Log count received

      data.sort((a, b) => new Date(b.chatDateTime).getTime() - new Date(a.chatDateTime).getTime());
      setMessages(prevMessages => {
        // Simple length check first for performance
        if (prevMessages.length === data.length && JSON.stringify(prevMessages) === JSON.stringify(data)) {
            console.log(`Messages data unchanged.`);
            return prevMessages; // No change
        }
        console.log(`Messages data changed. Updating state.`);
        return data; // Update state
      });

      // Clear error only if fetch is successful
      if (isInitialLoad) setError(null);

    } catch (err: any) {
      console.error("Error fetching chat messages:", err);
      setError(prev => prev ? `${prev}\nFetch Error: ${err.message}` : `Workspace Error: ${err.message}`); // Append errors
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [ticketId, companyIdForApi]); // Keep dependencies minimal

   // --- Polling Logic ---
   const startPolling = useCallback(() => {
        if (intervalRef.current) {
            console.log("Polling already active. Clearing existing interval before starting new one.");
            clearInterval(intervalRef.current);
        }
        console.log(`Starting polling interval (${POLLING_INTERVAL}ms)`);
        fetchMessages(false); // Fetch immediately when starting
        intervalRef.current = setInterval(() => {
            console.log("Polling for new messages...");
            fetchMessages(false);
        }, POLLING_INTERVAL);
   }, [fetchMessages]); // Depends on fetchMessages

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            console.log("Stopping polling interval.");
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []); // No dependencies

   // --- Effects for Focus and App State ---
    useFocusEffect(
        useCallback(() => {
            console.log("Chat screen focused. Fetching messages and starting polling.");
            fetchMessages(true); // Initial fetch
            startPolling();
            return () => {
                console.log("Chat screen blurred. Stopping polling.");
                stopPolling();
            };
        }, [fetchMessages, startPolling, stopPolling]) // Dependencies for the effect callback
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
            console.log('App has come to the foreground, restarting polling.');
            startPolling();
        } else if (nextAppState.match(/inactive|background/)) {
            console.log('App has gone to the background/inactive, stopping polling.');
            stopPolling();
        }
        });

        return () => {
        console.log("Removing AppState listener and stopping polling on unmount.");
        subscription.remove();
        stopPolling(); // Ensure polling stops when component unmounts
        };
    }, [startPolling, stopPolling]); // Dependencies for the effect setup

  // --- Send Message ---
  const handleSendMessage = useCallback(async () => {
    const messageText = newMessage.trim();
    if (!messageText || ticketId === undefined || !session) return;

    // Ensure companyIdForApi is defined before proceeding
    if (companyIdForApi === undefined) {
        console.error("Cannot send message: companyIdForApi is undefined.");
        Alert.alert("Error", "Cannot determine the recipient partner ID.");
        return;
    }


    setIsSending(true);
    const url = `${BASE_URL}/api/IssueTicketChat/NewTicketChat`;

    // **MODIFIED: Set senderInfo based on session type, including companyId for users**
    const baseBody: Pick<ChatMessage, 'ticketId' | 'message'> = { ticketId: ticketId, message: messageText };
    let senderInfo: Partial<ChatMessage> = {};
    if(session.type === 'user') {
        // User is sending: include actual userId, userName, AND the companyId they are talking to
        senderInfo = { userId: session.id, userName: session.name, companyId: companyIdForApi };
    } else { // Partner is sending
        // Partner is sending: include companyId, companyUserName, and set userId to 0
        senderInfo = { companyId: session.id, companyUserName: session.name, userId: 0 };
    }
    const requestBody = { ...baseBody, ...senderInfo };
    // **END MODIFICATION**

    const optimisticMessage: ChatMessage = {
         chatId: Math.random(), // Temporary ID for key
         chatDateTime: new Date().toISOString(),
         message: messageText,
         ticketId: ticketId,
         // Set sender info for optimistic update based on session
         userId: session?.type === 'user' ? session.id : 0, // Use 0 if partner
         userName: session?.type === 'user' ? session.name : null,
         companyId: session?.type === 'partner' ? session.id : companyIdForApi, // Use partner's ID or the one user is chatting with
         companyUserName: session?.type === 'partner' ? session.name : null,
    };

    setMessages(prev => [optimisticMessage, ...prev]);
    setNewMessage('');

    // Log the request body
    console.log("Sending message. URL:", url);
    console.log("Request Body:", JSON.stringify(requestBody));

    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'accept': 'application/json' }, // Expect JSON response
          body: JSON.stringify(requestBody)
      });
      const responseText = await response.text(); // Get text first for debugging
      console.log(`Send Response Status: ${response.status}`);
      console.log(`Send Response Text: ${responseText}`);

      let responseData: any = {};
      try {
          responseData = JSON.parse(responseText); // Try parsing JSON
      } catch (e) {
          console.warn("Could not parse send response as JSON");
          if (!response.ok) {
              throw new Error(responseText || `Failed to send message (${response.status})`);
          }
          responseData = { statusMessage: responseText }; // Assume plain text success if status ok
      }

      if (!response.ok || (responseData.hasOwnProperty('statusCode') && responseData.statusCode <= 0) ) {
         const errorMessage = responseData.statusMessage || responseData.title || responseData.detail || `Failed to send message (${response.status})`;
         throw new Error(errorMessage);
      }

      console.log("Message sent successfully:", responseData.statusMessage || "Success");

      // Let polling handle updates, do not refetch immediately

    } catch (err: any) {
      console.error("Error sending message:", err);
      Alert.alert("Error", `Could not send message: ${err.message}`);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.chatId !== optimisticMessage.chatId));
    } finally {
      setIsSending(false);
    }
  }, [newMessage, ticketId, session, companyIdForApi]); // Dependencies


  // --- Render Message Bubble ---
  const renderMessageBubble = ({ item }: { item: ChatMessage }) => {
    // **MODIFIED: Differentiation logic based on userId convention**
    let isMyMessage = false;
    if (session?.type === 'user') {
      // If the current user is a 'user', their messages match their session.id
      isMyMessage = !!item.userId && item.userId === session.id;
    } else if (session?.type === 'partner') {
      // If the current user is a 'partner', their messages have userId: 0 (or null/undefined)
      // AND ensure the companyId matches the current partner's session id
      isMyMessage = (!item.userId || item.userId === 0) && item.companyId === session.id;
    }
    // **END MODIFICATION**

    return (
      <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.messageTime}>{formatTime(item.chatDateTime)}</Text>
        </View>
      </View>
    );
  };

  // --- Render ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: headerTitle }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoiding}
        keyboardVerticalOffset={(headerHeight ?? 60) + (Platform.select({ ios: 10, android: 0 }) ?? 0)}
      >
        {isLoading && messages.length === 0 && <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingIndicator}/>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageBubble}
          keyExtractor={(item) => item.chatId.toString()}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          inverted // Show latest messages at the bottom
        />

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter Message"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            placeholderTextColor={COLORS.textSecondary}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? <ActivityIndicator size="small" color={COLORS.sendIcon} /> : <Ionicons name="send" size={20} color={COLORS.sendIcon} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardAvoiding: { flex: 1 },
  loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  errorText: { color: COLORS.error, textAlign: 'center', padding: 10 },
  messageList: { flex: 1, paddingHorizontal: 10, },
  messageListContent: { paddingTop: 10, }, // Add padding to top to space from header
  messageRow: { flexDirection: 'row', marginVertical: 5, },
  myMessageRow: { justifyContent: 'flex-end', },
  theirMessageRow: { justifyContent: 'flex-start', },
  messageBubble: { maxWidth: '75%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, },
  myMessageBubble: { backgroundColor: COLORS.myMessageBubble, borderBottomRightRadius: 5, },
  theirMessageBubble: { backgroundColor: COLORS.theirMessageBubble, borderBottomLeftRadius: 5, },
  messageText: { fontSize: 15, color: COLORS.textPrimary, },
  messageTime: { fontSize: 10, color: COLORS.textSecondary, alignSelf: 'flex-end', marginTop: 4, marginLeft: 8, },
  inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.borderColor, backgroundColor: COLORS.background, },
  textInput: { flex: 1, backgroundColor: COLORS.inputBackground, borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 10 : 8, maxHeight: 100, // Limit height for multiline
      fontSize: 16, marginRight: 10, },
  sendButton: { backgroundColor: COLORS.sendButton, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', },
  sendButtonDisabled: { backgroundColor: COLORS.sendButtonDisabled, },
});