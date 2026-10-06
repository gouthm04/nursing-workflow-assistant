import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getStoredToken } from "../../../services/auth";

import { API_URL } from "../../../constants/api";

type NursingNote = {
    note_id: number;
    admission_id: number;
    recorded_by: number;
    note_type: string;
    content: string;
    recorded_at: string;
};

export default function NursingNotesScreen() {
    const { admissionId } = useLocalSearchParams<{
        admissionId: string;
    }>();

    const [noteType, setNoteType] = useState("");
    const [content, setContent] = useState("");

    const [notes, setNotes] = useState<NursingNote[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadNursingNotes();
    }, [admissionId]);

    async function loadNursingNotes() {
        try {
            setLoadingHistory(true);

            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/nursing-notes`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load nursing notes"
                );
            }

            setNotes(data.notes || []);
        } catch (error) {
            console.error(
                "Load nursing notes error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to load nursing notes"
            );
        } finally {
            setLoadingHistory(false);
        }
    }

    async function saveNursingNote() {
        try {
            const token = await getStoredToken();

            if (!token) {
                router.replace("/");
                return;
            }

            if (!noteType.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the note type."
                );
                return;
            }

            if (!content.trim()) {
                Alert.alert(
                    "Missing Information",
                    "Enter the nursing note."
                );
                return;
            }

            setSaving(true);

            const response = await fetch(
                `${API_URL}/api/nurse/patients/${admissionId}/nursing-notes`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        noteType: noteType.trim(),
                        content: content.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to record nursing note"
                );
            }

            Alert.alert(
                "Success",
                "Nursing note recorded successfully.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setNoteType("");
                            setContent("");
                            loadNursingNotes();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error(
                "Record nursing note error:",
                error
            );

            Alert.alert(
                "Error",
                error instanceof Error
                    ? error.message
                    : "Failed to record nursing note"
            );
        } finally {
            setSaving(false);
        }
    }

    function formatRecordedAt(
        dateString: string
    ) {
        return new Date(dateString).toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={
                Platform.OS === "ios"
                    ? "padding"
                    : undefined
            }
        >
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>
                        ← Back
                    </Text>
                </Pressable>

                <Text style={styles.title}>
                    Nursing Notes
                </Text>

                <Text style={styles.subtitle}>
                    Admission ID: {admissionId}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Record Nursing Note
                    </Text>

                    <Text style={styles.label}>
                        Note Type
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={noteType}
                        onChangeText={setNoteType}
                        placeholder="e.g. General Observation"
                    />

                    <Text style={styles.label}>
                        Note
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            styles.noteInput,
                        ]}
                        value={content}
                        onChangeText={setContent}
                        placeholder="Enter nursing observation or note"
                        multiline
                        textAlignVertical="top"
                    />

                    <Pressable
                        style={[
                            styles.saveButton,
                            saving &&
                                styles.disabledButton,
                        ]}
                        onPress={saveNursingNote}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text
                                style={
                                    styles.saveButtonText
                                }
                            >
                                Record Note
                            </Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Nursing Notes History
                    </Text>

                    {loadingHistory ? (
                        <View style={styles.historyLoading}>
                            <ActivityIndicator />

                            <Text
                                style={
                                    styles.loadingText
                                }
                            >
                                Loading nursing notes...
                            </Text>
                        </View>
                    ) : notes.length === 0 ? (
                        <Text style={styles.mutedText}>
                            No nursing notes recorded yet.
                        </Text>
                    ) : (
                        notes.map((note) => (
                            <View
                                key={note.note_id}
                                style={styles.historyItem}
                            >
                                <Text
                                    style={
                                        styles.noteType
                                    }
                                >
                                    {note.note_type}
                                </Text>

                                <Text
                                    style={
                                        styles.noteContent
                                    }
                                >
                                    {note.content}
                                </Text>

                                <Text
                                    style={
                                        styles.noteTime
                                    }
                                >
                                    {formatRecordedAt(
                                        note.recorded_at
                                    )}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },

    header: {
        paddingTop: 55,
        paddingHorizontal: 20,
        paddingBottom: 18,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },

    backButton: {
        marginBottom: 10,
    },

    backText: {
        fontSize: 16,
    },

    title: {
        fontSize: 28,
        fontWeight: "bold",
    },

    subtitle: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
    },

    content: {
        padding: 20,
        paddingBottom: 40,
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#ddd",
    },

    sectionTitle: {
        fontSize: 19,
        fontWeight: "bold",
        marginBottom: 14,
    },

    label: {
        fontSize: 14,
        color: "#666",
        marginBottom: 6,
        marginTop: 10,
    },

    input: {
        height: 50,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 17,
        backgroundColor: "#fff",
    },

    noteInput: {
        height: 140,
        paddingTop: 12,
    },

    saveButton: {
        height: 52,
        borderRadius: 10,
        backgroundColor: "#222",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 18,
    },

    disabledButton: {
        opacity: 0.6,
    },

    saveButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "bold",
    },

    historyLoading: {
        alignItems: "center",
        paddingVertical: 10,
    },

    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: "#666",
    },

    mutedText: {
        color: "#666",
        fontSize: 14,
    },

    historyItem: {
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        backgroundColor: "#fafafa",
    },

    noteType: {
        fontSize: 17,
        fontWeight: "700",
    },

    noteContent: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 6,
    },

    noteTime: {
        fontSize: 13,
        color: "#666",
        marginTop: 8,
    },
});