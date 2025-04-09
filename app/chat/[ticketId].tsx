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
import { useHeaderHeight } from '@react-navigation/elements'; // Import hook for header height
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
    // ... (fetchMessages logic remains the same) ...
    if (!ticketId || !companyIdForApi) { setError("Missing required IDs for chat."); setIsLoading(false); return; }
    if (isInitialLoad) { setIsLoading(true); setError(null); }
    console.log(`Workspaceing chat messages for Ticket ${ticketId}, Company ${companyIdForApi}`);
    const url = `${BASE_URL}/api/IssueTicketChat/GetChatMessages?TicketId=${ticketId}&CompanyId=${companyIdForApi}`;
    try { const response = await fetch(url, { headers: { 'accept': 'application/json' } }); if (!response.ok) { const errorText = await response.text(); throw new Error(`Failed to fetch messages (${response.status}): ${errorText}`); } const data: ChatMessage[] = await response.json(); data.sort((a, b) => new Date(b.chatDateTime).getTime() - new Date(a.chatDateTime).getTime()); setMessages(prevMessages => { if (JSON.stringify(prevMessages) !== JSON.stringify(data)) { console.log(`Workspaceed ${data.length} messages. Updating state.`); return data; } console.log(`Workspaceed ${data.length} messages. No change.`); return prevMessages; }); if (isInitialLoad && data.length > 0) { /* setError(null); */ } }
    catch (err: any) { console.error("Error fetching chat messages:", err); setError(prev => prev ? `${prev}\n${err.message}` : err.message); }
    finally { if (isInitialLoad) setIsLoading(false); }
  }, [ticketId, companyIdForApi]);

   // --- Polling Logic ---
   const startPolling = useCallback(() => { /* ... remains same ... */ if (intervalRef.current) { clearInterval(intervalRef.current); } console.log(`Starting polling interval (${POLLING_INTERVAL}ms)`); fetchMessages(false); intervalRef.current = setInterval(() => { console.log("Polling for new messages..."); fetchMessages(false); }, POLLING_INTERVAL); }, [fetchMessages]);
   const stopPolling = useCallback(() => { /* ... remains same ... */ if (intervalRef.current) { console.log("Stopping polling interval."); clearInterval(intervalRef.current); intervalRef.current = null; } }, []);

   // --- Effects for Focus and App State ---
    useFocusEffect( useCallback(() => { console.log("Chat screen focused. Fetching messages and starting polling."); fetchMessages(true); startPolling(); return () => { console.log("Chat screen blurred. Stopping polling."); stopPolling(); }; }, [fetchMessages, startPolling, stopPolling]) );
    useEffect(() => { const subscription = AppState.addEventListener('change', nextAppState => { if (nextAppState === 'active') { console.log('App has come to the foreground, restarting polling.'); startPolling(); } else if (intervalRef.current) { console.log('App has gone to the background, stopping polling.'); stopPolling(); } }); return () => { subscription.remove(); stopPolling(); }; }, [startPolling, stopPolling]);

  // --- Send Message ---
  const handleSendMessage = useCallback(async () => {
    const messageText = newMessage.trim();
    if (!messageText || ticketId === undefined || !session) return;

    setIsSending(true);
    const url = `${BASE_URL}/api/IssueTicketChat/NewTicketChat`;
    const baseBody: Pick<ChatMessage, 'ticketId' | 'message'> = { ticketId: ticketId, message: messageText };
    let senderInfo: Partial<ChatMessage> = {};
    if(session.type === 'user') { senderInfo = { userId: session.id, userName: session.name }; }
    else { senderInfo = { companyId: session.id, companyUserName: session.name }; }
    const requestBody = { ...baseBody, ...senderInfo };

    const optimisticMessage: ChatMessage = {
         chatId: Math.random(), chatDateTime: new Date().toISOString(), message: messageText, ticketId: ticketId,
         userId: session?.type === 'user' ? session.id : null, userName: session?.type === 'user' ? session.name : null,
         companyId: session?.type === 'partner' ? session.id : null, companyUserName: session?.type === 'partner' ? session.name : null,
    };

    setMessages(prev => [optimisticMessage, ...prev]);
    setNewMessage('');

    try {
      console.log("Sending message:", requestBody);
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(requestBody) });
      const responseData = await response.json();
      if (!response.ok || responseData.statusCode <= 0) { throw new Error(responseData.statusMessage || `Failed to send message (${response.status})`); }
      console.log("Message sent successfully:", responseData.statusMessage);

      // --- MODIFICATION START: Remove immediate refetch ---
      // Let the polling handle the update to avoid optimistic message disappearing
      // stopPolling();
      // await fetchMessages(false); // DO NOT refetch immediately
      // startPolling();
      // --- MODIFICATION END ---

    } catch (err: any) {
      console.error("Error sending message:", err);
      Alert.alert("Error", `Could not send message: ${err.message}`);
      setMessages(prev => prev.filter(msg => msg.chatId !== optimisticMessage.chatId)); // Remove optimistic message on failure
    } finally {
      setIsSending(false);
    }
  // Keep fetchMessages in dependencies for potential refetch on error? No, rely on poll.
  // Remove start/stopPolling from deps as they cause infinite loops if fetchMessages is included.
  // }, [newMessage, ticketId, session, fetchMessages, startPolling, stopPolling]);
  }, [newMessage, ticketId, session, fetchMessages]); // Simplified dependencies

  // --- Render Message Bubble ---
  const renderMessageBubble = ({ item }: { item: ChatMessage }) => { /* ... remains same ... */ const isMyMessage = (session?.type === 'user' && item.userId === session.id) || (session?.type === 'partner' && item.companyId === session.id); return ( <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}><View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}><Text style={styles.messageText}>{item.message}</Text><Text style={styles.messageTime}>{formatTime(item.chatDateTime)}</Text></View></View> ); };

  // --- Render ---
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: headerTitle }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoiding}
        // --- MODIFICATION START: Use headerHeight for offset ---
        keyboardVerticalOffset={(headerHeight ?? 60) + (Platform.select({ ios: 10, android: 0 }) ?? 0)}
        // --- MODIFICATION END ---
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
          inverted
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
  // ... (Styles remain the same) ...
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardAvoiding: { flex: 1 },
  loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center'},
  errorText: { color: COLORS.error, textAlign: 'center', padding: 10 },
  messageList: { flex: 1, paddingHorizontal: 10, },
  messageListContent: { paddingTop: 10, },
  messageRow: { flexDirection: 'row', marginVertical: 5, },
  myMessageRow: { justifyContent: 'flex-end', },
  theirMessageRow: { justifyContent: 'flex-start', },
  messageBubble: { maxWidth: '75%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, },
  myMessageBubble: { backgroundColor: COLORS.myMessageBubble, borderBottomRightRadius: 5, },
  theirMessageBubble: { backgroundColor: COLORS.theirMessageBubble, borderBottomLeftRadius: 5, },
  senderName: { fontSize: 12, fontWeight: 'bold', color: COLORS.accent, marginBottom: 3, },
  messageText: { fontSize: 15, color: COLORS.textPrimary, },
  messageTime: { fontSize: 10, color: COLORS.textSecondary, alignSelf: 'flex-end', marginTop: 4, marginLeft: 8, },
  inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.borderColor, backgroundColor: COLORS.background, },
  textInput: { flex: 1, backgroundColor: COLORS.inputBackground, borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 10 : 8, maxHeight: 100, fontSize: 16, marginRight: 10, },
  sendButton: { backgroundColor: COLORS.sendButton, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', },
  sendButtonDisabled: { backgroundColor: COLORS.sendButtonDisabled, },
});